import re
import json
import logging
from typing import List, Dict, Any, Optional
from psycopg2.extras import RealDictCursor

from backend.app.config.settings import (
    VERCEL_AI_GATEWAY_KEY, VERCEL_AI_GATEWAY_URL,
    NVIDIA_API_KEY, NVIDIA_BASE_URL,
    OPENROUTER_API_KEY, OPENROUTER_BASE_URL
)
from backend.app.services.database import DBContext
from backend.app.services.redis_service import get_cached_session_history

logger = logging.getLogger("lorin_ai.query_rewriter")

# Typos & Pronoun Triggers
_PRONOUN_TRIGGERS = re.compile(
    r'\b(the same|above mentioned|given above|those details|these details)\b'
    r'|\b(any\s*other|anyother|anyone\s+else|who\s+else|what\s+else|which\s+other|who\s+other|what\s+other|how\s+about\s+other|how\s+about\s+the\s+other|are\s+there\s+any\s+other|is\s+there\s+any\s+other|any\s+more|more\s+names?|other\s+students?|other\s+faculty|other\s+members?|other\s+recipients?|other\s+candidates?|more\s+recipients?)\b'
    r'|\b(who\s+are\s+they|who\s+are\s+the\s+others|what\s+are\s+the\s+others|list\s+others|list\s+more|show\s+more|give\s+more)\b'
    r'|\b(full route|complete route|route fully|all stops|more details?|tell me more|tell abt|tell about|tellme|tellme abt|tellme about|know more|expand|elaborate|go on|continue|give those|show those|about him|about her|about it|about that|abt that|who is he|who is she|more info|further details|that briefly|this briefly)\b'
    r'|\bwhat (is|are|about) (that|them|those|him|her|it)\b'
    r'|\b(its|their|his|her) (route|routes|stops?|driver|contact|timings?|details?|fees?|profile|designation|department|qualification|sports|facilities|facility)\b'
    r'|\b(give|show|tell|send|get|provide|list)\b.*?\b(that|this|it|them|those|these)\b'
    r'|\b(this|that|the|those|these)\b(?:[\w\s]{0,25})\b(bus|buses|route|routes|dept|department|driver|drivers|course|subject|hostel|stop|stops|schedule|contact|fee|fees|syllabus|program|branch|faculty|person|professor|sports|facility|facilities)\b',
    re.IGNORECASE
)

_FOLLOWUP_AFFIRMATION_PATTERNS = re.compile(
    r'^(?:yes|yep|yeah|sure|ok|okay|please|do\s+that|go\s+ahead|tell\s+me|show\s+me|give\s+me|details|want\s+that|need\s+that|yes\s+please|of\s+course|why\s+not)$',
    re.IGNORECASE
)

def normalize_query_typos(query: str) -> str:
    """Normalizes query whitespace and standardizes common typo variations."""
    if not query:
        return ""
    q = re.sub(r'\s+', ' ', query.strip())
    return q

def pre_normalize_department_acronyms(query: str) -> str:
    """Normalizes 'IT' department queries to 'Information Technology (IT)' before resolution."""
    q = query
    q = re.sub(
        r'\b(for|in|of|about|the)\s+it\s+(dept|department|branch|course|admission|admissions|cutoff|cut-off|cut off|counselling|counseling|placements|fees|syllabus|faculty|hod|btech|be|students?|lab|labs)\b',
        r'\1 Information Technology (IT) \2',
        q, flags=re.IGNORECASE
    )
    return q

_STANDALONE_DOMAIN_KEYWORDS = {
    "developer", "creator", "author", "architect", "zendrum", "ramzenderum", "ramzendrum",
    "ramanathan", "hackerstudent29", "lorin", "principal", "srinivasan", "hostel", "hostels",
    "bus", "buses", "transport", "route", "routes", "admission", "admissions", "tnea", "1301",
    "cutoff", "cutoffs", "fee", "fees", "scholarship", "placement", "placements", "cse", "it",
    "ece", "eee", "mech", "civil", "aids", "aiml", "cyber", "csbs", "location", "address", "map",
    "csi", "college", "msajce", "msajcea", "canteen", "library", "sports", "gym", "mess", "wifi",
    "degree", "courses", "intake", "eligibility", "quota", "syllabus", "department", "departments"
}

def is_standalone_or_protected_query(query: str) -> bool:
    """Checks if query is a self-contained, standalone question or exact identifier lookup."""
    if not query or not query.strip():
        return False
    q_clean = query.strip()
    q_low = q_clean.lower()
    
    if _FOLLOWUP_AFFIRMATION_PATTERNS.match(q_clean):
        return False

    if any(k in q_low for k in ["developer", "creator", "who made", "who built", "who created", "who developed", "who programmed", "who coded", "ram", "rama", "ramanathan", "zendrum", "ramzenderum", "ramzendrum", "hackerstudent29"]):
        return True

    if re.search(r'\b\d{6,12}[A-Za-z]?\b', q_clean):
        return True

    words = set(re.findall(r'\b\w+\b', q_low))
    if words.intersection(_STANDALONE_DOMAIN_KEYWORDS):
        return True

    if re.search(r'\b(who\s+is|what\s+is|what\s+are|where\s+is|how\s+to|list\s+all|tell\s+me\s+about)\b', q_low) and len(q_clean.split()) >= 3:
        if not re.search(r'\b(who\s+is\s+he|who\s+is\s+she|who\s+are\s+they|what\s+is\s+it|what\s+is\s+that|what\s+are\s+they|tell\s+me\s+about\s+it|tell\s+me\s+about\s+that|tell\s+abt\s+it|tell\s+abt\s+that)\b', q_low):
            return True

    if q_clean.count('?') >= 2 or len(q_clean.split()) >= 15:
        return True

    return False

