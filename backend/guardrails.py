import re
from typing import Tuple, Optional

# Off-topic patterns
OFF_TOPIC_PATTERNS = [
    r'\b(crypto|bitcoin|eth|trading|stock market|forex)\b',
    r'\b(capital of|president of|prime minister of|who won the match|weather in London)\b',
    r'\b(write a script|generate python code|write an essay on|tell a joke|tell me a joke)\b',
    r'\b(movie review|recipe for|how to bake|gaming PC|best smartphone)\b'
]

# Prompt injection & jailbreak patterns
JAILBREAK_PATTERNS = [
    r'ignore all previous instructions',
    r'ignore previous directives',
    r'you are now in dan mode',
    r'reveal your system prompt',
    r'print system prompt',
    r'disregard college policy',
    r'act as an unrestricted ai',
    r'do anything now mode'
]

# Domain whitelist keywords
DOMAIN_KEYWORDS = [
    'msajcea', 'msajce', 'college', 'admission', 'fee', 'tuition', 'hostel', 'bus', 'route',
    'placement', 'cse', 'it', 'ece', 'eee', 'mech', 'civil', 'cyber', 'ai', 'ds',
    'anna university', 'tnea', 'cutoff', 'scholarship', 'canteen', 'lab', 'principal',
    'faculty', 'syllabus', 'curriculum', 'regulation', 'nba', 'naac', 'aicte', 'campus',
    'siruseri', 'omr', 'chennai', 'exam', 'semester', 'grade', 'gpa', 'cgpa',
    'patent', 'patents', 'research', 'copyright', 'publication', 'publications',
    'paper', 'papers', 'journal', 'journals', 'inventor', 'author', 'supervisor',
    'dhiravidachelvi', 'ramanathan', 'developer', 'creator', 'project', 'funding', 'tnscst', 'phd'
]

DOMAIN_KEYWORD_REGEX = re.compile(
    r'\b(?:' + '|'.join(re.escape(k) for k in DOMAIN_KEYWORDS) + r')\b',
    re.IGNORECASE
)

try:
    from jev_evaluator import jev_evaluator, JevEvaluationResult
except ImportError:
    try:
        from backend.jev_evaluator import jev_evaluator, JevEvaluationResult
    except ImportError:
        jev_evaluator = None

# Conversational greeting patterns (allowed for natural conversational interactions)
GREETING_PATTERNS = [
    r'^(?:hi|hello|hey|hola|namaste|vanakkam|good\s+(?:morning|afternoon|evening|day)|greetings)[\s!.,?]*$',
    r'^(?:who\s+are\s+you|what\s+is\s+your\s+name|what\s+can\s+you\s+do|how\s+can\s+you\s+help|help\s*me|help)[\s!.,?]*$',
    r'^(?:how\s+are\s+you|how\s+r\s+u|how\s+do\s+you\s+do|how\s+is\s+it\s+going)[\s!.,?]*$',
    r'^(?:thank\s+you|thanks|thank\s+u|bye|goodbye|ok|okay)[\s!.,?]*$'
]

def check_guardrails(user_query: str) -> Tuple[bool, Optional[str]]:
    """
    Evaluates input query against NeMo Guardrails policies and Vercel typesafe-ai/jev:
    1. System One Decision Engine (typesafe-ai/jev via Vercel AI Gateway)
    2. Prompt Injection / Jailbreak Interception
    3. Domain Boundary & Off-Topic Interception
    
    Returns (is_allowed, refusal_message)
    """
    q_lower = user_query.lower().strip()

    # 1. Fast Local Jailbreak Pattern Pre-check
    for pattern in JAILBREAK_PATTERNS:
        if re.search(pattern, q_lower):
            return False, "I cannot comply with that request. I strictly operate under official MSAJCEA campus guidelines."

    # 1.5 Whitelist benign greetings and conversational inquiries
    for pattern in GREETING_PATTERNS:
        if re.search(pattern, q_lower):
            return True, None

    # 2. Advanced System One Evaluation via Vercel AI Gateway (typesafe-ai/jev)
    if jev_evaluator and jev_evaluator.is_enabled:
        try:
            jev_res = jev_evaluator.evaluate_query_sync(user_query, timeout=4.0)
            if not jev_res.is_safe:
                return False, jev_res.refusal_reason or "I cannot comply with that request. I strictly operate under official MSAJCEA campus guidelines."
            if not jev_res.is_campus_domain and jev_res.category == "off_topic":
                # Ensure it wasn't a false positive with explicit domain keywords or numeric identifiers (e.g. patent numbers)
                has_domain = bool(DOMAIN_KEYWORD_REGEX.search(q_lower)) or bool(re.search(r'\b\d{6,12}[A-Za-z]?\b', q_lower))
                if not has_domain:
                    return False, jev_res.refusal_reason or "I am Lorin AI, the official intelligence assistant for Mohamed Sathak A.J. College of Engineering and Architecture (MSAJCEA). I can only assist with college admissions, departments, academics, placements, fees, and campus facilities."
        except Exception:
            pass  # Fall through defensively to regex pattern matching

    # 3. Off-Topic Check (Defensive Fallback)
    for pattern in OFF_TOPIC_PATTERNS:
        if re.search(pattern, q_lower):
            has_domain = bool(DOMAIN_KEYWORD_REGEX.search(q_lower)) or bool(re.search(r'\b\d{6,12}[A-Za-z]?\b', q_lower))
            if not has_domain:
                return False, "I am Lorin AI, the official intelligence assistant for Mohamed Sathak A.J. College of Engineering and Architecture (MSAJCEA). I can only assist with college admissions, departments, academics, placements, fees, and campus facilities."

    return True, None

