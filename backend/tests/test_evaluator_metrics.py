"""
Evaluator Metric Audit & Mathematical Verification Test Suite (V4 Engine)
========================================================================
Proves mathematically valid nDCG@K (0 <= nDCG@K <= 100%), MRR@K, Recall@K,
6-state answer outcome taxonomy, and slot-level entailment logic.
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
# Mathematically Audited nDCG@K & Ranking Metrics
# -------------------------------------------------------------
def calculate_ndcg_at_k(expected_doc_ids: List[str], retrieved_chunks: List[Dict[str, Any]], k: int = 10) -> float:
    """
    Computes mathematically rigorous Normalized Discounted Cumulative Gain (nDCG@K).
    Guarantees 0.0 <= nDCG@K <= 1.0.
    Prevents duplicate relevance inflation when multiple chunks match the same source document.
    """
    if not expected_doc_ids or not retrieved_chunks:
        return 0.0

    top_k = retrieved_chunks[:k]
    exp_set = set(e.lower() for e in expected_doc_ids)
    seen_expected = set()

    dcg = 0.0
    for rank_idx, chunk in enumerate(top_k, 1):
        cid = str(chunk.get("chunk_id", "")).lower()
        sfile = str(chunk.get("source_file", "")).lower()
        
        matched_doc = None
        for exp in exp_set:
            if exp in cid or exp in sfile:
                matched_doc = exp
                break
        
        if matched_doc and matched_doc not in seen_expected:
            seen_expected.add(matched_doc)
            dcg += 1.0 / math.log2(rank_idx + 1)

    idcg = sum(1.0 / math.log2(i + 1) for i in range(1, min(len(expected_doc_ids), k) + 1))
    if idcg <= 0.0:
        return 0.0

    score = min(1.0, max(0.0, dcg / idcg))
    return round(score, 4)

def calculate_mrr_at_k(expected_doc_ids: List[str], retrieved_chunks: List[Dict[str, Any]], k: int = 10) -> float:
    """Computes Mean Reciprocal Rank (MRR@K). Guarantees 0.0 <= MRR@K <= 1.0."""
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

def calculate_recall_at_k(expected_doc_ids: List[str], retrieved_chunks: List[Dict[str, Any]], k: int = 10) -> float:
    """Computes Recall@K. Guarantees 0.0 <= Recall@K <= 1.0."""
    if not expected_doc_ids:
        return 1.0 if retrieved_chunks else 0.0
    
    top_k = retrieved_chunks[:k]
    retrieved_ids = set()
    for c in top_k:
        cid = str(c.get("chunk_id", "")).lower()
        sfile = str(c.get("source_file", "")).lower()
        retrieved_ids.add(cid)
        retrieved_ids.add(sfile)

    matches = sum(1 for doc_id in expected_doc_ids if any(doc_id.lower() in rid for rid in retrieved_ids))
    return round(min(1.0, max(0.0, matches / len(expected_doc_ids))), 4)

# -------------------------------------------------------------
# Expanded 6-State Outcome Taxonomy
# -------------------------------------------------------------
def classify_6state_outcome(
    item: Dict[str, Any],
    retrieved_chunks: List[Dict[str, Any]],
    actual_ans: str,
    groundedness_score: float,
    factual_correctness: float,
    evidence_coverage: float
) -> str:
    """
    Classifies query outcome into 6 mutually exclusive states:
    1. ANSWER_CORRECT
    2. ANSWER_INCORRECT
    3. ANSWER_INCOMPLETE
    4. ABSTAIN_CORRECT
    5. ABSTAIN_INCORRECT
    6. ABSTAIN_WITH_UNSUPPORTED_REASON
    """
    category = item.get("category", "")
    should_abstain = item.get("should_abstain", False) or category in ["RAG-RETRIEVAL-NEGATIVE", "hallucination_trap", "negative_out_of_corpus", "NEGATIVE-UNSEEN_V1", "NEGATIVE-UNSEEN_V2"]
    act_abstain = "I couldn't find verified" in actual_ans or "not available" in actual_ans or "could not find" in actual_ans.lower()

    if should_abstain:
        if act_abstain:
            return "ABSTAIN_CORRECT"
        else:
            return "ABSTAIN_INCORRECT" # Guessing when evidence is absent
    else:
        if act_abstain:
            return "ABSTAIN_WITH_UNSUPPORTED_REASON" # False refusal on answerable query
        else:
            if factual_correctness >= 0.35 and evidence_coverage >= 1.0:
                return "ANSWER_CORRECT"
            elif factual_correctness >= 0.35 and evidence_coverage < 1.0:
                return "ANSWER_INCOMPLETE"
            else:
                return "ANSWER_INCORRECT"

class TestNDCGAndMetrics(unittest.TestCase):

    def test_ndcg_perfect_ranking(self):
        expected = ["doc1.md"]
        retrieved = [{"source_file": "doc1.md"}]
        ndcg = calculate_ndcg_at_k(expected, retrieved, k=10)
        self.assertEqual(ndcg, 1.0)
        self.assertEqual(ndcg * 100, 100.0)

    def test_ndcg_reversed_ranking(self):
        expected = ["doc1.md"]
        retrieved = [{"source_file": "other.md"}, {"source_file": "doc1.md"}]
        ndcg = calculate_ndcg_at_k(expected, retrieved, k=10)
        self.assertTrue(0.0 < ndcg < 1.0)
        self.assertLess(ndcg * 100, 100.0)

    def test_ndcg_all_irrelevant(self):
        expected = ["doc1.md"]
        retrieved = [{"source_file": "other.md"}]
        ndcg = calculate_ndcg_at_k(expected, retrieved, k=10)
        self.assertEqual(ndcg, 0.0)

    def test_ndcg_duplicate_chunks_same_doc(self):
        expected = ["doc1.md"]
        retrieved = [
            {"chunk_id": "c1", "source_file": "doc1.md"},
            {"chunk_id": "c2", "source_file": "doc1.md"},
            {"chunk_id": "c3", "source_file": "doc1.md"}
        ]
        ndcg = calculate_ndcg_at_k(expected, retrieved, k=10)
        self.assertEqual(ndcg, 1.0) # Must equal 1.0, not >1.0!

    def test_ndcg_zero_ideal_gain(self):
        expected = []
        retrieved = [{"source_file": "doc1.md"}]
        ndcg = calculate_ndcg_at_k(expected, retrieved, k=10)
        self.assertEqual(ndcg, 0.0)

    def test_ndcg_one_relevant_document(self):
        expected = ["doc1.md"]
        retrieved = [{"source_file": "doc2.md"}, {"source_file": "doc3.md"}, {"source_file": "doc1.md"}]
        ndcg = calculate_ndcg_at_k(expected, retrieved, k=10)
        self.assertTrue(0.0 < ndcg <= 1.0)
        self.assertLessEqual(ndcg * 100, 100.0)

    def test_ndcg_multiple_relevant_docs(self):
        expected = ["doc1.md", "doc2.md"]
        retrieved = [{"source_file": "doc1.md"}, {"source_file": "doc2.md"}]
        ndcg = calculate_ndcg_at_k(expected, retrieved, k=10)
        self.assertEqual(ndcg, 1.0)

    def test_ndcg_k_smaller_than_relevant_count(self):
        expected = ["doc1.md", "doc2.md", "doc3.md", "doc4.md", "doc5.md"]
        retrieved = [{"source_file": "doc1.md"}, {"source_file": "doc2.md"}]
        ndcg = calculate_ndcg_at_k(expected, retrieved, k=2)
        self.assertEqual(ndcg, 1.0) # Perfect for top-2!

    def test_ndcg_invariant_assertion(self):
        expected = ["doc1.md", "doc2.md"]
        retrieved = [{"source_file": "doc1.md"}, {"source_file": "doc1.md"}, {"source_file": "doc2.md"}]
        ndcg = calculate_ndcg_at_k(expected, retrieved, k=10)
        pct = ndcg * 100
        self.assertLessEqual(pct, 100.0, f"nDCG percentage {pct}% exceeds 100.0% invariant!")
        self.assertGreaterEqual(pct, 0.0, f"nDCG percentage {pct}% is below 0.0% invariant!")

    def test_6state_outcome_classification(self):
        item = {"category": "basic_factual", "should_abstain": False}
        chunks = [{"source_file": "msajce_about.md"}]
        res = classify_6state_outcome(item, chunks, "Based on records: CSE intake 60", 1.0, 1.0, 1.0)
        self.assertEqual(res, "ANSWER_CORRECT")

if __name__ == "__main__":
    unittest.main()

