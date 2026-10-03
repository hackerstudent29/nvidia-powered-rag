# 🏛️ Lorin AI — V4 Audited Confusion Matrix & RAG Groundedness Report
**Execution Timestamp**: `20261003_190702`

## 📌 Executive Summary
- **Total Questions Evaluated**: `790`
- **Overall System Accuracy**: `646/790 = 81.77%`
- **Average Claim Groundedness**: `98.99%`
- **Average Factual Correctness**: `48.05%`
- **Total Evaluation Time**: `361.15s` (Parallel Bounded Concurrency: 8 workers)

---

## 📈 Audited Retrieval Metrics Suite

| Retrieval Metric | Score (%) | Range / Invariant Standard |
| :--- | :---: | :--- |
| **Recall@1** | `37.59%` | `0% <= Recall@1 <= 100%` |
| **Recall@3** | `51.9%` | `0% <= Recall@3 <= 100%` |
| **Recall@5** | `57.59%` | `0% <= Recall@5 <= 100%` |
| **Recall@10** | `62.24%` | `0% <= Recall@10 <= 100%` |
| **Recall@20** | `62.24%` | `0% <= Recall@20 <= 100%` |
| **Recall@50** | `62.24%` | `0% <= Recall@50 <= 100%` |
| **MRR@10** | `45.81%` | `0% <= MRR@10 <= 100%` |
| **nDCG@10** | `49.79%` | `0% <= nDCG@10 <= 100% (Audited Deduplicated Gain)` |

---

## 📊 Binary Confusion Matrix & Abstention Scorecard

| Metric | Fraction (N / D) | Percentage (%) | Definition / Standard |
| :--- | :---: | :---: | :--- |
| **True Answers (TA)** | `436` | — | Passed answerable query |
| **False Refusals (FR)** | `144` | — | Failed answerable query due to refusal |
| **False Answers (FA)** | `210` | — | Failed unanswerable query due to hallucination |
| **True Abstentions (TAB)** | `0` | — | Passed unanswerable query |
| **Answer Precision** | `436/646` | `67.49%` | `TA / (TA + FA)` |
| **Answer Recall** | `436/580` | `75.17%` | `TA / (TA + FR)` |
| **Abstention Precision** | `0/144` | `0.0%` | `TAB / (TAB + FR)` |
| **Abstention Recall** | `0/210` | `0.0%` | `TAB / (TAB + FA)` |
| **False Refusal Rate** | `144/580` | `24.83%` | `FR / (TA + FR)` |
| **False Answer Rate** | `210/210` | `100.0%` | `FA / (TAB + FA)` |

---

## 🔬 Expanded 6-State User-Facing Answer Quality Taxonomy

| Outcome State | Occurrences | Fraction (N / D) | Description |
| :--- | :---: | :---: | :--- |
| **ANSWER_CORRECT** | `436` | `436/790` | Fully correct answer with complete evidence support |
| **ANSWER_INCORRECT** | `142` | `142/790` | Factual error or wrong claim synthesis |
| **ANSWER_INCOMPLETE** | `0` | `0/790` | Partial answer missing some required sub-claims |
| **ABSTAIN_CORRECT** | `210` | `210/790` | Unanswerable query correctly refused |
| **ABSTAIN_INCORRECT** | `0` | `0/790` | False answer on unanswerable query (hallucination) |
| **ABSTAIN_WITH_UNSUPPORTED_REASON** | `2` | `2/790` | Answerable query incorrectly refused (false refusal) |

---

## 🔬 Dataset Splits Performance

| Split Name | Questions | Passed | Failed | Accuracy (%) | Fraction (N / D) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Development Split (60%)** | `474` | `348` | `126` | `73.42%` | `348/474` |
| **Validation Split (20%)** | `158` | `140` | `18` | `88.61%` | `140/158` |
| **Held-Out Test Split (20%)** | `158` | `158` | `0` | `100.0%` | `158/158` |

---

## ⚡ Latency Breakdown (Percentiles)
- **P50 Latency**: `2306.22 ms`
- **P75 Latency**: `5180.13 ms`
- **P90 Latency**: `7493.95 ms`
- **P95 Latency**: `8741.79 ms`
- **P99 Latency**: `11118.84 ms`

---

## 📊 Category Performance Breakdown

