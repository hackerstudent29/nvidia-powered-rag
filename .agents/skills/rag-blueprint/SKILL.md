---
name: rag-blueprint
description: >-
  Architectural blueprint and deployment guide for enterprise Hybrid RAG applications with
  FastAPI, Qdrant Vector Database, BM25 Okapi, Two-Tier Caching, Dynamic Context Slicing,
  and Grounded Generation.
---

# NVIDIA RAG Blueprint: Production Architecture

This skill defines the end-to-end architecture, API design, data schemas, and pipeline orchestration for production RAG systems.

---

## 1. System Pipeline Overview

```
Client Request
      │
      ▼
1. Rate Limiting & Safety Guardrails (NeMo Guardrails / Colang 2.0)
      │
      ▼
2. Zero-Token Local Preprocessing (Normalization, Synonym Expansion, Spellcheck)
      │
      ▼
3. Two-Tier Caching Lookup
   ├── Tier 1: Exact SHA-256 Hash Match (0ms RAM / Postgres)
   └── Tier 2: Semantic Vector Match (Cosine Sim >= 0.94 in Postgres/Qdrant)
      │
      ├── [Cache Hit] ──► Return Cached Answer (0 LLM Tokens)
      └── [Cache Miss] ──► Continue Pipeline
            │
            ▼
4. Parallel Hybrid Retrieval & Fusion
   ├── Sparse: BM25 Okapi (Top-25)
   └── Dense: Qdrant 2048-d NVIDIA NeMo Embeddings (Top-25)
            │
            ▼
5. Reciprocal Rank Fusion (RRF k=60)
            │
            ▼
6. NVIDIA Nemotron Reranker 1B Scoring & Confidence Gate
            │
            ├── [Score < Threshold] ──► Fallback Refusal (Zero Hallucination)
            └── [Score >= Threshold] ──► Dynamic Context Slicing
                  │
                  ▼
7. Grounded LLM Generation (GLM-5.3 Flash / MiniMax M3 / Gemini)
            │
            ▼
8. Deterministic Grounding & Citation Validation
            │
            ▼
9. Neon DB Logging & Cache Admission
```

---

## 2. Dynamic Context Slicing Rules

- **Factoid Queries** (e.g. "What is the college code?"): Top 1–2 Chunks (~250 tokens).
- **Standard Inquiries** (e.g. "Explain admission procedure"): Top 2–3 Chunks (~400 tokens).
- **Multi-Hop / Comparative Queries** (e.g. "Compare CSE vs AI&DS"): Top 4–6 Chunks across sub-queries (~800 tokens).

---

## 3. Database Schema Blueprint (PostgreSQL)

- `chat_sessions`: Session ID, User IP, Timestamps.
- `chat_messages`: Message ID, Role, Content, Citations, Latency, Token Usage JSON, Cache status.
- `message_feedback`: Thumbs Up/Down ratings, feedback text.
- `query_cache`: `query_hash` (PK), `query_embedding`, `query_text`, `answer_text`, `source_chunks`, `document_version`, `is_admin_verified`.
- `correction_candidates`: Staged factual error corrections for human/admin review.
