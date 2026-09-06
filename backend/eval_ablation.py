import os
import sys
import json
import time
import asyncio
import httpx
from typing import Dict, Any, List

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

from guardrails import check_guardrails
from server import hybrid_search, multi_hop_hybrid_search, validate_citations, check_exact_cache, get_query_embedding

def calculate_context_recall(ground_truth: str, retrieved_chunks: List[Dict[str, Any]]) -> float:
    """Calculates factual recall of ground truth keywords within retrieved context."""
    if not retrieved_chunks:
        return 0.0
    gt_words = set(w.lower() for w in ground_truth.split() if len(w) > 3)
    if not gt_words:
        return 1.0
    
    combined_context = " ".join(c.get("content", "").lower() for c in retrieved_chunks)
    matched = sum(1 for w in gt_words if w in combined_context)
    return round(matched / len(gt_words), 4)

def calculate_context_precision(retrieved_chunks: List[Dict[str, Any]]) -> float:
    """Calculates context precision (signal-to-noise ratio in top candidates)."""
    if not retrieved_chunks:
        return 0.0
    relevant = sum(1 for c in retrieved_chunks if c.get("rrf_score", 0) > 0.015)
    return round(relevant / len(retrieved_chunks), 4)

async def run_ablation_experiment(exp_id: str, testset: List[Dict[str, Any]]) -> Dict[str, Any]:
    print(f"\n=======================================================")
    print(f"🚀 Running Ablation Benchmark: {exp_id}")
    print(f"=======================================================")

    results = []
    total_latency_ms = 0
    total_recall = 0.0
    total_precision = 0.0
    cache_hits = 0

    for idx, item in enumerate(testset):
        q = item["query"]
        gt = item["ground_truth"]
        t0 = time.time()

        # Guardrails check
        is_allowed, refusal = check_guardrails(q)
        if not is_allowed:
            latency = int((time.time() - t0) * 1000)
            results.append({
                "id": item["id"],
                "query": q,
                "status": "GUARDRAIL_REFUSAL",
                "latency_ms": latency,
                "recall": 1.0,
                "precision": 1.0
            })
            total_latency_ms += latency
            total_recall += 1.0
            total_precision += 1.0
            continue

        query_vector = await get_query_embedding(q)

        if exp_id == "Exp_A":
            # Dense Only
            chunks = hybrid_search(q, query_vector=query_vector, top_k=3)[:3]
        elif exp_id == "Exp_B":
            # BM25 Only
            chunks = hybrid_search(q, query_vector=None, top_k=3)[:3]
        elif exp_id == "Exp_D":
            # Dense + BM25 + RRF
            chunks = multi_hop_hybrid_search(q, query_vector=query_vector, top_k=6)
        elif exp_id == "Exp_G":
            # Exp D + Vector Cache Check
            cache_res = check_exact_cache(q)
            if cache_res:
                cache_hits += 1
                chunks = cache_res.get("sources", [])
            else:
                chunks = multi_hop_hybrid_search(q, query_vector=query_vector, top_k=6)
        else:
            chunks = multi_hop_hybrid_search(q, query_vector=query_vector, top_k=6)

        latency = int((time.time() - t0) * 1000)
        rec = calculate_context_recall(gt, chunks)
        prec = calculate_context_precision(chunks)

        total_latency_ms += latency
        total_recall += rec
        total_precision += prec

        results.append({
            "id": item["id"],
            "query": q,
            "latency_ms": latency,
            "chunks_count": len(chunks),
            "recall": rec,
            "precision": prec
        })

    count = len(testset)
    summary = {
        "experiment": exp_id,
        "queries_tested": count,
        "avg_latency_ms": round(total_latency_ms / count, 2),
        "mean_context_recall": round(total_recall / count, 4),
        "mean_context_precision": round(total_precision / count, 4),
        "cache_hits": cache_hits
    }
    return summary

async def main():
    import server
    server.http_client = httpx.AsyncClient()

    dataset_path = os.path.join(BASE_DIR, "data", "gold_qa_dataset.json")
    with open(dataset_path, "r", encoding="utf-8") as f:
        testset = json.load(f)

    print(f"Loaded {len(testset)} Gold-Standard QA benchmarks.")

    experiments = ["Exp_A", "Exp_B", "Exp_D", "Exp_G"]
    summaries = []

    for exp in experiments:
        sum_data = await run_ablation_experiment(exp, testset)
        summaries.append(sum_data)

    print("\n\n🏆 ================= MASTER ABLATION MATRIX RESULTS ================= 🏆\n")
    print(f"{'Exp ID':<10} | {'Queries':<8} | {'Avg Latency (ms)':<18} | {'Context Recall':<16} | {'Context Precision':<18} | {'Cache Hits':<10}")
    print("-" * 90)
    for s in summaries:
        print(f"{s['experiment']:<10} | {s['queries_tested']:<8} | {s['avg_latency_ms']:<18} | {s['mean_context_recall']:<16} | {s['mean_context_precision']:<18} | {s['cache_hits']:<10}")
    print("\n========================================================================\n")

if __name__ == "__main__":
    asyncio.run(main())
