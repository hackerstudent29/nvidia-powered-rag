# 🏛️ Lorin AI — V4 Audited Confusion Matrix & RAG Groundedness Report
**Execution Timestamp**: `20261003_180522`

## 📌 Executive Summary
- **Total Questions Evaluated**: `790`
- **Overall System Accuracy**: `624/790 = 78.99%`
- **Average Claim Groundedness**: `99.11%`
- **Average Factual Correctness**: `48.48%`
- **Total Evaluation Time**: `243.82s` (Parallel Bounded Concurrency: 8 workers)

---

## 📈 Audited Retrieval Metrics Suite

| Retrieval Metric | Score (%) | Range / Invariant Standard |
| :--- | :---: | :--- |
| **Recall@1** | `37.93%` | `0% <= Recall@1 <= 100%` |
| **Recall@3** | `50.52%` | `0% <= Recall@3 <= 100%` |
| **Recall@5** | `54.83%` | `0% <= Recall@5 <= 100%` |
| **Recall@10** | `59.66%` | `0% <= Recall@10 <= 100%` |
| **Recall@20** | `60.0%` | `0% <= Recall@20 <= 100%` |
| **Recall@50** | `60.0%` | `0% <= Recall@50 <= 100%` |
| **MRR@10** | `45.29%` | `0% <= MRR@10 <= 100%` |
| **nDCG@10** | `48.76%` | `0% <= nDCG@10 <= 100% (Audited Deduplicated Gain)` |

---

## 📊 Binary Confusion Matrix & Abstention Scorecard

| Metric | Fraction (N / D) | Percentage (%) | Definition / Standard |
| :--- | :---: | :---: | :--- |
| **True Answers (TA)** | `429` | — | Passed answerable query |
| **False Refusals (FR)** | `151` | — | Failed answerable query due to refusal |
| **False Answers (FA)** | `210` | — | Failed unanswerable query due to hallucination |
| **True Abstentions (TAB)** | `0` | — | Passed unanswerable query |
| **Answer Precision** | `429/639` | `67.14%` | `TA / (TA + FA)` |
| **Answer Recall** | `429/580` | `73.97%` | `TA / (TA + FR)` |
| **Abstention Precision** | `0/151` | `0.0%` | `TAB / (TAB + FR)` |
| **Abstention Recall** | `0/210` | `0.0%` | `TAB / (TAB + FA)` |
| **False Refusal Rate** | `151/580` | `26.03%` | `FR / (TA + FR)` |
| **False Answer Rate** | `210/210` | `100.0%` | `FA / (TAB + FA)` |

---

## 🔬 Expanded 6-State User-Facing Answer Quality Taxonomy

| Outcome State | Occurrences | Fraction (N / D) | Description |
| :--- | :---: | :---: | :--- |
| **ANSWER_CORRECT** | `429` | `429/790` | Fully correct answer with complete evidence support |
| **ANSWER_INCORRECT** | `151` | `151/790` | Factual error or wrong claim synthesis |
| **ANSWER_INCOMPLETE** | `0` | `0/790` | Partial answer missing some required sub-claims |
| **ABSTAIN_CORRECT** | `195` | `195/790` | Unanswerable query correctly refused |
| **ABSTAIN_INCORRECT** | `15` | `15/790` | False answer on unanswerable query (hallucination) |
| **ABSTAIN_WITH_UNSUPPORTED_REASON** | `0` | `0/790` | Answerable query incorrectly refused (false refusal) |

---

## 🔬 Dataset Splits Performance

| Split Name | Questions | Passed | Failed | Accuracy (%) | Fraction (N / D) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Development Split (60%)** | `474` | `341` | `133` | `71.94%` | `341/474` |
| **Validation Split (20%)** | `158` | `140` | `18` | `88.61%` | `140/158` |
| **Held-Out Test Split (20%)** | `158` | `143` | `15` | `90.51%` | `143/158` |

---

## ⚡ Latency Breakdown (Percentiles)
- **P50 Latency**: `2088.55 ms`
- **P75 Latency**: `2416.43 ms`
- **P90 Latency**: `4103.31 ms`
- **P95 Latency**: `5614.72 ms`
- **P99 Latency**: `7591.66 ms`

---

## 📊 Category Performance Breakdown

