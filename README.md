# MSAJCEA Lorin AI — Production Hybrid RAG Chatbot

An enterprise-grade campus intelligence platform for **Mohamed Sathak A.J. College of Engineering and Architecture (MSAJCEA)**, powered by **NVIDIA NeMo Embeddings**, **Qdrant Vector Database**, **BM25 Sparse Retrieval**, **Reciprocal Rank Fusion (RRF)**, and **Neon Serverless PostgreSQL**.

---

## 📁 Project Structure (Ascending & Clean)

```
nvidia powered AI/
├── .agents/                 # Antigravity agent customizations & skills
├── .env                     # Secret credentials & endpoint configuration
├── .gitignore               # Ignored system and build files
├── .neon                    # Neon Functions metadata
├── Dataset/                 # Official MSAJCEA knowledge base documents (50 files)
│   ├── links folder/        # Official URL and document registry
│   └── msajce_*.md          # Campus, departments, admissions, placements, etc.
├── backend/                 # Python FastAPI Hybrid RAG backend
│   ├── data/                # BM25 sparse index corpus (bm25_chunks.json)
│   ├── ingest_knowledgebase.py # Ingestion pipeline for Qdrant & BM25
│   ├── init_db.py           # Neon Postgres schema initialization
│   └── server.py            # FastAPI streaming server, RRF, & DB session manager
├── docs/                    # Architectural diagrams and credentials documentation
│   ├── FINAL_ARCHITECTURE.md # Full technical specification & RAG pipeline flow
│   └── TOOLS_AND_CREDENTIALS.md # Production service endpoints & keys guide
├── frontend/                # React 19 + Vite + Tailwind CSS web interface
│   ├── dist/                # Production build artifacts
│   ├── src/                 # Chat interface, token usage badges, thinking steps
│   └── package.json         # Frontend dependencies & scripts
├── hello.ts                 # Neon TypeScript function endpoint
├── neon.ts                  # Neon client connection helper
├── README.md                # Project documentation & launch guide
└── skills-lock.json         # Workspace skills lock
```

---

## 🚀 Quickstart Guide

### 1. Backend Service (FastAPI)
The backend manages the Hybrid RAG pipeline (Dense 2048-d NVIDIA embeddings + BM25 sparse matching + RRF fusion) and persistent Neon PostgreSQL sessions.

```bash
# Navigate to backend
cd backend

# Start the server (Port 8000)
python server.py
```
Backend health check: `http://localhost:8000/api/health`

### 2. Frontend Application (React + Vite)
The frontend provides a cardless assistant UI with real-time token metrics, step-by-step thinking breakdown, and verified campus citations.

```bash
# Navigate to frontend
cd frontend

# Install dependencies (if not already installed)
npm install

# Start development server (Port 3000)
npm run dev -- --port 3000 --host
```
Frontend interface: `http://localhost:3000/`

---

## 🧠 Architectural Highlights
- **No Web Search Hallucinations**: Answers strictly grounded in the official 50 MSAJCEA markdown documents.
- **Sub-Zero Token Caching**: Exact MD5 hash and semantic caching in Neon PostgreSQL to deliver instant zero-cost responses.
- **Model-Wise & Step-Wise Token Analytics**: Transparent breakdown of prompt tokens, completion tokens, and real-time execution cost per query.
- **Curated MSAJCEA Aesthetic**: Designed with the official campus palette (`#D0CCE5`, `#D0E7E1`, `#F7F6ED`, `#E1EED7`, `#F2CFDF`).
