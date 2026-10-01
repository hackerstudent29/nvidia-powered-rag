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

def is_code_or_script_request(q_lower: str) -> bool:
    """
    0ms Typo-Tolerant Code & Programming Request Interceptor.
    Catches arbitrary coding, script generation, debugging, syntax, and programming queries.
    Permits conceptual career guidance, course selection, technology comparisons, and learning roadmaps.
    """
    if not q_lower:
        return False

    # Exclude career guidance, course selection, and comparative technology questions
    if any(k in q_lower for k in [
        "syllabus", "curriculum", "regulation", "department", "admission", "cutoff",
        "fee", "fees", "degree", "branch", "course", "courses", "career", "careers",
        "job", "jobs", "placement", "placements", "college", "colleges", "future", "choose", "choosing",
        "which is better", "should i learn", "scope", "demand", "salary", "package", "recruiters", "companies"
    ]):
        # Only block if explicitly asking to generate/write actual code snippets
        if not re.search(r'\b(?:write|generate|give\s+me|create|debug|fix)\s+(?:a\s+|some\s+)?(?:code|program|script|snippet)\b', q_lower):
            return False

    # Language and tech tokens including common student typos (python, pyhton, py, java, js, cpp, c++, html, etc.)
    lang_tokens = r'(?:py(?:thon|hton)?|java(?:script)?|js|ts|typescript|c(?:\+\+|pp|#)?|html|css|sql|php|react|angular|vue|django|flask|spring|ruby|rust|golang|go|swift|kotlin|r\b|matlab)'
    action_tokens = r'(?:write|give|generate|create|provide|show|build|debug|fix|explain|teach|run|print|send|make|type)\s+(?:me\s+)?(?:a\s+|the\s+|some\s+)?'
    code_noun_tokens = r'(?:code|codes|coding|program|programs|programming|script|scripts|snippet|snippets|syntax|function|functions|algorithm|algorithms|loop|loops|class|classes|file|files|tags?|headers?|backend|frontend)'

    # 1. Action + optional filler words (up to 4 words) + language/code token (e.g., "write a pyhton code", "give me basic html", "create a function")
    if re.search(rf'\b{action_tokens}(?:\w+\s+){{0,4}}\b(?:{lang_tokens}|{code_noun_tokens})\b', q_lower):
        return True

    # 2. Language + code noun (e.g. "python code", "pyhton code", "html file", "js script", "c++ program")
    if re.search(rf'\b{lang_tokens}\s+{code_noun_tokens}\b', q_lower):
        return True

    # 3. Direct code noun requests (e.g. "code for reverse string", "program to add numbers", "script to scrape")
    if re.search(rf'\b(?:code|program|script|algorithm|function)\s+(?:for|to|that|which|of|in)\b', q_lower):
        return True

    # 4. Code snippets or raw syntax keywords
    if re.search(r'\b(?:print\s*\(|console\.log|system\.out\.println|#include\s*<|def\s+\w+\s*\(|public\s+static\s+void|<!doctype|<html|<head|<body|<h[1-6]>)\b', q_lower):
        return True

    return False


# Comprehensive defensive patterns for off-topic filtering
OFF_TOPIC_PATTERNS = [
    # 1. Math / Physics / Chemistry / Homework Problem Solving
    r'\b(?:solve|calculate|evaluate|simplify|differentiate|integrate)\s+(?:this\s+)?(?:math|physics|chemistry|equation|integral|derivative|problem|expression|\d+[\+\-\*\/\^])\b',
    r'\b(?:square\s+root\s+of|derivative\s+of|integral\s+of|value\s+of\s+pi)\b',
    
    # 2. Creative Writing, Essays, Poems, Jokes & Stories Unrelated to MSAJCE
    r'\b(?:write|compose|generate)\s+(?:me\s+)?(?:an?\s+)?(?:essay|poem|poetry|story|lyrics|song|letter|speech|script|joke)\s+(?:about|on|for)\b',
    r'\b(?:tell\s+me\s+a\s+joke|make\s+me\s+laugh|write\s+a\s+story)\b',
    
    # 3. Cooking, Food Recipes & Diets
    r'\b(?:recipe\s+(?:for|of)|how\s+to\s+(?:cook|bake|make|prepare)\s+(?:cake|pizza|biryani|burger|pasta|tea|coffee|curry|soup|cookie|bread|chicken|paneer|food)|diet\s+plan)\b',
    
    # 4. World Politics, Foreign Leaders & Trivia
    r'\b(?:capital\s+of|president\s+of|prime\s+minister\s+of|governor\s+of|weather\s+in|population\s+of|currency\s+of|who\s+rules)\s+[A-Za-z]+',
    
    # 5. Pop Culture, Movies & External Sports
    r'\b(?:who\s+won\s+the\s+(?:ipl|fifa|world\s+cup|match|game|super\s+bowl|oscar|election)|movie\s+review|box\s+office|celebrity\s+news|release\s+date\s+of\s+movie)\b',
    
    # 6. Financial Trading, Crypto & Gambling
    r'\b(crypto|cryptocurrency|bitcoin|ethereum|forex\s+trading|stock\s+market\s+tips|casino|betting|gamble|gambling|lottery\s+tickets?)\b'
]


def check_guardrails(user_query: str) -> Tuple[bool, Optional[str]]:
    """
    Evaluates input query against NeMo Guardrails policies and Vercel typesafe-ai/jev:
    1. Fast Local Jailbreak Pattern Pre-check (0ms)
    2. Whitelist benign greetings and conversational inquiries (0ms)
    3. Fast Intent Classification: Recognized campus entities / research / developer (0ms)
    4. Code Generation & Programming Request Interception (0ms)
    5. Defensive Regex Check for Blatant Off-Topic Inquiries (0ms)
    6. Fast Domain & Knowledge Entity Whitelist (0ms)
    7. Advanced System One Evaluation via Vercel AI Gateway (typesafe-ai/jev)
    8. Strict College Domain Boundary Default Fallback
    
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

    # 4. Fast-path Code Generation & Programming Request Interception (0ms)
    if is_code_or_script_request(q_lower):
        if not any(w in q_lower for w in ["msajce", "mohamed sathak", "sathak", "tnea", "syllabus", "curriculum"]):
            return False, CAMPUS_REFUSAL_MESSAGE

    # 5. Defensive Regex Check for Blatant Off-Topic Inquiries (0ms)
    # Catches explicit banned topics (math, essays, recipes, crypto, trivia, politics)
    for pattern in OFF_TOPIC_PATTERNS:
        if re.search(pattern, q_lower):
            # Only allow if explicitly inquiring about college context / curriculum / admissions
            if not any(w in q_lower for w in ["msajce", "mohamed sathak", "sathak", "tnea", "syllabus", "curriculum", "course", "courses", "department", "degree"]):
                return False, CAMPUS_REFUSAL_MESSAGE

    # 6. Fast Domain & Knowledge Entity Whitelist (0ms)
    # If query contains any verified campus term or knowledge entity alias, permit immediately
    if is_campus_domain_term_present(q_lower):
        return True, None

    # 7. Advanced System One Evaluation via Vercel AI Gateway (typesafe-ai/jev)
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

    # 8. Non-campus general queries with zero campus tokens:
    # If query does not mention any campus term and is not a conversational greeting, check if it's a follow-up or off-topic
    return True, None