| Category | Total Questions | Passed | Failed | Accuracy (%) | Fraction (N / D) | P50 Latency (ms) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `NEGATIVE-UNSEEN_V1` | 40 | 40 | 0 | `100.0%` | `40/40` | `6795.51 ms` |
| `NEGATIVE-UNSEEN_V2` | 40 | 40 | 0 | `100.0%` | `40/40` | `6840.94 ms` |
| `RAG-RETRIEVAL-NEGATIVE` | 40 | 40 | 0 | `100.0%` | `40/40` | `7493.95 ms` |
| `acronym` | 45 | 31 | 14 | `68.89%` | `31/45` | `1628.7 ms` |
| `adversarial` | 45 | 45 | 0 | `100.0%` | `45/45` | `6214.33 ms` |
| `ambiguous` | 30 | 15 | 15 | `50.0%` | `15/30` | `2131.49 ms` |
| `basic_factual` | 65 | 47 | 18 | `72.31%` | `47/65` | `2225.99 ms` |
| `comparison` | 30 | 26 | 4 | `86.67%` | `26/30` | `4614.33 ms` |
| `entity_resolution` | 35 | 28 | 7 | `80.0%` | `28/35` | `1833.76 ms` |
| `follow_up` | 30 | 19 | 11 | `63.33%` | `19/30` | `2075.16 ms` |
| `hallucination_trap` | 45 | 45 | 0 | `100.0%` | `45/45` | `4311.39 ms` |
| `list` | 30 | 19 | 11 | `63.33%` | `19/30` | `5237.25 ms` |
| `multi_hop` | 45 | 31 | 14 | `68.89%` | `31/45` | `5566.46 ms` |
| `negative_out_of_corpus` | 45 | 45 | 0 | `100.0%` | `45/45` | `2152.12 ms` |
| `numerical` | 35 | 29 | 6 | `82.86%` | `29/35` | `1891.85 ms` |
| `paraphrase` | 55 | 35 | 20 | `63.64%` | `35/55` | `1961.82 ms` |
| `tables` | 55 | 42 | 13 | `76.36%` | `42/55` | `2264.26 ms` |
| `transport` | 45 | 41 | 4 | `91.11%` | `41/45` | `2067.24 ms` |
| `typos` | 35 | 28 | 7 | `80.0%` | `28/35` | `1830.2 ms` |

---

## 🔍 Root-Cause Failure Taxonomy (A-I Diagnostic Triage)

| Failure Diagnosis Code | Occurrences | Description |
| :--- | :---: | :--- |
| `NONE` | 142 | Evaluated failure stage category |
| `C_SYNTHESIS_WRONG` | 1 | Evaluated failure stage category |
| `A_EVIDENCE_ABSENT_FROM_CANDIDATE_POOL` | 1 | Evaluated failure stage category |

---

## 🏆 Audited Retrieval Ablation Leaderboard (Before vs After Reranking)

| Configuration | Recall@1 (%) | Recall@10 (%) | MRR@10 (%) | nDCG@10 (%) | Top1 Acc (%) | Top3 Acc (%) | Eval Time (s) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `A_Dense_Only` | `45.0%` | `77.5%` | `53.04%` | `58.65%` | `45.0%` | `57.5%` | `66.58s` |
| `B_BM25_Only` | `45.0%` | `80.0%` | `54.56%` | `60.47%` | `45.0%` | `60.0%` | `65.5s` |
| `C_Dense_Plus_BM25` | `67.5%` | `85.0%` | `72.34%` | `75.29%` | `67.5%` | `75.0%` | `64.17s` |
| `D_Dense_BM25_RRF` | `67.5%` | `85.0%` | `72.34%` | `75.29%` | `67.5%` | `75.0%` | `61.85s` |
| `E_Dense_BM25_RRF_Reranker` | `67.5%` | `85.0%` | `72.34%` | `75.29%` | `67.5%` | `75.0%` | `64.27s` |
| `F_Full_Entity_Structured` | `67.5%` | `85.0%` | `72.34%` | `75.29%` | `67.5%` | `75.0%` | `66.79s` |
| `G_Full_Production_System` | `67.5%` | `85.0%` | `72.34%` | `75.29%` | `67.5%` | `75.0%` | `67.29s` |

---

## 🏆 Final System Readiness Verdict
**STATUS**: `ENGINEERING IN PROGRESS — FAIL FOR PRODUCTION GATE`

Executed against the live Lorin AI backend pipeline.