def is_contextual_query(query: str) -> bool:
    """
    Universal Production RAG Contextual Query Detector.
    Returns True ONLY if query is a pure follow-up or referential query dependent on past dialogue.
    """
    if not query:
        return False
    q_norm = normalize_query_typos(query.strip())

    if is_standalone_or_protected_query(q_norm):
        return False

    if _FOLLOWUP_AFFIRMATION_PATTERNS.match(q_norm):
        return True

    if _PRONOUN_TRIGGERS.search(q_norm):
        return True

    return False

async def resolve_pronouns_llm(current_query: str, session_id: str, http_client=None) -> str:
    """
    Universal Production RAG Contextual Query Rewriter.
    Evaluates multi-turn user queries against dialogue history (cached in Redis Cloud in <1ms)
    and rewrites follow-ups into complete standalone search queries.
    """
    normalized_q = pre_normalize_department_acronyms(current_query)
    q_trim = normalized_q.strip()
    if not q_trim:
        return current_query

    if is_standalone_or_protected_query(q_trim):
        return normalized_q

    # Fast <1ms Redis Cloud lookup first for session history
    cached_history = get_cached_session_history(session_id, limit=10)
    history_messages = cached_history

    if not history_messages:
        # DB Fallback if Redis cache missed
        try:
            with DBContext() as conn:
                if conn:
                    with conn.cursor(cursor_factory=RealDictCursor) as cur:
                        cur.execute("""
                            SELECT m.role, m.content FROM chat_messages m
                            JOIN chat_sessions s ON s.session_id = m.session_id
                            WHERE m.session_id = %s AND COALESCE(s.is_archived, FALSE) = FALSE
                            ORDER BY m.created_at DESC
                            LIMIT 10;
                        """, (session_id,))
                        history_messages = cur.fetchall()
        except Exception as e:
            logger.warning(f"History fetch error: {e}")

    filtered = []
    for row in reversed(history_messages):
        c = (row.get("content") or "").strip()
        r = row.get("role")
        if r == "user" and c.lower() == q_trim.lower():
            continue
        if c:
            filtered.append(row)

    if not filtered or len(filtered) < 1:
        return normalized_q

    history_text_blocks = []
    for msg in filtered:
        role = "User" if msg["role"] == "user" else "Assistant"
        snippet = (msg.get("content") or "").replace("\n", " ")
        history_text_blocks.append(f"{role}: {snippet[:400]}")

    history_str = "\n".join(history_text_blocks[-6:])

    rewrite_prompt = (
        f"Recent Conversation History:\n{history_str}\n\n"
        f"Current User Input: \"{normalized_q}\"\n\n"
        "TASK:\n"
        "Analyze the Current User Input in the context of the Recent Conversation History and produce a high-precision, standalone search query suitable for semantic & keyword search against the college campus database.\n\n"
        "UNIVERSAL RULES:\n"
        "1. IF the user input is a follow-up, continuation, elliptical query, or pronoun reference:\n"
        "   - Resolve all implicit context, pronouns, and missing subjects using the conversation history.\n"
        "   - Formulate a fully explicit, standalone search query that includes the specific topic, entities, department, and constraints.\n"
        "2. IF the user input is already a complete, self-contained, standalone question or shifts to a new topic:\n"
        "   - Return the user's question as a clean, direct search query WITHOUT introducing unrelated context or keywords from earlier turns.\n"
        "3. Output ONLY the final standalone search query. Zero explanations, zero quotes, zero markdown preamble."
    )

    if http_client:
        try:
            step2_models = [
                ("google/gemini-2.5-flash-lite", f"{VERCEL_AI_GATEWAY_URL.rstrip('/')}/chat/completions", {"Authorization": f"Bearer {VERCEL_AI_GATEWAY_KEY}", "Content-Type": "application/json"}),
                ("nvidia/nemotron-3-super-120b-a12b", f"{NVIDIA_BASE_URL.rstrip('/')}/chat/completions", {"Authorization": f"Bearer {NVIDIA_API_KEY}", "Content-Type": "application/json"}),
            ]
            for m_name, url, hdrs in step2_models:
                try:
                    res = await http_client.post(
                        url,
                        headers=hdrs,
                        json={"model": m_name, "messages": [{"role": "user", "content": rewrite_prompt}], "max_tokens": 120, "temperature": 0.1},
                        timeout=2.5
                    )
                    if res.status_code == 200:
                        data = res.json()
                        rewritten = data["choices"][0]["message"]["content"].strip().strip('"\'`')
                        if len(rewritten) >= 4:
                            logger.info(f"[LLM Query Rewriter] '{current_query}' → '{rewritten}'")
                            return rewritten
                except Exception:
                    continue
        except Exception as e:
            logger.warning(f"Query rewriter execution error: {e}")

    return normalized_q
