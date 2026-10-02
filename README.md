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

**Lorin AI** is an enterprise-grade campus intelligence platform built for **Mohamed Sathak A.J. College of Engineering (MSAJCE)**, Chennai. It combines 2048-dimensional **NVIDIA NeMo vector embeddings**, **Qdrant Vector Database**, **BM25 Okapi sparse lexical indexing**, **Reciprocal Rank Fusion (RRF)**, and **Neon Serverless PostgreSQL** to deliver zero-hallucination, 0ms-cached responses for TNEA Code 1301 admissions, degree programs, fee structures, campus bus routes, hostels, and placement packages.

---

## 📸 Visual Showcase & UI Gallery

| Desktop Assistant View | Mobile Responsive Interface |
|:---:|:---:|
| ![Desktop Interface Showcase](https://raw.githubusercontent.com/hackerstudent29/nvidia-powered-rag/main/frontend/public/lorin-pic.png) | ![Mobile Interface Showcase](https://raw.githubusercontent.com/hackerstudent29/nvidia-powered-rag/main/frontend/public/lorin-pic.png) |

---

## ✨ Key System Features

### 🔍 1. Multi-Stage Hybrid RAG Engine
- **Dense Vector Search**: Powered by Qdrant Cloud vector collection with 2048-d NVIDIA NeMo embeddings (`nvidia/llama-nemotron-embed-vl-1b-v2`).
- **Sparse Lexical Search**: BM25 Okapi algorithm indexing 1,200+ parent-child knowledge chunks from 50+ official campus records.
- **Reciprocal Rank Fusion (RRF)**: Merges dense vector scores with sparse BM25 ranks to produce ground-truth context blocks.

### ⚡ 2. Sub-Zero Latency & Dual-Tier Cache
- **Tier-0 Memory Cache**: ThreadSafe in-memory RAM cache (<0.01ms latency).
- **Tier-1 PostgreSQL Cache**: Persistent SHA-256 exact match and vector semantic cache stored in Neon Serverless PostgreSQL.

### 🛡️ 3. Safety Interceptor & NeMo Guardrails
- **0ms Fast-Path Defense**: Intercepts prompt injections, jailbreaks (DAN mode), and hostile instruction bypasses.
- **Unified 16-Category Intent Taxonomy**: Automatically routes user queries to specialized domains (Admissions, Academics, Transport, Hostels, Placements, Research, etc.).

### 🚌 4. Transport RouteFinder Engine
- **Campus Transit Routing**: Graph routing algorithm managing 175 bus stops across 19 official college bus routes (AR/R/N series) and public MTC transit connections in Siruseri OMR IT Park.

### 📊 5. Real-Time Token & Latency Observability
- Transparent badge metrics displaying prompt tokens, completion tokens, time-to-first-token (TTFT), execution latency, and step-by-step reasoning progress.

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
    Guardrails -->|Safe| HybridRAG[🔍 Multi-Stage Hybrid RAG Engine]
    
    HybridRAG -->|Dense Search| Qdrant[(🔴 Qdrant Vector DB - 2048d NeMo)]
    HybridRAG -->|Sparse Search| BM25[(📄 BM25 Okapi Index - 1200+ Chunks)]
    
    Qdrant --> RRF[🔀 Reciprocal Rank Fusion RRF]
    BM25 --> RRF
    
    RRF --> Reranker[🎯 Cross-Encoder Reranker]
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
