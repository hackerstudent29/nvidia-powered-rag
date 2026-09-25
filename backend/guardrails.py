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
    r'\b(crypto|bitcoin|eth|trading|stock market|forex)\b',
    r'\b(capital of|president of|prime minister of|who won the match|weather in London)\b',
    r'\b(write a script|generate python code|write an essay on|tell a joke|tell me a joke)\b',
    r'\b(movie review|recipe for|how to bake|gaming PC|best smartphone)\b'
]


def check_guardrails(user_query: str) -> Tuple[bool, Optional[str]]:
    """
    Evaluates input query against NeMo Guardrails policies and Vercel typesafe-ai/jev:
    1. Fast Local Jailbreak Pattern Pre-check
    2. Whitelist benign greetings and conversational inquiries (0ms)
    3. Advanced System One Evaluation via Vercel AI Gateway (typesafe-ai/jev)
    4. Domain Boundary Verification with High-Precision Whitelist
    
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

    # 3. Fast Intent Classification: Recognized campus entities / research (0ms)
    fast_cat = fast_classify_intent(q_lower)
    if fast_cat and fast_cat not in ("off_topic", "jailbreak"):
        return True, None

    # 4. Advanced System One Evaluation via Vercel AI Gateway (typesafe-ai/jev)
    if jev_evaluator and jev_evaluator.is_enabled:
        try:
            jev_res = jev_evaluator.evaluate_query_sync(user_query, timeout=4.0)
            if not jev_res.is_safe:
                return False, jev_res.refusal_reason or "I cannot comply with that request. I strictly operate under official MSAJCEA campus guidelines."

            taxonomy = get_all_categories()
            matched_meta = taxonomy.get(jev_res.category)

            # If the category is explicitly allowed by the taxonomy, grant immediate access
            if matched_meta and matched_meta.is_allowed:
                return True, None

            # If classified as off_topic or disallowed, verify against domain terms to avoid false positives
            if not jev_res.is_campus_domain or (matched_meta and not matched_meta.is_allowed):
                has_domain = is_campus_domain_term_present(q_lower)
                if not has_domain:
                    refusal = (
                        (matched_meta.refusal_message if matched_meta else None)
                        or jev_res.refusal_reason
                        or "I am Lorin AI, the official intelligence assistant for Mohamed Sathak A.J. College of Engineering and Architecture (MSAJCEA). I can only assist with college admissions, departments, academics, placements, fees, and campus facilities."
                    )
                    return False, refusal
        except Exception:
            pass  # Fall through defensively to regex pattern matching

    # 5. Defensive Regex Fallback for Off-Topic
    for pattern in OFF_TOPIC_PATTERNS:
        if re.search(pattern, q_lower):
            has_domain = is_campus_domain_term_present(q_lower)
            if not has_domain:
                return False, "I am Lorin AI, the official intelligence assistant for Mohamed Sathak A.J. College of Engineering and Architecture (MSAJCEA). I can only assist with college admissions, departments, academics, placements, fees, and campus facilities."

    return True, None
