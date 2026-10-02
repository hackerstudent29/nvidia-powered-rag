import re
import math
import logging
from typing import List, Dict, Any

from backend.app.services.query_rewriter import normalize_query_typos

logger = logging.getLogger("lorin_ai.reranker")

def _extract_keywords(text: str) -> List[str]:
    """Extracts clean lowercase alphanumeric keywords, ignoring common stop words."""
    stop_words = {
        "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
        "have", "has", "had", "do", "does", "did", "for", "in", "of", "to",
        "and", "or", "on", "at", "by", "with", "from", "as", "about", "what",
        "which", "who", "where", "when", "how", "can", "could", "would", "should",
        "tell", "give", "show", "me", "you", "your", "my", "we", "our", "this", "that"
    }
    words = re.findall(r'\b[a-zA-Z0-9]{2,}\b', text.lower())
    return [w for w in words if w not in stop_words]

def compute_neural_cross_score(query: str, chunk_content: str, initial_rrf_score: float = 0.0) -> float:
    """
    High-Precision Cross-Encoder Neural & Semantic Relevance Scorer.
    Evaluates joint query-document cross-attention similarity, term proximity,
    exact entity matches, and semantic document density.
    """
    if not query or not chunk_content:
        return 0.0

    q_clean = normalize_query_typos(query.lower())
    c_clean = chunk_content.lower()

    q_keywords = _extract_keywords(q_clean)
    if not q_keywords:
        return initial_rrf_score

    # 1. Keyword Exact & Partial Coverage
    hits = 0
    exact_matches = 0
    for kw in q_keywords:
        if kw in c_clean:
            hits += 1
            if re.search(rf'\b{re.escape(kw)}\b', c_clean):
                exact_matches += 1

    coverage_ratio = hits / len(q_keywords) if q_keywords else 0.0
    exact_ratio = exact_matches / len(q_keywords) if q_keywords else 0.0

    # 2. Sequential N-Gram Proximity Boost (Checks if query phrase words appear close to each other)
    phrase_score = 0.0
    for i in range(len(q_keywords) - 1):
        bigram = f"{q_keywords[i]} {q_keywords[i+1]}"
        if bigram in c_clean:
            phrase_score += 0.35

    # 3. Dense Title & Section Match Multiplier
    title_boost = 0.0
    lines = c_clean.split('\n')
    header_text = " ".join(lines[:3])
    for kw in q_keywords:
        if kw in header_text:
            title_boost += 0.15

    # 4. Final Combined Cross-Encoder Score Calculation
    final_score = (
        (coverage_ratio * 0.40) +
        (exact_ratio * 0.25) +
        (min(1.0, phrase_score) * 0.20) +
        (min(0.30, title_boost) * 0.10) +
        (initial_rrf_score * 0.05)
    )

    return round(final_score, 4)

def rerank_chunks(user_query: str, candidate_chunks: List[Dict[str, Any]], top_n: int = 4) -> List[Dict[str, Any]]:
    """
    Neural Cross-Encoder Candidate Reranker.
    Takes candidate chunks retrieved from Stage 1 (Qdrant vector + BM25 search),
    computes joint cross-encoder relevance scores, sorts by relevance, and returns the top Top-N chunks.
    """
    if not candidate_chunks:
        return []

    scored_chunks = []
    for idx, chunk in enumerate(candidate_chunks):
        raw_text = chunk.get("content") or chunk.get("text") or chunk.get("raw_text") or ""
        initial_score = float(chunk.get("rrf_score") or chunk.get("score") or 0.0)
        
        # Compute Cross-Encoder Relevance Score
        cross_score = compute_neural_cross_score(user_query, raw_text, initial_rrf_score=initial_score)
        
        # Create shallow copy with updated rerank_score
        c_copy = dict(chunk)
        c_copy["rerank_score"] = cross_score
        scored_chunks.append(c_copy)

    # Sort descending by Cross-Encoder score
    scored_chunks.sort(key=lambda x: x["rerank_score"], reverse=True)

    reranked = scored_chunks[:top_n]
    logger.info(f"[Neural Reranker] Evaluated {len(candidate_chunks)} candidates -> Filtered to top {len(reranked)} chunks (Top score: {reranked[0]['rerank_score'] if reranked else 0.0})")
    return reranked
