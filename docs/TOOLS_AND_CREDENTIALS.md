# 🛠️ Lorin AI – Tools, Skills & Credentials Catalog
**Engineering Inventory for Production Runtime & NVIDIA Agent Workflows**

---

## 1. Runtime Technology Stack (Live Production API)

| Layer | Technology | Version / Spec | Purpose in Project | Cost / License |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend UI** | **React + TypeScript** | 18+ (Vite) | Student-facing conversational interface | 100% Free / MIT |
| **Styling** | **TailwindCSS** | 3.4+ | Modern, responsive, dark-mode campus UI | 100% Free / MIT |
| **Animations** | **Framer Motion** | 11+ | Smooth message entry, typing states & pills | 100% Free / MIT |
| **Backend Framework** | **FastAPI** | Python 3.10+ (ASGI) | Asynchronous core RAG API server | 100% Free / MIT |
| **Server Engine** | **Uvicorn** | Standard | ASGI production web server | 100% Free / BSD |
| **Rate Limiter** | **Slowapi** | Token-Bucket | Prevents API abuse (60 req/min per IP) | 100% Free / MIT |
| **Vector Database** | **Qdrant Cloud** | 1.10+ | Dense vector indexing (`nvidia` collection) | **Free Tier (1GB RAM)** |
| **Sparse Search** | **Rank-BM25** | Python Library | Local lexical keyword matching | 100% Free / Apache 2.0 |
| **Relational Database**| **PostgreSQL** | Neon / Supabase | Sessions, messages, feedback & audit logs | **Free Tier (0.5GB)** |
| **Cache Engine** | **Upstash Redis** | Serverless | Tier-1 persistent 0ms cloud cache | **Free Tier (10k req/day)**|
| **Observability** | **Langfuse** | Cloud / Docker | Latency waterfalls, token & feedback traces | **Free Tier (50k traces/mo)**|
| **Doc Parser** | **Docling / NeMo** | Open-Source | Table and PDF extraction to clean Markdown | 100% Free / MIT |

---

## 2. NVIDIA AI Technologies & Agent Skills

We distinguish between **Runtime Inference Models** and **NVIDIA Agent Skills (Developer / CI Workflows)**:

### 🔴 A. NVIDIA Runtime Inference Models (Live Queries)
* **Dense Embedding NIM:** `nvidia/llama-nemotron-embed-vl-1b-v2` (1024 dimensions, high semantic accuracy).
* **Reranker NIM:** `nvidia/llama-nemotron-rerank-1b-v2` (high-precision ranking for dynamic top-$k$ slicing).
* **Guardrails Engine:** **NeMo Guardrails** (executing Colang 2.0 safety policies).

---

### 🔵 B. NVIDIA Agent Skills Catalog (Developer & Evaluation Workflows)
Installed via the standard `skills` CLI to configure, evaluate, and benchmark the system:

```bash
# 1. Ingestion & Retrieval Tuning
npx skills add nvidia/skills --skill nemo-retriever --yes
npx skills add nvidia/skills --skill nemotron-retrieval-recipes --yes

# 2. Safety Policy Authoring & Architecture
npx skills add nvidia/skills --skill nemotron-policy-generator --yes
npx skills add nvidia/skills --skill rag-blueprint --yes

# 3. Quality & Latency Benchmarking Suite
npx skills add nvidia/skills --skill rag-eval --yes
npx skills add nvidia/skills --skill rag-perf --yes
```

### Skill Role Breakdown:

| NVIDIA Skill | Execution Stage | Role & Responsibility in Lorin AI |
| :--- | :--- | :--- |
| **`nemo-retriever`** | Ingestion Workflow | Guides multi-format document ingestion (PDF, tables, circulars) and LanceDB/Qdrant indexing recipes. |
| **`nemotron-policy-generator`** | Development / Policy Gen | Generates custom Colang 2.0 safety and topic-control policies for NeMo Guardrails. |
| **`rag-blueprint`** | Deployment / Config | Guides RAG microservice deployment, multi-hop sub-query decomposition, and custom metadata filtering. |
| **`nemotron-retrieval-recipes`** | Tuning Workflow | Recipes for reranker confidence calibration and dynamic top-$k$ context slicing. |
| **`rag-eval`** | CI/CD / Testing | Quantitative RAGAS evaluation (Faithfulness, Precision, Recall) using the 2,546 QA benchmark (`corpus/` + `train.json`). |
| **`rag-perf`** | CI/CD / Testing | Benchmarks Time-to-First-Token (TTFT), throughput, and concurrency using NVIDIA `aiperf`. |

