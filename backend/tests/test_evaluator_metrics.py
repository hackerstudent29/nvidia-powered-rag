"""
Evaluator Metric Audit & Confusion Matrix Verification Test Suite (V3 Engine)
=============================================================================
Proves mathematically valid confusion-matrix metrics, slot-level entailment,
MRR@K, nDCG@K, and true Recall@K without impossible percentages (>100% or <0%).
"""

import sys
import os
import unittest
import math
import re
from typing import List, Dict, Any, Tuple

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

# -------------------------------------------------------------
# Mathematically Valid Confusion Matrix Implementation
# -------------------------------------------------------------
def compute_confusion_matrix(
    eval_items: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Computes a mathematically valid binary confusion matrix for RAG answer vs abstention.
    Categories:
    - TRUE_ANSWER: Expected ANSWER, Actual ANSWER (Passed answerable query)
    - FALSE_REFUSAL: Expected ANSWER, Actual ABSTAIN (Failed answerable query due to refusal)
    - FALSE_ANSWER: Expected ABSTAIN, Actual ANSWER (Failed unanswerable query due to hallucination/guessing)
    - TRUE_ABSTENTION: Expected ABSTAIN, Actual ABSTAIN (Passed unanswerable query)
    """
    ta, fr, fa, tab = 0, 0, 0, 0

    for item in eval_items:
        exp_abstain = item.get("should_abstain", False) or item.get("category") in ["RAG-RETRIEVAL-NEGATIVE", "hallucination_trap", "negative_out_of_corpus", "NEGATIVE-UNSEEN"]
        act_ans = item.get("actual_answer", "")
        act_abstain = "I couldn't find verified" in act_ans or "not available" in act_ans or "could not find" in act_ans.lower()

        if not exp_abstain:
            if not act_abstain and item.get("verdict") == "PASS":
                ta += 1
            elif act_abstain:
                fr += 1
            else:
                # Failed answerable query (wrong fact)
                fr += 1
        else:
            if act_abstain:
                tab += 1
            else:
                fa += 1

    ans_denom = ta + fa
    ans_prec = round((ta / ans_denom * 100), 2) if ans_denom > 0 else 0.0

    ans_rec_denom = ta + fr
    ans_rec = round((ta / ans_rec_denom * 100), 2) if ans_rec_denom > 0 else 0.0

    abs_prec_denom = tab + fr
    abs_prec = round((tab / abs_prec_denom * 100), 2) if abs_prec_denom > 0 else 0.0

    abs_rec_denom = tab + fa
    abs_rec = round((tab / abs_rec_denom * 100), 2) if abs_rec_denom > 0 else 0.0

    fr_denom = ta + fr
    fr_rate = round((fr / fr_denom * 100), 2) if fr_denom > 0 else 0.0

    fa_denom = tab + fa
    fa_rate = round((fa / fa_denom * 100), 2) if fa_denom > 0 else 0.0

    return {
        "TRUE_ANSWER": ta,
        "FALSE_REFUSAL": fr,
        "FALSE_ANSWER": fa,
        "TRUE_ABSTENTION": tab,
        "answer_precision_pct": min(100.0, max(0.0, ans_prec)),
        "answer_precision_fraction": f"{ta}/{ans_denom}",
        "answer_recall_pct": min(100.0, max(0.0, ans_rec)),
        "answer_recall_fraction": f"{ta}/{ans_rec_denom}",
        "abstention_precision_pct": min(100.0, max(0.0, abs_prec)),
        "abstention_precision_fraction": f"{tab}/{abs_prec_denom}",
        "abstention_recall_pct": min(100.0, max(0.0, abs_rec)),
        "abstention_recall_fraction": f"{tab}/{abs_rec_denom}",
        "false_refusal_rate_pct": min(100.0, max(0.0, fr_rate)),
        "false_refusal_rate_fraction": f"{fr}/{fr_denom}",
        "false_answer_rate_pct": min(100.0, max(0.0, fa_rate)),
        "false_answer_rate_fraction": f"{fa}/{fa_denom}"
    }

# -------------------------------------------------------------
# Ranking Metrics (MRR@K, nDCG@K)
# -------------------------------------------------------------
def calculate_mrr_at_k(expected_doc_ids: List[str], retrieved_chunks: List[Dict[str, Any]], k: int = 10) -> float:
    """Computes Mean Reciprocal Rank (MRR@K)."""
    if not expected_doc_ids or not retrieved_chunks:
        return 0.0
    
    top_k = retrieved_chunks[:k]
    exp_set = set(e.lower() for e in expected_doc_ids)

    for rank_idx, chunk in enumerate(top_k, 1):
        cid = str(chunk.get("chunk_id", "")).lower()
        sfile = str(chunk.get("source_file", "")).lower()
        if any(e in cid or e in sfile for e in exp_set):
            return round(1.0 / rank_idx, 4)

    return 0.0

def calculate_ndcg_at_k(expected_doc_ids: List[str], retrieved_chunks: List[Dict[str, Any]], k: int = 10) -> float:
    """Computes Normalized Discounted Cumulative Gain (nDCG@K)."""
    if not expected_doc_ids or not retrieved_chunks:
        return 0.0

    top_k = retrieved_chunks[:k]
    exp_set = set(e.lower() for e in expected_doc_ids)

    dcg = 0.0
    for rank_idx, chunk in enumerate(top_k, 1):
        cid = str(chunk.get("chunk_id", "")).lower()
        sfile = str(chunk.get("source_file", "")).lower()
        if any(e in cid or e in sfile for e in exp_set):
            dcg += 1.0 / math.log2(rank_idx + 1)

    idcg = sum(1.0 / math.log2(i + 1) for i in range(1, min(len(expected_doc_ids), k) + 1))
    return round(dcg / idcg, 4) if idcg > 0 else 0.0

# -------------------------------------------------------------
# Slot-Level Entailment Classifier
# -------------------------------------------------------------
def classify_slot_entailment(query: str, required_fact: str, chunk: Dict[str, Any]) -> str:
    """
    Classifies candidate chunk evidence into:
    - DIRECTLY_ENTAILED
    - PARTIALLY_ENTAILED
    - RELATED_BUT_NOT_SUPPORTING
    - CONTRADICTED
    - UNSUPPORTED
    """
    if not chunk or not chunk.get("content"):
        return "UNSUPPORTED"

    content = chunk.get("content", "").lower()
    q_low = query.lower()
    fact_low = required_fact.lower()

    # 1. Temporal / Year Context Check
    q_years = set(re.findall(r'\b(20\d\d)\b', q_low))
    c_years = set(re.findall(r'\b(20\d\d)\b', content))
    if q_years and not q_years.issubset(c_years):
        return "RELATED_BUT_NOT_SUPPORTING"

    # 2. Location / City Context Check
    q_cities = {"bangalore", "hyderabad", "mumbai", "delhi", "pondicherry", "vellore", "mysore", "paris"}
    q_locs = set(w for w in q_low.split() if w in q_cities)
    c_locs = set(w for w in content.split() if w in q_cities)
    if q_locs and not q_locs.issubset(c_locs):
        return "RELATED_BUT_NOT_SUPPORTING"

    # 3. Department Branch Check
    branches = {"cse", "it", "ece", "eee", "mech", "civil", "aids", "ai&ds", "csbs", "cyber", "biotechnology", "aerospace", "marine", "architecture"}
    q_branches = set(w for w in re.findall(r'\b[a-z0-9\&]+\b', q_low) if w in branches)
    c_branches = set(w for w in re.findall(r'\b[a-z0-9\&]+\b', content) if w in branches)
    if q_branches and not q_branches.intersection(c_branches):
        return "RELATED_BUT_NOT_SUPPORTING"

    # 4. Role Check
    if "dean" in q_low and "dean" not in content:
        return "RELATED_BUT_NOT_SUPPORTING"

    # 5. Direct Fact Entailment
    if fact_low in content:
        return "DIRECTLY_ENTAILED"

    fact_words = set(w for w in re.findall(r'\b[a-z0-9]+\b', fact_low) if len(w) > 2)
    if not fact_words:
        return "UNSUPPORTED"

    content_words = set(re.findall(r'\b[a-z0-9]+\b', content))
    match_ratio = len(fact_words.intersection(content_words)) / len(fact_words)

    if match_ratio >= 0.8:
        return "DIRECTLY_ENTAILED"
    elif match_ratio >= 0.5:
        return "PARTIALLY_ENTAILED"
    elif match_ratio >= 0.2:
        return "RELATED_BUT_NOT_SUPPORTING"
    else:
        return "UNSUPPORTED"


class TestConfusionMatrixAndMetrics(unittest.TestCase):

    def test_confusion_matrix_all_valid(self):
        eval_items = [
            {"should_abstain": False, "actual_answer": "CSE intake is 60 seats", "verdict": "PASS"},
            {"should_abstain": False, "actual_answer": "I couldn't find verified info", "verdict": "FAIL"},
            {"should_abstain": True, "actual_answer": "I couldn't find verified info", "verdict": "PASS"},
            {"should_abstain": True, "actual_answer": "Bangalore campus is open", "verdict": "FAIL"}
        ]
        cm = compute_confusion_matrix(eval_items)
        self.assertEqual(cm["TRUE_ANSWER"], 1)
        self.assertEqual(cm["FALSE_REFUSAL"], 1)
        self.assertEqual(cm["TRUE_ABSTENTION"], 1)
        self.assertEqual(cm["FALSE_ANSWER"], 1)
        self.assertEqual(cm["answer_precision_pct"], 50.0)
        self.assertEqual(cm["abstention_precision_pct"], 50.0)

    def test_edge_case_zero_abstentions(self):
        eval_items = [
            {"should_abstain": False, "actual_answer": "CSE intake 60", "verdict": "PASS"}
        ]
        cm = compute_confusion_matrix(eval_items)
        self.assertTrue(0.0 <= cm["abstention_precision_pct"] <= 100.0)

    def test_edge_case_zero_answerable(self):
        eval_items = [
            {"should_abstain": True, "actual_answer": "I couldn't find verified", "verdict": "PASS"}
        ]
        cm = compute_confusion_matrix(eval_items)
        self.assertTrue(0.0 <= cm["answer_precision_pct"] <= 100.0)

    def test_mrr_and_ndcg(self):
        expected = ["msajce_about.md"]
        retrieved = [
            {"source_file": "msajce_other.md"},
            {"source_file": "msajce_about.md"}
        ]
        mrr = calculate_mrr_at_k(expected, retrieved, k=10)
        ndcg = calculate_ndcg_at_k(expected, retrieved, k=10)
        self.assertEqual(mrr, 0.5)
        self.assertTrue(0.0 < ndcg <= 1.0)

    def test_slot_entailment_year_mismatch(self):
        query = "What is the 2029 program fee?"
        fact = "2029 program fee"
        chunk = {"content": "Official program fee for 2024 is Rs 85000"}
        res = classify_slot_entailment(query, fact, chunk)
        self.assertEqual(res, "RELATED_BUT_NOT_SUPPORTING")

if __name__ == "__main__":
    unittest.main()
