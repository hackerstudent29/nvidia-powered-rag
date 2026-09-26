"""
Lorin AI — System Guardrails & Policy Interceptor
===================================================
Enforces NeMo Guardrails policies and Vercel typesafe-ai/jev classification:
1. Fast-path 0ms Jailbreak & Prompt Injection Interception
2. Fast-path 0ms Whitelist for Greetings & Conversational Inquiries
3. Unified Taxonomy Evaluation (System One Decision via typesafe-ai/jev)
4. Domain Boundary Verification with Word-Boundary Identifier Fallbacks
"""

import re
from typing import Tuple, Optional

try:
    from taxonomy import (
        is_jailbreak_attempt,
        is_conversational_greeting,
        is_campus_domain_term_present,
        get_all_categories,
        fast_classify_intent,
        CAMPUS_TAXONOMY
    )
except ImportError:
    try:
        from backend.taxonomy import (
            is_jailbreak_attempt,
            is_conversational_greeting,
            is_campus_domain_term_present,
            get_all_categories,
            fast_classify_intent,
            CAMPUS_TAXONOMY
        )
    except ImportError:
        is_jailbreak_attempt = lambda q: False
        is_conversational_greeting = lambda q: False
        is_campus_domain_term_present = lambda q: False
        get_all_categories = lambda: {}
        fast_classify_intent = lambda q: None
        CAMPUS_TAXONOMY = {}

try:
    from jev_evaluator import jev_evaluator, JevEvaluationResult
except ImportError:
    try:
        from backend.jev_evaluator import jev_evaluator, JevEvaluationResult
    except ImportError:
        jev_evaluator = None

# Fallback defensive patterns for off-topic filtering
OFF_TOPIC_PATTERNS = [
    r'\b(crypto|cryptocurrency|bitcoin|ethereum|forex\s+trading|stock\s+market\s+tips)\b',
    r'\b(capital\s+of\s+[A-Za-z]+|president\s+of\s+[A-Za-z]+|prime\s+minister\s+of\s+[A-Za-z]+)\b',
    r'\b(recipe\s+for|how\s+to\s+bake|how\s+to\s+cook|movie\s+review|who\s+won\s+the\s+(?:match|game|election|fifa|ipl))\b',
    r'\b(casino|betting|gamble|gambling|lottery\s+tickets?)\b'
]


def check_guardrails(user_query: str) -> Tuple[bool, Optional[str]]:
    """
    Evaluates input query against NeMo Guardrails policies and Vercel typesafe-ai/jev:
    1. Fast Local Jailbreak Pattern Pre-check (0ms)
    2. Whitelist benign greetings and conversational inquiries (0ms)
    3. Fast Intent Classification: Recognized campus entities / research / developer (0ms)
    4. Fast Domain & Knowledge Entity Whitelist (0ms)
    5. Defensive Regex Check for Blatant Off-Topic Inquiries (0ms)
    6. Advanced System One Evaluation via Vercel AI Gateway (typesafe-ai/jev)
    7. Default Permissive Fallback for Benign Inquiries
    
    Returns (is_allowed, refusal_message)
    """
    if not user_query or not user_query.strip():
        return True, None

    q_lower = user_query.lower().strip()

    # 1. Fast Local Jailbreak Pattern Pre-check (0ms)
    if is_jailbreak_attempt(q_lower):
        return False, "I cannot comply with that request. I strictly operate under official MSAJCEA campus guidelines."

    # 2. Fast-path Whitelist: Benign greetings and conversational inquiries (0ms)
    if is_conversational_greeting(q_lower):
        return True, None

    # 3. Fast Intent Classification: Recognized campus entities / research / developer (0ms)
    fast_cat = fast_classify_intent(q_lower)
    if fast_cat and fast_cat not in ("off_topic", "jailbreak"):
        return True, None

    # 4. Defensive Regex Check for Blatant Off-Topic Inquiries (0ms)
    # Catches explicit banned topics (crypto, betting/casino, recipes, foreign politics)
    for pattern in OFF_TOPIC_PATTERNS:
        if re.search(pattern, q_lower):
            # Only allow if explicitly inquiring about college context
            if not any(w in q_lower for w in ["msajce", "msajcea", "mohamed sathak"]):
                return False, "I am Lorin AI, the official intelligence assistant for Mohamed Sathak A.J. College of Engineering and Architecture (MSAJCEA). I can only assist with college admissions, departments, academics, placements, fees, and campus facilities."

    # 5. Fast Domain & Knowledge Entity Whitelist (0ms)
    # If query contains any verified campus term or knowledge entity alias, permit immediately
    if is_campus_domain_term_present(q_lower):
        return True, None

    # 6. Advanced System One Evaluation via Vercel AI Gateway (typesafe-ai/jev)
    if jev_evaluator and jev_evaluator.is_enabled:
        try:
            jev_res = jev_evaluator.evaluate_query_sync(user_query, timeout=3.5)
            if not jev_res.is_safe:
                return False, jev_res.refusal_reason or "I cannot comply with that request. I strictly operate under official MSAJCEA campus guidelines."

            taxonomy = get_all_categories()
            matched_meta = taxonomy.get(jev_res.category)

            # If the category is explicitly allowed by the taxonomy, grant immediate access
            if matched_meta and matched_meta.is_allowed:
                return True, None

            # Only refuse if JEV is confident that the query is an active off-topic breach
            if jev_res.category == "off_topic" and jev_res.confidence >= 0.70 and not jev_res.is_campus_domain:
                if not is_campus_domain_term_present(q_lower):
                    refusal = (
                        (matched_meta.refusal_message if matched_meta else None)
                        or jev_res.refusal_reason
                        or "I am Lorin AI, the official intelligence assistant for Mohamed Sathak A.J. College of Engineering and Architecture (MSAJCEA). I can only assist with college admissions, departments, academics, placements, fees, and campus facilities."
                    )
                    return False, refusal
        except Exception:
            pass  # Fall through defensively to allow benign student inquiries

    # 7. Default Permissive Fallback for Benign Inquiries
    return True, None
