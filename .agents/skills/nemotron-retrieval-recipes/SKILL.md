---
name: nemotron-retrieval-recipes
description: >-
  Guidelines and parameter recipes for tuning dense embedding chunking, table preservation,
  hybrid BM25 + dense search fusion, and neural reranking using NVIDIA NeMo Retriever and
  Nemotron Reranker models.
---

# NVIDIA Nemotron Retrieval Recipes

This skill provides best practices, parameter formulations, and hyperparameter tuning recipes for optimizing high-precision domain-specific RAG pipelines using **NVIDIA NeMo Retriever** and **Nemotron Reranker** infrastructure.

---

## 1. Document Chunking & Context Injection Recipe

### Chunking Parameters
- **Chunk Size**: $450 - 650$ characters (~$100 - 150$ tokens)
- **Chunk Overlap**: $80 - 120$ characters
- **Header-Aware Splitting**: Split primarily along Markdown headings (`#`, `##`, `###`) to preserve topical coherence.
- **Table Preservation**: Never split markdown tables across chunks; keep complete tabular data (fee matrices, cutoffs, syllabus) intact in a single chunk with descriptive header metadata.

### Structured Breadcrumb Context Header
Prepend every chunk with its hierarchical document path:
```markdown
### Document: [Document Title] | Section: [Section Name] | Version: [2026-27]
[Chunk Text Content...]
```

---

## 2. NVIDIA Dense Embedding NIM Recipe

- **Model Identifier**: `nvidia/llama-nemotron-embed-vl-1b-v2`
- **Output Dimensions**: 2048 dimensions (or 1024 truncated)
- **Distance Metric**: Cosine Similarity (`Distance.COSINE`)
- **Input Type**:
  - Documents: Pass raw chunk text with context headers.
  - Queries: Pass normalized, spell-checked query string.
- **Batch Size**: 32–64 items per API request for optimal throughput.

---

## 3. Hybrid Lexical & Dense Rank Fusion (RRF)

Combine lexical sparse signals (BM25 Okapi) and dense semantic vectors (Qdrant Cosine) using **Reciprocal Rank Fusion**:

$$RRF\_Score(d) = \frac{1}{k + Rank_{dense}(d)} + \frac{1}{k + Rank_{sparse}(d)}$$

- **Recommended Constant**: $k = 60$
- **Candidate Pool**: Retrieve Top-25 Dense + Top-25 Sparse candidates $\rightarrow$ Fuse to Top-20 candidates.

---

## 4. NVIDIA Nemotron Reranking NIM Recipe

- **Model Identifier**: `nvidia/llama-nemotron-rerank-1b-v2`
- **Role**: Cross-encoder scoring over fused candidate chunks.
- **Input Format**:
  ```json
  {
    "model": "nvidia/llama-nemotron-rerank-1b-v2",
    "query": { "text": "What is the tuition fee for B.E. Computer Science?" },
    "passages": [
      { "text": "### Document: Fee Structure | Section: CSE Fee\nTuition fee is Rs. 55,000/year..." }
    ]
  }
  ```
- **Retrieval Confidence Gate ($\theta$)**:
  - $\text{Score} \ge \theta_{calibrated}$ ($\sim 0.25 - 0.40$): High confidence $\rightarrow$ Proceed to LLM Generation.
  - $\text{Score} < \theta_{calibrated}$: Low confidence $\rightarrow$ Safe domain refusal: *"I cannot find official records regarding this in the MSAJCE campus database."*
