---
name: rag-perf
description: >-
  Performance, throughput, TTFT (Time To First Token), and latency load profiling skill
  using asynchronous benchmarking tools across multiple concurrency levels.
---

# NVIDIA RAG-Perf: Load & Concurrency Profiling

This skill provides load-testing methodologies, concurrency stress suites, and latency profiling tools for RAG inference backends.

---

## 1. Concurrency Levels & Stress Tiers

- **Level 1 (10 Concurrent Requests)**: Baseline standard campus traffic.
- **Level 2 (25 Concurrent Requests)**: Peak daily break traffic.
- **Level 3 (50 Concurrent Requests)**: Admission announcement / exam result spikes.
- **Level 4 (100 Concurrent Requests)**: Stress boundary and rate-limiting enforcement.

---

## 2. Target Performance Benchmarks

| Metric | Target SLA | Critical Threshold |
|:---|:---|:---|
| **P50 Time-to-First-Token (TTFT)** | $< 400\text{ ms}$ | $< 800\text{ ms}$ |
| **P95 TTFT** | $< 900\text{ ms}$ | $< 1500\text{ ms}$ |
| **P99 TTFT** | $< 1400\text{ ms}$ | $< 2500\text{ ms}$ |
| **End-to-End Latency (Cached)** | $< 50\text{ ms}$ | $< 150\text{ ms}$ |
| **End-to-End Latency (Uncached)** | $< 2000\text{ ms}$ | $< 4000\text{ ms}$ |
| **Average Token Budget per Query** | $< 500\text{ tokens}$ | $< 1000\text{ tokens}$ |

---

## 3. Profiling Execution Commands

To execute concurrency benchmarks against the live backend:
```bash
python backend/perf_benchmarks.py --concurrency 25 --queries 100 --url http://localhost:8000/api/chat
```
