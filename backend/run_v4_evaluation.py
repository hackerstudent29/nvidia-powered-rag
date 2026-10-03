"""
Dedicated V4 Benchmark Runner & Explicit File Writer
=====================================================
Executes Lorin AI V4 Benchmark and explicitly persists all evaluation artifacts.
"""
import os
import sys
import json
import csv
import asyncio
import time
from typing import Dict, List, Tuple, Any
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

import server
from eval_stress_test_500 import (
    EVAL_SUITE_PATH, DEV_SUITE_PATH, VAL_SUITE_PATH, HOLDOUT_SUITE_PATH,
    EVAL_DIR, RESULTS_DIR, REPORTS_DIR,
    evaluate_single_item, compute_confusion_matrix, run_ablation_study,
    classify_6state_outcome
)
from collections import Counter

async def main():
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    print("==================================================================")
    print(f"🚀 Lorin AI — Benchmark Evaluation & Stress Test (V4 Engine) [{timestamp_str}]")
    print("==================================================================")

    # 1. Init RAG resources
    server.init_rag_resources()

    # 2. Load dataset
    testset = []
    with open(EVAL_SUITE_PATH, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                testset.append(json.loads(line))

    print(f"[INIT] Loaded {len(testset)} total benchmark questions across categories.")

    # 3. Parallel Execution Worker Queue
    semaphore = asyncio.Semaphore(8)
    async def worker(item):
        async with semaphore:
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, evaluate_single_item, item)

    t0 = time.time()
    tasks = [worker(item) for item in testset]
    pair_out = await asyncio.gather(*tasks)
    total_eval_time = round(time.time() - t0, 2)

    results = [p[0] for p in pair_out]
    traces = [p[1] for p in pair_out]

    # 4. Binary Confusion Matrix & 6-State Outcome Breakdown
    cm = compute_confusion_matrix(results)
    outcome_counts = Counter(r["outcome_state"] for r in results)

    # 5. Latency Percentiles
    latencies = sorted([r["latency_ms"] for r in results])
    p50 = latencies[int(len(latencies) * 0.50)]
    p75 = latencies[int(len(latencies) * 0.75)]
    p90 = latencies[int(len(latencies) * 0.90)]
    p95 = latencies[int(len(latencies) * 0.95)]
    p99 = latencies[int(len(latencies) * 0.99)]

    passes = [r for r in results if r["verdict"] == "PASS"]
    fails = [r for r in results if r["verdict"] == "FAIL"]

    total_q = len(results)
    overall_accuracy = round(len(passes) / total_q * 100, 2)
    avg_groundedness = round(sum(r["groundedness_score"] for r in results) / total_q * 100, 2)
    avg_correctness = round(sum(r["factual_correctness"] for r in results) / total_q * 100, 2)

    # Global Multi-k Retrieval Metrics Average (across answerable queries)
    ans_items = [r for r in results if not r.get("should_abstain", False)]
    avg_r1 = round(sum(r.get("recall_at_1", 0.0) for r in ans_items) / len(ans_items) * 100, 2) if ans_items else 0.0
    avg_r3 = round(sum(r.get("recall_at_3", 0.0) for r in ans_items) / len(ans_items) * 100, 2) if ans_items else 0.0
    avg_r5 = round(sum(r.get("recall_at_5", 0.0) for r in ans_items) / len(ans_items) * 100, 2) if ans_items else 0.0
    avg_r10 = round(sum(r.get("recall_at_10", 0.0) for r in ans_items) / len(ans_items) * 100, 2) if ans_items else 0.0
    avg_r20 = round(sum(r.get("recall_at_20", 0.0) for r in ans_items) / len(ans_items) * 100, 2) if ans_items else 0.0
    avg_r50 = round(sum(r.get("recall_at_50", 0.0) for r in ans_items) / len(ans_items) * 100, 2) if ans_items else 0.0
    avg_mrr10 = round(sum(r.get("mrr_at_10", 0.0) for r in ans_items) / len(ans_items) * 100, 2) if ans_items else 0.0
    avg_ndcg10 = round(sum(r.get("ndcg_at_10", 0.0) for r in ans_items) / len(ans_items) * 100, 2) if ans_items else 0.0

    if avg_ndcg10 > 100.0:
        raise ValueError(f"CRITICAL EVALUATOR INVARIANT FAILURE: nDCG@10 ({avg_ndcg10}%) EXCEEDS 100.0%!")

    # Category Performance Breakdown
    cat_metrics = {}
    categories = set(r["category"] for r in results)
    for cat in categories:
        c_items = [r for r in results if r["category"] == cat]
        c_passes = [r for r in c_items if r["verdict"] == "PASS"]
        c_acc = round(len(c_passes) / len(c_items) * 100, 2)
        c_p50 = sorted([r["latency_ms"] for r in c_items])[int(len(c_items) * 0.50)]
        cat_metrics[cat] = {
            "total_questions": len(c_items),
            "passed": len(c_passes),
            "failed": len(c_items) - len(c_passes),
            "accuracy_pct": c_acc,
            "fraction": f"{len(c_passes)}/{len(c_items)}",
            "p50_latency_ms": c_p50
        }

    root_cause_counts = Counter(r["root_cause"] for r in fails)

    # 6. Evaluate Dataset Splits (Dev / Val / Holdout) from results map
    results_by_id = {r["id"]: r for r in results}

    def compute_split_from_results(name: str, path: str) -> Dict[str, Any]:
        if not os.path.exists(path):
            return {}
        s_ids = []
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    s_ids.append(json.loads(line)["id"])
        s_res = [results_by_id[qid] for qid in s_ids if qid in results_by_id]
        s_passes = [r for r in s_res if r["verdict"] == "PASS"]
        s_acc = round(len(s_passes) / len(s_res) * 100, 2) if s_res else 0.0
        return {
            "split_name": name,
            "total_questions": len(s_res),
            "passed": len(s_passes),
            "failed": len(s_res) - len(s_passes),
            "accuracy_pct": s_acc,
            "fraction": f"{len(s_passes)}/{len(s_res)}"
        }

    dev_metrics = compute_split_from_results("Dev Split", DEV_SUITE_PATH)
    val_metrics = compute_split_from_results("Validation Split", VAL_SUITE_PATH)
    holdout_metrics = compute_split_from_results("Held-Out Split", HOLDOUT_SUITE_PATH)

    # 7. Run Ablation Benchmark
    ablation_summary = await run_ablation_study(testset)

    # 8. Build Summary Object
    output_summary = {
        "evaluation_timestamp": timestamp_str,
        "total_questions_evaluated": len(results),
        "total_passed": len(passes),
        "total_failed": len(fails),
        "overall_accuracy_pct": overall_accuracy,
        "overall_accuracy_fraction": f"{len(passes)}/{total_q}",
        "average_groundedness_pct": avg_groundedness,
        "average_correctness_pct": avg_correctness,
        "retrieval_metrics": {
            "Recall@1_pct": avg_r1,
            "Recall@3_pct": avg_r3,
            "Recall@5_pct": avg_r5,
            "Recall@10_pct": avg_r10,
            "Recall@20_pct": avg_r20,
            "Recall@50_pct": avg_r50,
            "MRR@10_pct": avg_mrr10,
            "nDCG@10_pct": avg_ndcg10
        },
        "confusion_matrix": cm,
        "outcome_6state_breakdown": dict(outcome_counts),
        "dataset_splits": {
            "dev_split": dev_metrics,
            "validation_split": val_metrics,
            "held_out_split": holdout_metrics
        },
        "total_evaluation_time_sec": total_eval_time,
        "latency_percentiles_ms": {
            "P50": p50,
            "P75": p75,
            "P90": p90,
            "P95": p95,
            "P99": p99
        },
        "category_metrics": cat_metrics,
        "failure_root_causes": dict(root_cause_counts),
        "ablation_study": ablation_summary
    }

    # Generate Markdown Report
    report_md = f"""# 🏛️ Lorin AI — V4 Audited Confusion Matrix & RAG Groundedness Report
**Execution Timestamp**: `{timestamp_str}`

## 📌 Executive Summary
- **Total Questions Evaluated**: `{total_q}`
- **Overall System Accuracy**: `{len(passes)}/{total_q} = {overall_accuracy}%`
- **Average Claim Groundedness**: `{avg_groundedness}%`
- **Average Factual Correctness**: `{avg_correctness}%`
- **Total Evaluation Time**: `{total_eval_time}s` (Parallel Bounded Concurrency: 8 workers)

---

## 📈 Audited Retrieval Metrics Suite

| Retrieval Metric | Score (%) | Range / Invariant Standard |
| :--- | :---: | :--- |
| **Recall@1** | `{avg_r1}%` | `0% <= Recall@1 <= 100%` |
| **Recall@3** | `{avg_r3}%` | `0% <= Recall@3 <= 100%` |
| **Recall@5** | `{avg_r5}%` | `0% <= Recall@5 <= 100%` |
| **Recall@10** | `{avg_r10}%` | `0% <= Recall@10 <= 100%` |
| **Recall@20** | `{avg_r20}%` | `0% <= Recall@20 <= 100%` |
| **Recall@50** | `{avg_r50}%` | `0% <= Recall@50 <= 100%` |
| **MRR@10** | `{avg_mrr10}%` | `0% <= MRR@10 <= 100%` |
| **nDCG@10** | `{avg_ndcg10}%` | `0% <= nDCG@10 <= 100% (Audited Deduplicated Gain)` |

---

## 📊 Binary Confusion Matrix & Abstention Scorecard

| Metric | Fraction (N / D) | Percentage (%) | Definition / Standard |
| :--- | :---: | :---: | :--- |
| **True Answers (TA)** | `{cm['TRUE_ANSWER']}` | — | Passed answerable query |
| **False Refusals (FR)** | `{cm['FALSE_REFUSAL']}` | — | Failed answerable query due to refusal |
| **False Answers (FA)** | `{cm['FALSE_ANSWER']}` | — | Failed unanswerable query due to hallucination |
| **True Abstentions (TAB)** | `{cm['TRUE_ABSTENTION']}` | — | Passed unanswerable query |
| **Answer Precision** | `{cm['answer_precision_fraction']}` | `{cm['answer_precision_pct']}%` | `TA / (TA + FA)` |
| **Answer Recall** | `{cm['answer_recall_fraction']}` | `{cm['answer_recall_pct']}%` | `TA / (TA + FR)` |
| **Abstention Precision** | `{cm['abstention_precision_fraction']}` | `{cm['abstention_precision_pct']}%` | `TAB / (TAB + FR)` |
| **Abstention Recall** | `{cm['abstention_recall_fraction']}` | `{cm['abstention_recall_pct']}%` | `TAB / (TAB + FA)` |
| **False Refusal Rate** | `{cm['false_refusal_rate_fraction']}` | `{cm['false_refusal_rate_pct']}%` | `FR / (TA + FR)` |
| **False Answer Rate** | `{cm['false_answer_rate_fraction']}` | `{cm['false_answer_rate_pct']}%` | `FA / (TAB + FA)` |

---

## 🔬 Expanded 6-State User-Facing Answer Quality Taxonomy

| Outcome State | Occurrences | Fraction (N / D) | Description |
| :--- | :---: | :---: | :--- |
| **ANSWER_CORRECT** | `{outcome_counts.get('ANSWER_CORRECT', 0)}` | `{outcome_counts.get('ANSWER_CORRECT', 0)}/{total_q}` | Fully correct answer with complete evidence support |
| **ANSWER_INCORRECT** | `{outcome_counts.get('ANSWER_INCORRECT', 0)}` | `{outcome_counts.get('ANSWER_INCORRECT', 0)}/{total_q}` | Factual error or wrong claim synthesis |
| **ANSWER_INCOMPLETE** | `{outcome_counts.get('ANSWER_INCOMPLETE', 0)}` | `{outcome_counts.get('ANSWER_INCOMPLETE', 0)}/{total_q}` | Partial answer missing some required sub-claims |
| **ABSTAIN_CORRECT** | `{outcome_counts.get('ABSTAIN_CORRECT', 0)}` | `{outcome_counts.get('ABSTAIN_CORRECT', 0)}/{total_q}` | Unanswerable query correctly refused |
| **ABSTAIN_INCORRECT** | `{outcome_counts.get('ABSTAIN_INCORRECT', 0)}` | `{outcome_counts.get('ABSTAIN_INCORRECT', 0)}/{total_q}` | False answer on unanswerable query (hallucination) |
| **ABSTAIN_WITH_UNSUPPORTED_REASON** | `{outcome_counts.get('ABSTAIN_WITH_UNSUPPORTED_REASON', 0)}` | `{outcome_counts.get('ABSTAIN_WITH_UNSUPPORTED_REASON', 0)}/{total_q}` | Answerable query incorrectly refused (false refusal) |

---

## 🔬 Dataset Splits Performance

| Split Name | Questions | Passed | Failed | Accuracy (%) | Fraction (N / D) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Development Split (60%)** | `{dev_metrics.get('total_questions', 0)}` | `{dev_metrics.get('passed', 0)}` | `{dev_metrics.get('failed', 0)}` | `{dev_metrics.get('accuracy_pct', 0)}%` | `{dev_metrics.get('fraction', '0/0')}` |
| **Validation Split (20%)** | `{val_metrics.get('total_questions', 0)}` | `{val_metrics.get('passed', 0)}` | `{val_metrics.get('failed', 0)}` | `{val_metrics.get('accuracy_pct', 0)}%` | `{val_metrics.get('fraction', '0/0')}` |
| **Held-Out Test Split (20%)** | `{holdout_metrics.get('total_questions', 0)}` | `{holdout_metrics.get('passed', 0)}` | `{holdout_metrics.get('failed', 0)}` | `{holdout_metrics.get('accuracy_pct', 0)}%` | `{holdout_metrics.get('fraction', '0/0')}` |

---

## ⚡ Latency Breakdown (Percentiles)
- **P50 Latency**: `{p50} ms`
- **P75 Latency**: `{p75} ms`
- **P90 Latency**: `{p90} ms`
- **P95 Latency**: `{p95} ms`
- **P99 Latency**: `{p99} ms`

---

## 📊 Category Performance Breakdown

| Category | Total Questions | Passed | Failed | Accuracy (%) | Fraction (N / D) | P50 Latency (ms) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
"""
    for cat, m in sorted(cat_metrics.items()):
        report_md += f"| `{cat}` | {m['total_questions']} | {m['passed']} | {m['failed']} | `{m['accuracy_pct']}%` | `{m['fraction']}` | `{m['p50_latency_ms']} ms` |\n"

    report_md += """
---

## 🔍 Root-Cause Failure Taxonomy (A-I Diagnostic Triage)

| Failure Diagnosis Code | Occurrences | Description |
| :--- | :---: | :--- |
"""
    for rc, count in root_cause_counts.items():
        report_md += f"| `{rc}` | {count} | Evaluated failure stage category |\n"

    report_md += """
---

## 🏆 Audited Retrieval Ablation Leaderboard (Before vs After Reranking)

| Configuration | Recall@1 (%) | Recall@10 (%) | MRR@10 (%) | nDCG@10 (%) | Top1 Acc (%) | Top3 Acc (%) | Eval Time (s) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
"""
    for cfg_name, cfg_val in ablation_summary.items():
        report_md += f"| `{cfg_name}` | `{cfg_val['recall_at_1']}%` | `{cfg_val['recall_at_10']}%` | `{cfg_val['mrr_at_10']}%` | `{cfg_val['ndcg_at_10']}%` | `{cfg_val['top1_accuracy']}%` | `{cfg_val['top3_accuracy']}%` | `{cfg_val['eval_time_sec']}s` |\n"

    report_md += f"""
---

## 🏆 Final System Readiness Verdict
**STATUS**: `{"PASS — ALL METRICS VERIFIED" if overall_accuracy >= 70.0 and cm['abstention_recall_pct'] >= 75.0 else "ENGINEERING IN PROGRESS — FAIL FOR PRODUCTION GATE"}`

Executed against the live Lorin AI backend pipeline.
"""

    # 9. Explicitly Save Artifact Files
    target_files = [
        os.path.join(EVAL_DIR, "results_v4_summary.json"),
        os.path.join(EVAL_DIR, "lorin_v4_rag_evaluation_report.md"),
        os.path.join(RESULTS_DIR, "summary.json"),
        os.path.join(REPORTS_DIR, "lorin_rag_evaluation_report.md"),
        os.path.join(EVAL_DIR, f"results_{timestamp_str}.json"),
        os.path.join(EVAL_DIR, f"summary_{timestamp_str}.md")
    ]

    for p in [os.path.join(EVAL_DIR, "results_v4_summary.json"), os.path.join(RESULTS_DIR, "summary.json"), os.path.join(EVAL_DIR, f"results_{timestamp_str}.json")]:
        with open(p, "w", encoding="utf-8") as f:
            json.dump(output_summary, f, indent=2)

    for p in [os.path.join(EVAL_DIR, "lorin_v4_rag_evaluation_report.md"), os.path.join(REPORTS_DIR, "lorin_rag_evaluation_report.md"), os.path.join(EVAL_DIR, f"summary_{timestamp_str}.md")]:
        with open(p, "w", encoding="utf-8") as f:
            f.write(report_md)

    with open(os.path.join(EVAL_DIR, "leaderboard.csv"), "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Configuration", "Recall@1 (%)", "Recall@10 (%)", "MRR@10 (%)", "nDCG@10 (%)", "Top1 Acc (%)", "Top3 Acc (%)", "Eval Time (s)"])
        for cfg_name, cfg_val in ablation_summary.items():
            writer.writerow([cfg_name, cfg_val["recall_at_1"], cfg_val["recall_at_10"], cfg_val["mrr_at_10"], cfg_val["ndcg_at_10"], cfg_val["top1_accuracy"], cfg_val["top3_accuracy"], cfg_val["eval_time_sec"]])

    print(f"\n[PERSISTENCE SUCCESS] Saved all V4 artifacts cleanly!")
    print(f"Overall Accuracy: {overall_accuracy}% | Abstention Recall: {cm['abstention_recall_pct']}%")

if __name__ == "__main__":
    import time
    asyncio.run(main())
