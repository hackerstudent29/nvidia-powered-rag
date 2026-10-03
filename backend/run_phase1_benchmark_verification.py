"""
Phase 1 — Clean Production Benchmark Verification Script (Runs TWICE)
========================================================================
Executes full 790-query benchmark verification directly through process_lorin_query().
Reports exact metrics for Run 1 vs Run 2 to prove determinism and verify safety gates.
"""

import os
import sys
import json
import time
import asyncio
from typing import Dict, List, Any
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

import server
from eval_stress_test_500 import (
    EVAL_SUITE_PATH,
    evaluate_single_item,
    compute_confusion_matrix,
    classify_6state_outcome
)
from collections import Counter

def run_benchmark_pass(pass_number: int, testset: List[Dict[str, Any]]) -> Dict[str, Any]:
    print(f"\n--- STARTING BENCHMARK PASS {pass_number} ---")
    t0 = time.time()
    
    # Run sequentially or with low concurrency to ensure clean state
    results = []
    traces = []
    for idx, item in enumerate(testset, 1):
        if idx % 100 == 0 or idx == len(testset):
            print(f"  [Pass {pass_number}] Evaluated {idx}/{len(testset)} queries...")
        res, trace = evaluate_single_item(item)
        results.append(res)
        traces.append(trace)

    total_time = round(time.time() - t0, 2)

    # Separate Answerable (580) vs Unanswerable / Adversarial (210)
    ans_results = [r for r in results if not r.get("should_abstain", False)]
    unans_results = [r for r in results if r.get("should_abstain", False)]

    # Confusion matrix
    cm = compute_confusion_matrix(results)
    
    passes = [r for r in results if r["verdict"] == "PASS"]
    fails = [r for r in results if r["verdict"] == "FAIL"]

    # Answerable Metrics
    ans_correct = len([r for r in ans_results if r["verdict"] == "PASS"])
    ans_false_refusals = len([r for r in ans_results if r["verdict"] == "FAIL"])
    ans_acc = round(ans_correct / len(ans_results) * 100, 2) if ans_results else 0.0

    # Unanswerable Metrics
    unans_correct_abstentions = len([r for r in unans_results if r["verdict"] == "PASS"])
    unans_false_answers = len([r for r in unans_results if r["verdict"] == "FAIL"])
    unans_acc = round(unans_correct_abstentions / len(unans_results) * 100, 2) if unans_results else 0.0

    # Overall Classification
    total_q = len(results)
    overall_acc = round(len(passes) / total_q * 100, 2)

    # Retrieval Metrics (Denominator = 580 Answerable Queries)
    avg_r1 = round(sum(r.get("recall_at_1", 0.0) for r in ans_results) / len(ans_results) * 100, 2)
    avg_r3 = round(sum(r.get("recall_at_3", 0.0) for r in ans_results) / len(ans_results) * 100, 2)
    avg_r5 = round(sum(r.get("recall_at_5", 0.0) for r in ans_results) / len(ans_results) * 100, 2)
    avg_r10 = round(sum(r.get("recall_at_10", 0.0) for r in ans_results) / len(ans_results) * 100, 2)
    avg_r20 = round(sum(r.get("recall_at_20", 0.0) for r in ans_results) / len(ans_results) * 100, 2)
    avg_r50 = round(sum(r.get("recall_at_50", 0.0) for r in ans_results) / len(ans_results) * 100, 2)
    avg_mrr10 = round(sum(r.get("mrr_at_10", 0.0) for r in ans_results) / len(ans_results) * 100, 2)
    avg_ndcg10 = round(sum(r.get("ndcg_at_10", 0.0) for r in ans_results) / len(ans_results) * 100, 2)

    latencies = sorted([r["latency_ms"] for r in results])
    p50 = latencies[int(len(latencies) * 0.50)]
    p95 = latencies[int(len(latencies) * 0.95)]
    p99 = latencies[int(len(latencies) * 0.99)]

    summary = {
        "pass_number": pass_number,
        "total_eval_time_sec": total_time,
        "total_questions": total_q,
        "overall_accuracy": overall_acc,
        "overall_passed": len(passes),
        "overall_failed": len(fails),
        "answerable_count": len(ans_results),
        "answerable_correct": ans_correct,
        "answerable_false_refusals": ans_false_refusals,
        "answerable_accuracy": ans_acc,
        "unanswerable_count": len(unans_results),
        "unanswerable_correct_abstentions": unans_correct_abstentions,
        "unanswerable_false_answers": unans_false_answers,
        "unanswerable_abstention_recall": unans_acc,
        "retrieval_metrics_denom_580": {
            "R@1": avg_r1,
            "R@3": avg_r3,
            "R@5": avg_r5,
            "R@10": avg_r10,
            "R@20": avg_r20,
            "R@50": avg_r50,
            "MRR@10": avg_mrr10,
            "nDCG@10": avg_ndcg10
        },
        "latency_ms": {
            "P50": p50,
            "P95": p95,
            "P99": p99
        },
        "confusion_matrix": cm
    }

    return summary

def main():
    print("==================================================================")
    print("🚀 LORIN AI — PHASE 1 CLEAN BENCHMARK VERIFICATION (RUN 1 vs RUN 2)")
    print("==================================================================")
    
    server.init_rag_resources()

    testset = []
    with open(EVAL_SUITE_PATH, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                testset.append(json.loads(line))

    print(f"[INIT] Loaded {len(testset)} benchmark items.")

    # Run 1
    run1 = run_benchmark_pass(1, testset)

    # Run 2
    run2 = run_benchmark_pass(2, testset)

    print("\n" + "=" * 80)
    print("RESULTS COMPARISON: RUN 1 vs RUN 2")
    print("=" * 80)
    print(f"Total Questions: Run 1 = {run1['total_questions']} | Run 2 = {run2['total_questions']}")
    print(f"Overall Accuracy: Run 1 = {run1['overall_accuracy']}% ({run1['overall_passed']}/790) | Run 2 = {run2['overall_accuracy']}% ({run2['overall_passed']}/790)")
    print(f"Answerable Accuracy (580): Run 1 = {run1['answerable_accuracy']}% ({run1['answerable_correct']}/580) | Run 2 = {run2['answerable_accuracy']}% ({run2['answerable_correct']}/580)")
    print(f"False Refusals (580): Run 1 = {run1['answerable_false_refusals']} | Run 2 = {run2['answerable_false_refusals']}")
    print(f"False Answers (210): Run 1 = {run1['unanswerable_false_answers']}/210 | Run 2 = {run2['unanswerable_false_answers']}/210")
    print(f"Abstention Recall (210): Run 1 = {run1['unanswerable_abstention_recall']}% | Run 2 = {run2['unanswerable_abstention_recall']}%")
    print("\nRetrieval Metrics (Denominator = 580 Answerable Queries):")
    for k in ["R@1", "R@3", "R@5", "R@10", "R@20", "R@50", "MRR@10", "nDCG@10"]:
        r1_val = run1['retrieval_metrics_denom_580'][k]
        r2_val = run2['retrieval_metrics_denom_580'][k]
        print(f"  {k:<8}: Run 1 = {r1_val}% | Run 2 = {r2_val}%")

    out_file = os.path.join(BASE_DIR, "data", "phase1_verification_results.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump({"run1": run1, "run2": run2}, f, indent=2)
    print(f"\nSaved verification results to {out_file}")

if __name__ == "__main__":
    main()