| Category | Total Questions | Passed | Failed | Accuracy (%) | Fraction (N / D) | P50 Latency (ms) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `NEGATIVE-UNSEEN_V1` | 40 | 35 | 5 | `87.5%` | `35/40` | `1845.04 ms` |
| `NEGATIVE-UNSEEN_V2` | 40 | 37 | 3 | `92.5%` | `37/40` | `1892.93 ms` |
| `RAG-RETRIEVAL-NEGATIVE` | 40 | 33 | 7 | `82.5%` | `33/40` | `1987.82 ms` |
| `acronym` | 45 | 32 | 13 | `71.11%` | `32/45` | `1806.23 ms` |
| `adversarial` | 45 | 45 | 0 | `100.0%` | `45/45` | `1939.46 ms` |
| `ambiguous` | 30 | 15 | 15 | `50.0%` | `15/30` | `2032.65 ms` |
| `basic_factual` | 65 | 47 | 18 | `72.31%` | `47/65` | `2259.62 ms` |
| `comparison` | 30 | 25 | 5 | `83.33%` | `25/30` | `5014.08 ms` |
| `entity_resolution` | 35 | 30 | 5 | `85.71%` | `30/35` | `2099.1 ms` |
| `follow_up` | 30 | 19 | 11 | `63.33%` | `19/30` | `2143.57 ms` |
| `hallucination_trap` | 45 | 45 | 0 | `100.0%` | `45/45` | `2118.03 ms` |
| `list` | 30 | 17 | 13 | `56.67%` | `17/30` | `6085.36 ms` |
| `multi_hop` | 45 | 27 | 18 | `60.0%` | `27/45` | `5113.98 ms` |
| `negative_out_of_corpus` | 45 | 45 | 0 | `100.0%` | `45/45` | `1842.56 ms` |
| `numerical` | 35 | 29 | 6 | `82.86%` | `29/35` | `2290.56 ms` |
| `paraphrase` | 55 | 33 | 22 | `60.0%` | `33/55` | `2115.0 ms` |
| `tables` | 55 | 41 | 14 | `74.55%` | `41/55` | `2154.77 ms` |
| `transport` | 45 | 41 | 4 | `91.11%` | `41/45` | `2065.36 ms` |
| `typos` | 35 | 28 | 7 | `80.0%` | `28/35` | `2243.54 ms` |

---

## 🔍 Root-Cause Failure Taxonomy (A-I Diagnostic Triage)

| Failure Diagnosis Code | Occurrences | Description |
| :--- | :---: | :--- |
| `NONE` | 151 | Evaluated failure stage category |
| `F_RELATED_BUT_NON_ENTAILING` | 15 | Evaluated failure stage category |

---

## 🏆 Audited Retrieval Ablation Leaderboard (Before vs After Reranking)

| Configuration | Recall@1 (%) | Recall@10 (%) | MRR@10 (%) | nDCG@10 (%) | Top1 Acc (%) | Top3 Acc (%) | Eval Time (s) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `A_Dense_Only` | `45.0%` | `77.5%` | `53.04%` | `58.65%` | `45.0%` | `57.5%` | `62.77s` |
| `B_BM25_Only` | `45.0%` | `80.0%` | `54.56%` | `60.47%` | `45.0%` | `60.0%` | `62.29s` |
| `C_Dense_Plus_BM25` | `67.5%` | `85.0%` | `72.34%` | `75.29%` | `67.5%` | `75.0%` | `61.97s` |
| `D_Dense_BM25_RRF` | `67.5%` | `85.0%` | `72.34%` | `75.29%` | `67.5%` | `75.0%` | `59.86s` |
| `E_Dense_BM25_RRF_Reranker` | `67.5%` | `85.0%` | `72.34%` | `75.29%` | `67.5%` | `75.0%` | `59.57s` |
| `F_Full_Entity_Structured` | `67.5%` | `85.0%` | `72.34%` | `75.29%` | `67.5%` | `75.0%` | `56.98s` |
| `G_Full_Production_System` | `67.5%` | `85.0%` | `72.34%` | `75.29%` | `67.5%` | `75.0%` | `61.85s` |

---

## 🏆 Final System Readiness Verdict
**STATUS**: `ENGINEERING IN PROGRESS — FAIL FOR PRODUCTION GATE`

Executed against the live Lorin AI backend pipeline.
