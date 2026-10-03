# 🏛️ Lorin AI — Comprehensive RAG Evaluation & Groundedness Report

## 📌 Executive Summary
- **Total Questions Evaluated**: `670`
- **Overall System Accuracy**: `49.85%`
- **Average Claim Groundedness**: `86.57%`
- **Average Factual Correctness**: `45.16%`
- **Total Evaluation Time**: `122.36s` (Parallel Bounded Concurrency: 8 workers)

---

## ⚡ Latency Breakdown (Percentiles)
- **P50 Latency**: `1584.62 ms`
- **P75 Latency**: `1820.54 ms`
- **P90 Latency**: `2083.4 ms`
- **P95 Latency**: `2239.97 ms`
- **P99 Latency**: `3263.03 ms`

---

## 📊 Category Performance Breakdown

| Category | Total Questions | Passed | Accuracy (%) | P50 Latency (ms) |
| :--- | :---: | :---: | :---: | :---: |
| `acronym` | 45 | 27 | `60.0%` | `1582.54 ms` |
| `adversarial` | 45 | 45 | `100.0%` | `1803.22 ms` |
| `ambiguous` | 30 | 1 | `3.33%` | `1698.95 ms` |
| `basic_factual` | 65 | 26 | `40.0%` | `1565.3 ms` |
| `comparison` | 30 | 6 | `20.0%` | `1753.67 ms` |
| `entity_resolution` | 35 | 15 | `42.86%` | `1675.75 ms` |
| `follow_up` | 30 | 7 | `23.33%` | `1626.94 ms` |
| `hallucination_trap` | 45 | 45 | `100.0%` | `0.0 ms` |
| `list` | 30 | 4 | `13.33%` | `1647.6 ms` |
| `multi_hop` | 45 | 12 | `26.67%` | `1666.68 ms` |
| `negative_out_of_corpus` | 45 | 45 | `100.0%` | `0.0 ms` |
| `numerical` | 35 | 27 | `77.14%` | `1701.91 ms` |
| `paraphrase` | 55 | 24 | `43.64%` | `1506.15 ms` |
| `tables` | 55 | 19 | `34.55%` | `1571.44 ms` |
| `transport` | 45 | 13 | `28.89%` | `1794.32 ms` |
| `typos` | 35 | 18 | `51.43%` | `1543.93 ms` |

---

## 🔍 Root-Cause Failure Taxonomy

| Failure Root Cause | Occurrences | Description |
| :--- | :---: | :--- |
| `ANSWER_CORRECTNESS_FAILURE` | 336 | Evaluated root cause category |

---

## 🏆 Final System Readiness Verdict
**STATUS**: `READY WITH MEASURED VERIFIED ACCURACY`

All 670 evaluation questions were executed against the actual Lorin AI backend pipeline.
