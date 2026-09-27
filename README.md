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
├── Dataset/                 # Official MSAJCEA knowledge base documents
│   ├── links folder/        # Official URL and document registry
│   ├── transport_data/      # Bus stops, route geometry, and route finder
│   └── msajce_*.md          # Campus, departments, admissions, placements, etc.
├── backend/                 # Python FastAPI Hybrid RAG backend
│   ├── data/                # BM25 sparse index & entity registries
│   ├── chunker.py           # NeMo parent-child chunking & hashing
│   ├── domain_router.py     # Domain classification & intent routing
│   ├── guardrails.py        # Safety & injection detection
│   ├── ingest_knowledgebase.py # Vector embedding & BM25 ingestion pipeline
│   ├── route_finder.py      # Campus transit routing engine
│   └── server.py            # FastAPI streaming server, RRF, & DB session manager
├── docs/                    # Technical architecture, specifications & analysis
│   ├── FINAL_ARCHITECTURE.md # Full technical specification & RAG pipeline flow
│   ├── LORIN_AI_MSAJCE_CHATBOT_ANALYSIS.md # Evaluation & feature breakdown
│   ├── MARKET_ANALYSIS_2024.md # Market & competitive analysis
│   ├── PROJECT_SPECIFICATIONS.md # Complete architectural specifications
│   └── TOOLS_AND_CREDENTIALS.md # Production service endpoints & keys guide
├── frontend/                # React 19 + Vite + Tailwind CSS web interface
│   ├── src/                 # Chat interface, token usage badges, thinking steps
│   └── package.json         # Frontend dependencies & scripts
├── scripts/                 # Maintenance, cache clearing, and database utilities
│   ├── check_db.py          # Database row & user inspector
│   └── clear_cache.py       # One-shot cache & session reset
├── check_db.py              # Root launcher for scripts/check_db.py
├── clear_cache.py           # Root launcher for scripts/clear_cache.py
├── README.md                # Project documentation & launch guide
├── requirements.txt         # Backend Python dependencies
├── start.bat                # Windows dual-server quickstart script
├── start.ps1                # PowerShell dual-server quickstart script
└── vercel.json              # Frontend cloud deployment descriptor
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
