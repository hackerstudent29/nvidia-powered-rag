---
name: rag-eval
description: >-
  RAGAS accuracy benchmarking and offline evaluation skill for measuring Context Recall,
  Context Precision, Faithfulness, Answer Relevancy, and executing ablation matrices (Exp A-G).
---

# NVIDIA RAG-Eval: Accuracy & Ablation Benchmarking

This skill provides evaluation harnesses and metric calculators for benchmarking domain RAG pipelines against gold-standard QA datasets.

---

## 1. Core Evaluation Metrics

1. **Context Recall**: Percentage of ground-truth reference facts successfully retrieved in the Top-$K$ candidate chunks.
2. **Context Precision**: Signal-to-noise ratio in retrieved chunks (higher means relevant chunks rank at the top).
3. **Faithfulness**: Proportion of generated statements that can be directly inferred from the retrieved context ($> 0.95$ target).
4. **Answer Relevancy**: Semantic alignment between the user prompt and the generated response ($> 0.90$ target).
5. **Mean Reciprocal Rank (MRR)**: Average reciprocal rank of the first relevant document.

---

## 2. Master Ablation Matrix (Exp A – Exp G)

| Exp | Architecture Configuration | Retrieval Metrics | Generation Metrics | Primary Focus |
|:---|:---|:---|:---|:---|
| **Exp A** | Dense Vector Search Only (Qdrant) | Recall@3, MRR | Faithfulness | Semantic baseline |
| **Exp B** | Sparse Lexical Only (BM25) | Recall@3, MRR | Faithfulness | Lexical baseline |
| **Exp C** | Dense + BM25 (Unweighted Fusion) | Recall@3, MRR | Faithfulness | Simple union |
| **Exp D** | Dense + BM25 + Reciprocal Rank Fusion ($k=60$) | Recall@3, MRR | Faithfulness | Rank-fused hybrid |
| **Exp E** | Dense + BM25 + RRF + **Nemotron Reranker 1B** | Recall@3, MRR | Faithfulness, Relevancy | Neural reranking impact |
| **Exp F** | Exp E + **Retrieval Confidence Gating ($\theta$)** | Precision@1 | Faithfulness ($> 0.98$) | Hallucination cutoff |
| **Exp G** | Exp F + **Verified Semantic Vector Cache** | Latency, Cache Hit Rate | Cost ($0$ tokens) | Production efficiency |

---

## 3. Evaluation CLI Runbook

To run evaluation benchmarks on a test set:
```bash
python backend/eval_ablation.py --testset tests/gold_qa_dataset.json --experiment Exp_D
```
