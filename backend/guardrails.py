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

# Standard official refusal message
CAMPUS_REFUSAL_MESSAGE = (
    "I am Lorin AI, the official campus assistant for Mohamed Sathak A.J. College of Engineering (MSAJCE). "
    "I am exclusively designed to assist with MSAJCE admissions, academic departments, degree programs, "
    "placements, fee structures, bus routes, hostels, and campus facilities. "
    "Please let me know if you have any questions about MSAJCE!"
)

# Comprehensive defensive patterns for off-topic filtering
OFF_TOPIC_PATTERNS = [
    # 1. Arbitrary Code Generation, Scripting & Programming Help
    r'\b(?:write|give|generate|create|provide|show|build|debug|fix|explain)\s+(?:me\s+)?(?:a\s+|the\s+|some\s+)?(?:code|program|script|html|css|javascript|js|python|java|c\+\+|cpp|c#|sql|php|react|typescript|algorithm|function|class|loop)\b',
    r'\b(?:html|python|java|c\+\+|cpp|javascript|js|css|sql|php|react)\s+code\b',
    r'\b(?:html\s+file|html\s+tags?|header\s+sizes?|h1\s+to\s+h6|<h[1-6]>|<!doctype\s+html>)\b',
    r'\b(?:how\s+to\s+(?:code|program|build\s+a\s+website|write\s+a\s+script))\b',
    r'\b(?:write\s+(?:a\s+)?(?:function|class|loop|algorithm|regex|query|component|file|header\s+size))\b',
    
    # 2. Math / Physics / Chemistry / Homework Problem Solving
    r'\b(?:solve|calculate|evaluate|simplify|differentiate|integrate)\s+(?:this\s+)?(?:math|physics|chemistry|equation|integral|derivative|problem|expression|\d+[\+\-\*\/\^])\b',
    r'\b(?:square\s+root\s+of|derivative\s+of|integral\s+of|value\s+of\s+pi)\b',
    
    # 3. Creative Writing, Essays, Poems, Jokes & Stories Unrelated to MSAJCE
    r'\b(?:write|compose|generate)\s+(?:me\s+)?(?:an?\s+)?(?:essay|poem|poetry|story|lyrics|song|letter|speech|script|joke)\s+(?:about|on|for)\b',
    
    # 4. Cooking, Food Recipes & Diets
    r'\b(?:recipe\s+(?:for|of)|how\s+to\s+(?:cook|bake|make|prepare)\s+(?:cake|pizza|biryani|burger|pasta|tea|coffee|curry|soup|cookie|bread|chicken|paneer|food)|diet\s+plan)\b',
    
    # 5. World Politics, Foreign Leaders & Trivia
    r'\b(?:capital\s+of|president\s+of|prime\s+minister\s+of|governor\s+of|weather\s+in|population\s+of|currency\s+of|who\s+rules)\s+[A-Za-z]+',
    
    # 6. Pop Culture, Movies & External Sports
    r'\b(?:who\s+won\s+the\s+(?:ipl|fifa|world\s+cup|match|game|super\s+bowl|oscar|election)|movie\s+review|box\s+office|celebrity\s+news|release\s+date\s+of\s+movie)\b',
    
    # 7. Financial Trading, Crypto & Gambling
    r'\b(crypto|cryptocurrency|bitcoin|ethereum|forex\s+trading|stock\s+market\s+tips|casino|betting|gamble|gambling|lottery\s+tickets?)\b'
]


def check_guardrails(user_query: str) -> Tuple[bool, Optional[str]]:
    """
    Evaluates input query against NeMo Guardrails policies and Vercel typesafe-ai/jev:
    1. Fast Local Jailbreak Pattern Pre-check (0ms)
    2. Whitelist benign greetings and conversational inquiries (0ms)
    3. Fast Intent Classification: Recognized campus entities / research / developer (0ms)
    4. Defensive Regex Check for Blatant Off-Topic Inquiries (0ms)
    5. Fast Domain & Knowledge Entity Whitelist (0ms)
    6. Advanced System One Evaluation via Vercel AI Gateway (typesafe-ai/jev)
    7. Default Permissive Fallback for Benign Inquiries
    
    Returns (is_allowed, refusal_message)
    """
    if not user_query or not user_query.strip():
        return True, None

    q_lower = user_query.lower().strip()

    # 1. Fast Local Jailbreak Pattern Pre-check (0ms)
    if is_jailbreak_attempt(q_lower):
        return False, "I cannot comply with that request. I strictly operate under official MSAJCE campus guidelines."

    # 2. Fast-path Whitelist: Benign greetings and conversational inquiries (0ms)
    if is_conversational_greeting(q_lower):
        return True, None

    # 3. Fast Intent Classification: Recognized campus entities / research / developer (0ms)
    fast_cat = fast_classify_intent(q_lower)
    if fast_cat and fast_cat not in ("off_topic", "jailbreak"):
        return True, None

    # 4. Defensive Regex Check for Blatant Off-Topic Inquiries (0ms)
    # Catches explicit banned topics (code writing, math, essays, recipes, crypto, trivia, politics)
    for pattern in OFF_TOPIC_PATTERNS:
        if re.search(pattern, q_lower):
            # Only allow if explicitly inquiring about college context / curriculum / admissions
            if not any(w in q_lower for w in ["msajce", "mohamed sathak", "sathak", "tnea", "syllabus", "curriculum", "course", "courses", "department", "degree"]):
                return False, CAMPUS_REFUSAL_MESSAGE

    # 5. Fast Domain & Knowledge Entity Whitelist (0ms)
    # If query contains any verified campus term or knowledge entity alias, permit immediately
    if is_campus_domain_term_present(q_lower):
        return True, None

    # 6. Advanced System One Evaluation via Vercel AI Gateway (typesafe-ai/jev)
    if jev_evaluator and jev_evaluator.is_enabled:
        try:
            jev_res = jev_evaluator.evaluate_query_sync(user_query, timeout=3.5)
            if not jev_res.is_safe:
                return False, jev_res.refusal_reason or CAMPUS_REFUSAL_MESSAGE

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
                        or CAMPUS_REFUSAL_MESSAGE
                    )
                    return False, refusal
        except Exception:
            pass  # Fall through defensively to allow benign student inquiries

    # 7. Default Permissive Fallback for Benign Inquiries
    return True, None