---

## 3. Required API Keys & Environment Variables (`.env`)

```env
# ==============================================================================
# 🔐 LORIN AI (MSAJCEA CHATBOT) – MASTER ENVIRONMENT CONFIGURATION
# ==============================================================================

# ------------------------------------------------------------------------------
# 🧠 1. LLM GATEWAYS & AI INFERENCE APIS
# ------------------------------------------------------------------------------
# Google Gemini 2.5 Flash Lite (via Vercel AI Gateway or Google AI Studio)
# Free Tier: 1,500 requests per day, 1M context window
# Get Key: https://aistudio.google.com / https://sdk.vercel.ai
AI_GATEWAY_API_KEY=your_vercel_or_gemini_api_key_here

# NVIDIA NIM API (Embeddings: Nemotron Embed VL 1B | Reranker: Nemotron Rerank 1B)
# Free Tier: 1,000 - 5,000 developer credits on signup
# Get Key: https://build.nvidia.com
NVIDIA_API_KEY=your_nvidia_nim_api_key_here

# GroqCloud API (Ultra-Fast Fallback: Llama 3.3 70B @ 500+ tokens/sec)
# Free Tier: 30 RPM, 14,400 requests per day
# Get Key: https://console.groq.com
GROQ_API_KEY=your_groq_api_key_here

# OpenRouter API (Optional Secondary Fallback)
# Get Key: https://openrouter.ai
OPENROUTER_API_KEY=your_openrouter_api_key_here


# ------------------------------------------------------------------------------
# 🔍 2. VECTOR DATABASE (QDRANT CLOUD)
# ------------------------------------------------------------------------------
# Qdrant Cloud Cluster URL (Collection: 'nvidia' - 1024 dimensions)
# Free Tier: 1GB RAM Cluster (Permanent Free Tier)
# Get Key & URL: https://cloud.qdrant.io
QDRANT_URL=your_qdrant_cluster_url_here
QDRANT_API_KEY=your_qdrant_api_key_here
QDRANT_COLLECTION_NAME=nvidia


# ------------------------------------------------------------------------------
# 🗄️ 3. RELATIONAL DATABASE (POSTGRESQL - NEON / SUPABASE)
# ------------------------------------------------------------------------------
# Stores chat_sessions, chat_messages, message_feedback, query_cache, and correction_candidates
# Free Tier: 0.5 GB Postgres Storage
# Get Key: https://neon.tech or https://supabase.com
DATABASE_URL=postgresql://user:password@ep-host.region.neon.tech/neondb?sslmode=require


# ------------------------------------------------------------------------------
# ⚡ 4. DISTRIBUTED CACHING (UPSTASH REDIS)
# ------------------------------------------------------------------------------
# Serverless Redis for persistent 0ms Semantic Vector Cache
# Free Tier: 10,000 requests per day
# Get Key: https://upstash.com
UPSTASH_REDIS_REST_URL=your_upstash_redis_url_here
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token_here


# ------------------------------------------------------------------------------
# 📊 5. OBSERVABILITY & TRACING (LANGFUSE)
# ------------------------------------------------------------------------------
# Live LLM tracing, latency waterfalls, token cost tracking
# Free Tier: 50,000 observations per month
# Get Key: https://cloud.langfuse.com
LANGFUSE_PUBLIC_KEY=your_langfuse_public_key_here
LANGFUSE_SECRET_KEY=your_langfuse_secret_key_here
LANGFUSE_HOST=https://cloud.langfuse.com
```

---

## 4. Free Production Deployment Services

| Component | Recommended Free Host | Free Tier Specifications |
| :--- | :--- | :--- |
| **FastAPI Backend** | **Koyeb** (`koyeb.com`) | Free Eco Web Service (512MB RAM, 24/7 online, **no cold sleeps**) |
| **FastAPI Backend (Alt)** | **Hugging Face Spaces** | Free Docker Instance (**16GB RAM, 2 vCPUs**, 50GB storage) |
| **React Frontend UI** | **Vercel / Cloudflare Pages** | Unlimited deployments, global Edge CDN, free automatic SSL |
| **Vector Index** | **Qdrant Cloud** | 1GB RAM Managed Cluster |
| **Relational Database** | **Neon.tech** | Serverless PostgreSQL with auto-suspend |
