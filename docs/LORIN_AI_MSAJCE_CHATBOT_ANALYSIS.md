# 📋 Lorin AI MSAJCE Chatbot — Comprehensive Architectural & Schema Audit

> **Target Directory Analyzed:** `D:\.gemini\bots\lorin ai msajce chatbot`  
> **Project:** MSAJCE Campus Assistant (Lorin AI v1/v2)  
> **Institution:** Mohamed Sathak A.J. College of Engineering (MSAJCE), Chennai  
> **Lead Architect / Developer:** Ramanathan S. (B.Tech IT, 2024–2028 Batch)  

---

## 📑 Table of Contents
1. [Executive Summary & System Architecture](#1-executive-summary--system-architecture)
2. [Relational Database Schema: Supabase PostgreSQL](#2-relational-database-schema-supabase-postgresql)
3. [Vector Database Architecture: Qdrant Cloud](#3-vector-database-architecture-qdrant-cloud)
4. [Hybrid Retrieval & Ingestion Pipeline](#4-hybrid-retrieval--ingestion-pipeline)
5. [Caching Strategy: Two-Tier Architecture](#5-caching-strategy-two-tier-architecture)
6. [Self-Healing Feedback Loop & LLM-as-a-Judge](#6-self-healing-feedback-loop--llm-as-a-judge)
7. [External Gateways & Model Routing](#7-external-gateways--model-routing)
8. [Frontend Architecture & Webhook/Proxy Components](#8-frontend-architecture--webhookproxy-components)
9. [Evaluation, Testing & Benchmarking Suite (RAGAS)](#9-evaluation-testing--benchmarking-suite-ragas)
10. [Comparison Summary: Legacy Chatbot vs Current Active Bot](#10-comparison-summary-legacy-chatbot-vs-current-active-bot)

---

## 1. Executive Summary & System Architecture

The **Lorin AI MSAJCE Chatbot** located at `D:\.gemini\bots\lorin ai msajce chatbot` is an enterprise RAG (Retrieval-Augmented Generation) campus intelligence system designed to handle inquiries regarding:
* Admissions and eligibility criteria
* College transport and bus routes with timing tables
* Department curriculums, HODs, and laboratories
* Campus placements, packages, and recruiting companies
* Hostel amenities, anti-ragging policies, and student affairs

### High-Level Architecture Flow
```mermaid
graph TD
    A[User Query] --> B[Spell Correction & Abbreviation Expansion]
    B --> C{Direct Intent Match?}
    C -- Yes (Greeting, Fees, Developer) --> D[Direct / Redirect Response]
    C -- No --> E{Two-Tier Cache Hit?}
    E -- Tier 1 (In-Memory 0ms) --> F[Return Cached Response]
    E -- Tier 2 (Postgres Hash) --> F
    E -- Cache Miss --> G[Query Context Rewriter]
    G --> H[Category Classification & Filter]
    H --> I[Parallel Hybrid Retrieval]
    I --> J[Qdrant Cloud Dense Vectors]
    I --> K[BM25 Local Sparse Lexical]
    J & K --> L[Reciprocal Rank Fusion RRF k=60]
    L --> M[NVIDIA Llama Nemotron Reranking]
    M --> N[Faithfulness Verification Check]
    N --> O[LLM Generation: Gemini 2.5 Flash Lite]
    O --> P[Persist Chat Message & Update Cache]
```

---

## 2. Relational Database Schema: Supabase PostgreSQL

### Connection Specifications
* **Host / Engine:** Supabase Cloud PostgreSQL (hosted in `AWS ap-south-1`)
* **Connection Pooling:** pgBouncer Transaction Pooling (port `6543`)
* **Driver:** `psycopg2-binary >= 2.9.0` with autocommit transactions
* **Database URI Structure:** `postgresql://postgres.[ref]:[password]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres`

### Table Definitions & Attributes

#### 1. `scraped_documents`
Stores raw scraped pages, PDF extracts, and processing status.
```sql
CREATE TABLE IF NOT EXISTS scraped_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    source_url TEXT UNIQUE NOT NULL,
    content_type VARCHAR(50) DEFAULT 'webpage', -- 'webpage', 'pdf', 'docx'
    category VARCHAR(100) DEFAULT 'General',    -- 'Fees', 'Syllabus', 'Admission'
    raw_markdown TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    chunk_count INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',       -- 'pending', 'indexed', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_scraped_url ON scraped_documents(source_url);
```

#### 2. `chat_sessions`
Tracks individual user conversation sessions across browser tabs.
```sql
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) DEFAULT 'anonymous',
    session_title VARCHAR(255) DEFAULT 'New Conversation',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. `chat_messages`
Stores all dialogue history, verified citations, token counts, and execution metadata.
```sql
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    citations JSONB DEFAULT '[]'::jsonb,
    prompt_tokens INT DEFAULT 0,
    completion_tokens INT DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,         -- rewritten_query, trace, model_used, followups
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
```

#### 4. `query_cache`
Exact-match FAQ semantic cache table to bypass LLM generation on repeated questions.
```sql
CREATE TABLE IF NOT EXISTS query_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_hash VARCHAR(64) UNIQUE NOT NULL,    -- SHA-256 of normalized prompt
    query_text TEXT NOT NULL,
    response_text TEXT NOT NULL,
    citations JSONB DEFAULT '[]'::jsonb,
    hit_count INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_query_cache_hash ON query_cache(query_hash);
```

#### 5. `message_feedback`
Stores user ratings (thumbs-up / thumbs-down) per assistant message.
```sql
CREATE TABLE IF NOT EXISTS message_feedback (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL UNIQUE REFERENCES chat_messages(id) ON DELETE CASCADE,
    session_id UUID,
    rating     SMALLINT NOT NULL CHECK (rating IN (-1, 1)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_message_feedback_message_id ON message_feedback(message_id);
CREATE INDEX IF NOT EXISTS idx_message_feedback_created_at ON message_feedback(created_at DESC);
```

#### 6. `feedback_correction_log`
Audit log generated by the automated background self-healing correction worker.
```sql
CREATE TABLE IF NOT EXISTS feedback_correction_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL,
    session_id UUID NOT NULL,
    user_query TEXT,
    original_answer TEXT,
    verdict VARCHAR(50),                       -- 'REAL_QA_MISMATCH' or 'USER_DISSATISFACTION_OR_FUN'
    reason TEXT,
    corrected_answer TEXT,
    cache_updated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### 7. `entities` & PostgreSQL Functions
Trigram-based entity registry for entity linking, disambiguation, and faculty/department name resolution.
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS entities (
    entity_id VARCHAR(50) PRIMARY KEY,        -- Tag string like 'ent_001'
    canonical_name TEXT NOT NULL,
    roles TEXT[] DEFAULT '{}',
    departments TEXT[] DEFAULT '{}',
    aliases TEXT[] DEFAULT '{}',              -- Typos, nicknames, abbreviations
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS entities_name_trgm_idx 
    ON entities USING GIN (canonical_name gin_trgm_ops);

-- Stored function for fuzzy entity lookup
CREATE OR REPLACE FUNCTION match_entity(query_name TEXT, similarity_threshold FLOAT DEFAULT 0.4)
RETURNS TABLE (entity_id VARCHAR(50), canonical_name TEXT, similarity REAL) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.entity_id, 
        e.canonical_name, 
        GREATEST(
            similarity(e.canonical_name, query_name),
            (SELECT max(similarity(alias, query_name)) FROM unnest(e.aliases) as alias)
        )::REAL as sim
    FROM entities e
    WHERE 
        e.canonical_name % query_name OR 
        EXISTS (SELECT 1 FROM unnest(e.aliases) alias WHERE alias % query_name)
    ORDER BY sim DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;
```

---

## 3. Vector Database Architecture: Qdrant Cloud

### Cluster & Collection Configuration
* **Service:** Qdrant Cloud Cluster (`aws.cloud.qdrant.io`, EU-Central-1)
* **Collection Name:** `nvidia`
* **Vector Dimension:** `2048` (paired with `nvidia/llama-nemotron-embed-vl-1b-v2`) or `1024` (paired with `nvidia/nv-embedqa-e5-v5`)
* **Distance Metric:** `Distance.COSINE`
* **Total Points Ingested:** ~1,692 vectors

### Point Payload Structure
Every point indexed into Qdrant adheres to the following JSON payload schema:
```json
{
  "text": "Full cleaned section chunk text...",
  "title": "Document Title (e.g. MSAJCE — Computer Science & Engineering)",
  "section_title": "Laboratories and Equipment",
  "source_file": "msajce_cse.md",
  "url": "https://msajce-edu.in/departments/cse",
  "category": "Department — Computer Science & Engineering",
  "department": "CSE",
  "document_type": "md",
  "page_number": 1,
  "chunk_index": 4,
  "total_chunks": 18,
  "entities": ["Dr. K. S. Srinivasan", "CSE Department"],
  "entity_ids": ["ent_001", "ent_014"],
  "keywords": ["python", "data structures", "linux lab"],
  "parent_id": "a98a0f9b-1175-4d0f-8c3e-89a1bfa49112",
  "chunk_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "scraped_at": "2026-04-28T00:00:00Z"
}
```

### Registered Payload Indexes
To accelerate filtered hybrid retrieval and scrolling without full-scan bottlenecks:
1. `chunk_index` -> `PayloadSchemaType.INTEGER`
2. `parent_id` -> `PayloadSchemaType.KEYWORD`
3. `source_file` -> `keyword`
4. `category` -> `keyword`
5. `entity_ids` -> `keyword`

---

## 4. Hybrid Retrieval & Ingestion Pipeline

### Semantic Parent-Child Chunking
* **Soft Target:** 600 characters (~150 tokens) for focused vector granularity.
* **Hard Maximum:** 900 characters (~225 tokens) to comfortably remain within embedding model context limits.
* **Hard Minimum:** 60 characters (shorter fragments filtered out defensively).
* **Overlap:** 60 to 100 characters sliding window.
* **Markdown Table Preservation:** Tables up to 1,800 characters are kept as a single atomic chunk to prevent splitting rows from header semantics.
* **Transport Bus Route Preservation:** Bus routes (`msajce_transport.md`) are parsed per route header (`### Route AR 3...`) and kept whole to ensure timing tables stay connected to driver and start details.

### Retrieval Pipeline Mechanics
1. **Spell Corrector (`SpellCorrector`):**
   * Computes Levenshtein edit distance ($\le 2$) against an internal lexicon built from dataset tokens, place names, and proper nouns.
2. **Dense Vector Search:**
   * Generates query embedding via NVIDIA NIM endpoint and searches Qdrant using Cosine similarity (Top $K = 25$).
3. **Sparse Lexical Search (`BM25IndexManager`):**
   * Tokenized in-memory BM25 index built from `dataset/` files (Top $K = 25$).
4. **Reciprocal Rank Fusion (RRF):**
   $$\text{RRF Score}(d) = \sum_{m \in \{\text{Dense}, \text{BM25}\}} \frac{1}{60 + \text{Rank}_m(d)}$$
   Produces merged top 40 candidates.
5. **Neural Re-Ranking (`rag_config.RERANK_MODELS`):**
   * Model: `nvidia/llama-nemotron-rerank-1b-v2` via NVIDIA NIM.
   * Evaluates top 40 candidates and returns top 5-6 chunks with logit threshold $\ge -15.0$.

---

## 5. Caching Strategy: Two-Tier Architecture

To eliminate recurring LLM inference costs and achieve near-instant response times:

```
User Query ──> [Normalize Text: lowercase, remove punctuation, collapse whitespace]
                    │
                    ▼
               [SHA-256 Hash]
                    │
                    ├──> Tier 1: STATIC_MEMORY_CACHE (RAM Dict) ──> HIT? ──> Return 0ms
                    │
                    └──> Tier 2: Supabase PostgreSQL (query_cache) ──> HIT? ──> Return ~20ms
```

* **Tier 1 (In-Memory RAM Cache):**
  Pre-loaded at application startup with seed FAQs, hero action questions, and developer queries (`SEED_CACHE` + `PREDEFINED_CACHE`). Delivers answers in **0 ms**.
* **Tier 2 (Supabase `query_cache`):**
  Persistent dynamic database cache. When an LLM generates a high-confidence answer, it writes to `query_cache`. Subsequent identical queries increment `hit_count` and bypass generation.

---

## 6. Self-Healing Feedback Loop & LLM-as-a-Judge

When a user submits a negative rating (`rating = -1`):
1. **Cache Invalidation:**
   * Immediate exact deletion by SHA-256 hash.
   * Fuzzy deletion matching the first 40 characters of the query string using `ILIKE` to purge stale variants.
2. **Asynchronous Background Worker:**
   * Executed via FastAPI `BackgroundTasks` (`process_feedback_correction`).
   * Fetches the user query, assistant response, and reference context.
3. **LLM Judge Audit:**
   * Model: `meta/llama-3.1-8b-instruct` / `meta/llama-3.2-11b-vision-instruct`.
   * Evaluates whether the negative rating is a:
     * `USER_DISSATISFACTION_OR_FUN`: Factual answer disliked due to institutional policies (e.g., fee costs, curfew). No action taken.
     * `REAL_QA_MISMATCH`: Contradiction, inaccurate number, or hallucination.
4. **Automated Synthesis & Cache Overwrite:**
   * **Minor Error:** Synthesizes an in-place patch to correct only the wrong detail (link, email, number).
   * **Major Error:** Runs fresh hybrid retrieval, synthesizes a brand new verified ground-truth answer, and inserts it into `query_cache`.
   * Logs the complete audit entry into `feedback_correction_log`.

---

## 7. External Gateways & Model Routing

| Model Function | Primary Model | Provider / Gateway | Fallback Model |
| :--- | :--- | :--- | :--- |
| **Chat Generation** | `google/gemini-2.5-flash-lite` | Vercel AI Gateway | `meta/llama-3.1-70b-instruct` (NVIDIA NIM) / OpenRouter |
| **Embeddings** | `nvidia/nv-embedqa-e5-v5` / `llama-nemotron-embed-vl-1b-v2` | NVIDIA NIM | `alibaba/qwen3-embedding-0.6b` (Vercel Gateway) |
| **Neural Reranking** | `nvidia/llama-nemotron-rerank-1b-v2` | NVIDIA NIM | `voyage/rerank-2.5-lite` (Vercel Gateway) |
| **Self-Healing Judge** | `meta/llama-3.2-11b-vision-instruct` | NVIDIA NIM | `google/gemini-2.5-flash-lite` |

---

## 8. Frontend Architecture & Webhook/Proxy Components

### Frontend Specifications
* **Framework:** React 18 / 19 with TypeScript, bundled with Vite 6.
* **Styling & Styling Utilities:** Tailwind CSS v4, `clsx`, `tailwind-merge`.
* **Icons & Animation:** `lucide-react`, `framer-motion`.
* **Markdown & Tables:** `react-markdown`, `remark-gfm`, `rehype-raw`.
* **Map & Route Visualizer:** Integrated `maplibre-gl` for rendering custom interactive college bus routes and location markers.

### Vercel AI Gateway Node.js Proxy (`gateway_proxy/`)
* **Purpose:** An Express.js microservice (`server.mjs`) acting as an OpenAI-compatible proxy to the Vercel AI SDK (`ai` package).
* **Port:** 3001
* **Streaming Protocol:** Server-Sent Events (SSE) streaming tokens from Vercel AI Gateway back to the Python backend or client.

---

## 9. Evaluation, Testing & Benchmarking Suite (RAGAS)

The project includes a standalone RAGAS offline evaluation suite in `backend/eval/`:
* **Dataset:** `eval_dataset.json` containing ground-truth question, context, and reference answers.
* **Evaluator Script:** `ragas_eval.py` / `run_eval.py`.
* **Metrics Calculated:**
  * **Context Recall:** Did hybrid retrieval find all ground-truth facts?
  * **Context Precision:** Are the top reranked chunks directly relevant?
  * **Faithfulness:** Does the generated output contain zero ungrounded assertions?
  * **Answer Relevancy:** Does the output directly answer the prompt?

---

## 10. Comparison Summary: Legacy Chatbot vs Current Active Bot

| Aspect | `lorin ai msajce chatbot` (Audited Target) | `nvidia powered AI` (Current Workspace) |
| :--- | :--- | :--- |
| **Relational Database** | **Supabase Cloud PostgreSQL** (`aws-1-ap-south-1`) | **Neon Serverless PostgreSQL** (`us-east-2`) |
| **Vector Database** | Qdrant Cloud (`nvidia` collection, 1692 pts) | Qdrant Cloud (`nvidia_powered_ai` collection) |
| **LLM Gateway** | Vercel AI Gateway + Node Proxy | Direct Vercel AI Gateway / NVIDIA NIM |
| **Primary LLM** | `google/gemini-2.5-flash-lite` | `zai/glm-5.3-flash` / `google/gemini-2.5-flash-lite` |
| **Semantic Cache** | Supabase `query_cache` (SHA-256 hash) | Neon `query_cache` with `pgvector(2048)` |
| **Frontend UI** | Card-based chat widget with MapLibre | Cardless editorial layout with live token breakdown |
