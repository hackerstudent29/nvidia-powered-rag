<div align="center">

# 🏛️ Lorin AI — NVIDIA Powered Hybrid RAG Campus Intelligence System

**Official AI Campus Assistant for Mohamed Sathak A.J. College of Engineering (MSAJCE), Chennai (TNEA Code 1301)**

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-a--powered--rag.vercel.app-10b981?style=for-the-badge&logo=vercel)](https://a-powered-rag.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![NVIDIA NIM](https://img.shields.io/badge/NVIDIA-NIM_Embeddings-76B900?style=for-the-badge&logo=nvidia)](https://integrate.api.nvidia.com)
[![Qdrant Vector DB](https://img.shields.io/badge/Qdrant-Vector_DB-dc2626?style=for-the-badge&logo=qdrant)](https://qdrant.tech)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React_19-Vite-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)

</div>

---

## 📌 Project Overview

**Lorin AI** is an enterprise-grade campus intelligence platform built for **Mohamed Sathak A.J. College of Engineering (MSAJCE)**, Chennai. It combines 2048-dimensional **NVIDIA NeMo vector embeddings**, **Qdrant Vector Database**, **BM25 Okapi sparse lexical indexing**, **Reciprocal Rank Fusion (RRF)**, **360° Multi-Lingual AI Intent Routing**, and **Neon Serverless PostgreSQL** to deliver zero-hallucination, 0ms-cached responses for TNEA Code 1301 admissions, degree programs, fee structures, alumni scholarships, campus bus routes, hostels, and placement packages.

---

## 📸 Visual Showcase & UI Gallery

| Desktop Assistant View | Mobile Responsive Interface |
|:---:|:---:|
| ![Desktop Interface Showcase](https://raw.githubusercontent.com/hackerstudent29/nvidia-powered-rag/main/frontend/public/lorin-pic.png) | ![Mobile Interface Showcase](https://raw.githubusercontent.com/hackerstudent29/nvidia-powered-rag/main/frontend/public/lorin-pic.png) |

---

## ✨ Key System Features & Enterprise Innovations

### 🔍 1. Multi-Stage Hybrid RAG Engine & Parent-Child Chunking
- **Dense Vector Search**: Powered by Qdrant Cloud vector collection with 2048-d NVIDIA NeMo embeddings (`nvidia/llama-nemotron-embed-vl-1b-v2`).
- **2,500-Character Parent-Child Window**: 811 structured knowledge chunks generated from 51 Markdown files using a 2,500-character chunk window (~500 tokens) with **350-character sliding paragraph overlap**, preventing list fragmentation or loss of student rosters.
- **Sparse Lexical Search**: BM25 Okapi algorithm indexing all 811 parent-child knowledge chunks.
- **Reciprocal Rank Fusion (RRF k=60)**: Merges dense vector scores with sparse BM25 ranks to produce ground-truth context blocks.

### 🌐 2. 360-Degree Multi-Lingual AI Intent & Domain Router
- **Multi-Lingual Gating (`analyze_conversational_intent_ai`)**: Fast AI classification race (<150ms) evaluating user prompts in ANY language (Tamil, Tanglish, English, Hindi, Hinglish, Spanish, etc.) across 4 categories:
  - `PURE_CONVERSATIONAL`: Greetings, gratitude, and compliments (*"Nandri"*, *"Thank you so much"*, *"Super bot"*). **Skips database search completely (0ms DB latency)**.
  - `PURE_JUNK`: Keyboard smashes or noise (*"asdfghjkl"*). **Bypasses vector search & provides polite guidance**.
  - `MIXED_COMPOUND`: Greeting/compliment + campus question (*"Hi Lorin! Super bot! What is the CSE cutoff?"*). Extracts target question for vector search while preserving warm conversational greeting acknowledgment.
  - `INSTITUTIONAL_QUERY`: Direct campus inquiry triggering standard vector search.

### ⚡ 3. Sub-Zero Latency & Automatic System Reset Sync
- **Tier-0 Memory Cache**: ThreadSafe in-memory RAM cache (<0.01ms latency).
- **Tier-1 PostgreSQL Cache**: Persistent SHA-256 exact match and vector semantic cache stored in Neon Serverless PostgreSQL.
- **Automatic System Reset Sync**: Executing `python clear_cache.py` updates backend `system_reset_version.txt`, automatically instructing frontend client browsers to purge local storage (`lorin_user_profile`, `lorin_cached_messages`, `lorin_sessions`).
- **Hard Reset UI Action**: Dedicated **"Hard Reset & Clear All Data"** button in Settings Modal.

### 🛡️ 4. Safety Interceptor & NeMo Guardrails
- **0ms Fast-Path Defense**: Intercepts prompt injections, jailbreaks (DAN mode), and hostile instruction bypasses.
- **Unified 16-Category Intent Taxonomy**: Automatically routes user queries to specialized domains (Admissions, Academics, Transport, Hostels, Placements, Research, etc.).

### 🚌 5. Transport RouteFinder Engine
- **Campus Transit Routing**: Graph routing algorithm managing 175 bus stops across 19 official college bus routes (AR/R/N series) and public MTC transit connections in Siruseri OMR IT Park.

---

## 🏗️ System Architecture

```mermaid
graph TD
    User([👤 User / Client Interface]) -->|HTTPS / SSE Stream| Frontend[⚡ React 19 + Vite Application]
    Frontend -->|POST /api/chat/stream| Backend[🐍 FastAPI Backend Server]
    
    Backend --> Tier0{⚡ Tier-0 RAM Cache}
    Tier0 -->|Hit <0.01ms| ReturnCache[Return Verified Cached Response]
    Tier0 -->|Miss| Guardrails[🛡️ Guardrails & Safety Interceptor]
    
    Guardrails -->|Blocked| Refusal[Return Refusal Notice]
    Guardrails -->|Safe| IntentRouter[🌐 360° Multi-Lingual AI Intent Router]
    
    IntentRouter -->|Pure Greeting / Junk| DirectConv[Warm ChatGPT Response - 0ms DB Latency]
    IntentRouter -->|Compound / Inquiry| HybridRAG[🔍 Multi-Stage Hybrid RAG Engine]
    
    HybridRAG -->|Dense Search| Qdrant[(🔴 Qdrant Vector DB - 2048d NeMo)]
    HybridRAG -->|Sparse Search| BM25[(📄 BM25 Okapi Index - 811 Parent-Child Chunks)]
    
    Qdrant --> RRF[🔀 Reciprocal Rank Fusion RRF]
    BM25 --> RRF
    
    RRF --> Reranker[🎯 Nemotron Neural Cross-Encoder Reranker]
    Reranker --> LLMSynthesis[🤖 NVIDIA NIM / Vercel AI Engine]
    
    LLMSynthesis --> NeonDB[(🐘 Neon Serverless PostgreSQL Cache & Logs)]
    LLMSynthesis -->|SSE Stream| Frontend
```

---

## 🚀 Quickstart & Setup Guide

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+** & **npm 9+**
- **PostgreSQL / Neon DB Connection String**
- **Qdrant Vector DB Instance & API Key**

### 2. Backend Service (FastAPI)
```bash
# Clone the repository
git clone https://github.com/hackerstudent29/nvidia-powered-rag.git
cd nvidia-powered-rag/backend

# Create and activate virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install backend dependencies
pip install -r requirements.txt

# Start the FastAPI backend server
python server.py
```
*Backend API Health Check: `http://localhost:8080/api/health`*

### 3. Frontend Application (React + Vite)
```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Start local development server
npm run dev
```
*Frontend Interface: `http://localhost:5173`*

---

## 💖 Support & Developer Sponsorship

If you find **Lorin AI** helpful or use this open-source Hybrid RAG architecture in your research, consider supporting the lead developer!

<div align="center">

### 👨‍💻 Developer Profile: Ramanathan S. (Ram)
*Software Engineer | B.Tech Information Technology (Batch 2024–2028, CGPA 7.75)*  
**Mohamed Sathak A.J. College of Engineering (MSAJCE), Chennai**

[![Portfolio](https://img.shields.io/badge/🌐_3D_Portfolio-ram--portfolio3d.vercel.app-10b981?style=for-the-badge)](https://ram-portfolio3d.vercel.app)
[![GitHub](https://img.shields.io/badge/🐙_GitHub-hackerstudent29-181717?style=for-the-badge&logo=github)](https://github.com/hackerstudent29)

---

### 💳 Direct Sponsorship / UPI Donation

| Payment Method | Handle / Details |
|---|---|
| **UPI ID** | `ramanathanb86@oksbi` |
| **GPay / PhonePe / Paytm** | `ramanathanb86@oksbi` |

![GPay](https://img.shields.io/badge/GPay-ramanathanb86%40oksbi-4285F4?style=flat-square&logo=google-pay&logoColor=white)
![PhonePe](https://img.shields.io/badge/PhonePe-ramanathanb86%40oksbi-5f259f?style=flat-square&logo=phonepe&logoColor=white)
![Paytm](https://img.shields.io/badge/Paytm-ramanathanb86%40oksbi-00baf2?style=flat-square&logo=paytm&logoColor=white)

</div>

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for details.

---
<div align="center">
  <b>Designed & Developed by Ramanathan S. (Ram / hackerstudent29) for MSAJCE, Chennai</b>
</div>
