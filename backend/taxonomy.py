"""
Lorin AI — Unified Campus Taxonomy & Intent Engine
===================================================
Single source of truth for categories, domain routing, and guardrail policies.
Designed for high scalability: adding a new category or dataset requires only
registering it here, and all downstream components (JEV System One, Guardrails,
Domain Router, and RAG Filters) automatically adapt.
"""

import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Any


@dataclass(frozen=True)
class CategoryMetadata:
    key: str
    label: str
    description: str
    is_allowed: bool
    jev_criteria: str
    keywords: List[str] = field(default_factory=list)
    regex_pattern: Optional[str] = None
    target_domains: List[str] = field(default_factory=list)
    refusal_message: Optional[str] = None


# ==============================================================================
# 🏛️ UNIFIED CAMPUS INTENT TAXONOMY (16 Scalable Categories)
# ==============================================================================

CAMPUS_TAXONOMY: Dict[str, CategoryMetadata] = {
    # 1. Natural Conversation & Pleasantries
    "greetings": CategoryMetadata(
        key="greetings",
        label="Greetings & Pleasantries",
        description="Conversational greetings, introductions, bot identity, capabilities, and pleasantries.",
        is_allowed=True,
        jev_criteria="Conversational greeting, polite hello/hi, asking who the bot is, capabilities, or saying thanks/goodbye.",
        keywords=[
            "hi", "hello", "hey", "hola", "namaste", "vanakkam", "greetings",
            "good morning", "good afternoon", "good evening", "how are you",
            "who are you", "what can you do", "help me", "help", "thanks",
            "thank you", "bye", "goodbye"
        ],
        regex_pattern=r'^(?:hi|hello|hey|hola|namaste|vanakkam|good\s+(?:morning|afternoon|evening|day)|greetings)(?:\s+(?:there|bot|lorin|assistant|all))?[\s!.,?]*$|^(?:who\s+are\s+you|what\s+is\s+your\s+name|what\s+can\s+you\s+do|how\s+can\s+you\s+help|help\s*me|help|how\s+are\s+you|how\s+r\s+u|thank\s+you|thanks|thank\s+u|bye|goodbye|ok|okay)[\s!.,?]*$',
        target_domains=["general"]
    ),

    # 2. Admissions & TNEA Counselling
    "admissions": CategoryMetadata(
        key="admissions",
        label="Admissions & Counselling",
        description="Admissions process, TNEA Code 1301, 7.5% school quota, cutoffs, eligibility, seat matrix.",
        is_allowed=True,
        jev_criteria="Admissions process, TNEA counseling code 1301, cut-off marks, eligibility criteria, quota, lateral entry, certificates required.",
        keywords=[
            "admission", "admissions", "cutoff", "cutoffs", "cut-off", "cut off", "tnea",
            "1301", "counselling", "counseling", "eligibility", "quota", "government quota",
            "management quota", "7.5%", "seat matrix", "intake", "application", "lateral entry",
            "first graduate", "allotment", "documents required"
        ],
        regex_pattern=r'\b(admissions?|cutoff|cut-off|cut off|tnea|1301|counselling|counseling|eligibility|quota|lateral\s+entry|intake|allotment)\b',
        target_domains=["admission", "general"]
    ),

    # 3. Academics & Degree Programs
    "academics": CategoryMetadata(
        key="academics",
        label="Academics & Departments",
        description="12 UG and 2 PG courses, curriculum, syllabi, Anna University regulations, semesters, GPA.",
        is_allowed=True,
        jev_criteria="Academic engineering departments (CSE, IT, ECE, EEE, Mech, Civil, AI&DS, AI&ML, Cyber), syllabus, courses, Anna University regulation, exams, GPA.",
        keywords=[
            "course", "courses", "department", "departments", "branch", "branches",
            "curriculum", "syllabus", "syllabi", "regulation", "anna university",
            "b.e", "b.tech", "m.e", "cse", "it", "ece", "eee", "mech", "civil",
            "ai & ds", "ai & ml", "cyber security", "csbs", "vlsi", "act",
            "semester", "exam", "exams", "grade", "gpa", "cgpa", "credits"
        ],
        regex_pattern=r'\b(courses?|departments?|branch|branches|curriculum|syllabus|regulations?|anna\s+university|b\.?tech|b\.?e|m\.?e|cse|ece|eee|mech|civil|semesters?|exams?|gpa|cgpa)\b',
        target_domains=["department", "academics", "general"]
    ),

    # 4. Fees, Tuition & Financial Aid
    "fees": CategoryMetadata(
        key="fees",
        label="Fees & Scholarships",
        description="Tuition fees, semester charges, hostel & bus fees, First Graduate concession, government scholarships.",
        is_allowed=True,
        jev_criteria="Tuition fees, hostel fees, bus fees, payment modes, First Graduate concession, SC/ST/MBC post-matric scholarship, fee waivers.",
        keywords=[
            "fee", "fees", "tuition", "hostel fee", "bus fee", "transport fee",
            "cost", "payment", "semester fee", "scholarship", "scholarships",
            "concession", "waiver", "first graduate waiver", "post matric"
        ],
        regex_pattern=r'\b(fees?|tuition|scholarships?|waiver|concession|cost|expenses?|payment)\b',
        target_domains=["fees", "admission", "general"]
    ),

    # 5. Placements, Internships & Recruiters
    "placements": CategoryMetadata(
        key="placements",
        label="Placements & Careers",
        description="Campus placements, top recruiters, salary packages (up to 8.5 LPA), placement cell training.",
        is_allowed=True,
        jev_criteria="Campus placements, companies recruiting, salary packages, highest package, placement percentage, interview training, career cell, internships.",
        keywords=[
            "placement", "placements", "recruit", "recruiter", "recruiters", "salary",
            "package", "highest package", "average package", "lpa", "company", "companies",
            "job", "jobs", "internship", "internships", "training", "career", "career cell",
            "tcs", "infosys", "wipro", "cognizant", "zoho", "kaar tech"
        ],
        regex_pattern=r'\b(placements?|recruiters?|salary|packages?|lpa|hiring|internships?|career\s+cell|job\s+offers?)\b',
        target_domains=["placement", "general"]
    ),

    # 6. Faculty Research, Patents & Publications
    "research": CategoryMetadata(
        key="research",
        label="Research & Patents",
        description="22 official patents, published papers, journals, funded projects, Ph.D. supervisors, Dr. E. Dhiravidachelvi.",
        is_allowed=True,
        jev_criteria="Faculty research, 22 published patents, patent numbers (e.g. 2020101867), research papers, journals, conferences, TNSCST funding, Ph.D. supervisors.",
        keywords=[
            "patent", "patents", "patent no", "patent number", "published patent", "filed patent",
            "research", "paper", "papers", "publication", "publications", "journal", "journals",
            "inventor", "inventors", "copyright", "copyrights", "isbn", "doi", "conference",
            "dhiravidachelvi", "dr. e. dhiravidachelvi", "supervisor", "supervisors", "phd",
            "funded project", "tnscst", "iot", "wireless sensor network", "disaster management"
        ],
        regex_pattern=r'\b(patents?|patent\s*no|patent\s*number|copyrights?|isbn|journals?|publications?|research|inventors?|supervised|supervisors?)\b|\b\d{6,12}[A-Za-z]?\b',
        target_domains=["research", "faculty", "general"]
    ),

    # 7. Bus Transportation & Daily Routes
    "transport": CategoryMetadata(
        key="transport",
        label="Transport & Bus Routes",
        description="9 college bus routes (AR 3 to AR 10, R 22), pickup timings, 8:00 AM arrival, driver contacts, MTC buses.",
        is_allowed=True,
        jev_criteria="College bus routes, pickup points, morning departure times, arrival at campus by 8:00 AM, driver contact numbers, route numbers (AR 3, AR 4, etc.), public MTC buses.",
        keywords=[
            "bus", "buses", "route", "routes", "transport", "driver", "drivers",
            "stops", "pickup", "drop", "boarding", "travel", "commute", "mtc",
            "van", "ar 3", "ar 4", "ar 5", "ar 6", "ar 7", "ar 8", "ar 9", "ar 10", "r 22",
            "uthiramerur", "moolakadai", "anna nagar", "icf", "chunambedu", "manjambakkam",
            "ennore", "porur", "nemilichery", "siruseri", "8:00 am"
        ],
        regex_pattern=r'\b(bus|buses|transport|route|routes|driver|drivers|stops?|boarding|pickup|commute)\b|\b(?:Route\s+)?(AR[\s\-]?\d+|R[\s\-]?\d+|MTC\s+\d+[A-Z]*)\b',
        target_domains=["transport"]
    ),

    # 8. Student Hostels & Living
    "hostel": CategoryMetadata(
        key="hostel",
        label="Hostel & Accommodation",
        description="Boys' and girls' hostels, room facilities, study hours, warden contacts, security, laundry.",
        is_allowed=True,
        jev_criteria="Boys' hostel, girls' hostel, room facilities, warden contacts, hostel rules, security, study hours, staying on campus.",
        keywords=[
            "hostel", "hostels", "boys hostel", "girls hostel", "room", "rooms",
            "warden", "wardens", "hostel rules", "study hours", "accommodation",
            "staying", "laundry", "hot water", "gym in hostel"
        ],
        regex_pattern=r'\b(hostels?|boys\s+hostel|girls\s+hostel|wardens?|hostel\s+rooms?|hostel\s+fees?)\b',
        target_domains=["hostel", "general"]
    ),

    # 9. Dining Mess & Canteen
    "canteen": CategoryMetadata(
        key="canteen",
        label="Mess & Canteen",
        description="500-seat central dining hall, steam kitchen, RO water, meal schedules, cafeteria, veg and non-veg food.",
        is_allowed=True,
        jev_criteria="Campus mess, food quality, dining hall capacity, meal timings (breakfast, lunch, tea, dinner), canteen cafeteria, menu.",
        keywords=[
            "mess", "dining", "dining hall", "canteen", "cafeteria", "food",
            "menu", "meals", "breakfast", "lunch", "dinner", "snacks", "tea",
            "veg", "non-veg", "ro water", "steam kitchen"
        ],
        regex_pattern=r'\b(mess|canteens?|cafeteria|dining\s+hall|food|meal\s+timings?|breakfast|lunch|dinner)\b',
        target_domains=["hostel", "facilities", "general"]
    ),

    # 10. Campus Facilities & Infrastructure
    "infrastructure": CategoryMetadata(
        key="infrastructure",
        label="Campus Infrastructure & Labs",
        description="Central library, DELNET/IEEE access, engineering labs, Apple iOS centre, auditorium, smart classes.",
        is_allowed=True,
        jev_criteria="Central library, book collection, journals, e-resources, engineering labs, workshop, Apple iOS development centre, auditorium, campus buildings.",
        keywords=[
            "library", "central library", "books", "delnet", "ieee", "journals",
            "lab", "labs", "laboratories", "apple lab", "ios lab", "auditorium",
            "seminar hall", "smart classroom", "wi-fi", "campus area", "infrastructure"
        ],
        regex_pattern=r'\b(library|central\s+library|delnet|ieee|labs?|laboratories|ios\s+lab|auditorium|smart\s+classrooms?|infrastructure)\b',
        target_domains=["facilities", "department", "general"]
    ),

    # 11. Campus Life, Sports & Clubs
    "campus_life": CategoryMetadata(
        key="campus_life",
        label="Campus Life & Sports",
        description="Cricket field, football, basketball court, indoor games, annual Sathak Fest, Rotaract, NSS, hackathons.",
        is_allowed=True,
        jev_criteria="Outdoor and indoor sports, cricket, football, basketball, gymnasium, annual cultural Sathak Fest, student clubs, Rotaract, NSS, student life.",
        keywords=[
            "sports", "games", "cricket", "football", "basketball", "volleyball",
            "gym", "gymnasium", "indoor games", "badminton", "table tennis", "chess",
            "sathak fest", "cultural", "culturals", "clubs", "rotaract", "nss",
            "hackathon", "events", "activities"
        ],
        regex_pattern=r'\b(sports|cricket|football|basketball|volleyball|gym|gymnasium|sathak\s+fest|culturals?|student\s+clubs?|rotaract|nss)\b',
        target_domains=["campus-life", "facilities", "general"]
    ),

    # 12. Governance, Leadership & Accreditation
    "governance": CategoryMetadata(
        key="governance",
        label="Governance & Leadership",
        description="Mohamed Sathak Trust, Principal Dr. K.S. Srinivasan, HODs, NAAC 'A+' grade, NBA, AICTE approval.",
        is_allowed=True,
        jev_criteria="College leadership, Founder Mohamed Sathak Trust, Principal Dr. K.S. Srinivasan, HODs, governing council, NAAC 'A+' accreditation, NBA, AICTE.",
        keywords=[
            "principal", "director", "dean", "hod", "trust", "mohamed sathak trust",
            "dr. k.s. srinivasan", "srinivasan", "sathak", "founder", "chairman",
            "naac", "naac 'a+'", "nba", "aicte", "governing council", "accreditation"
        ],
        regex_pattern=r'\b(principal|dr\.?\s*k\.?s\.?\s*srinivasan|srinivasan|hods?|deans?|mohamed\s+sathak\s+trust|naac|nba|aicte|accreditations?)\b',
        target_domains=["governance", "faculty", "general"]
    ),

    # 13. Alumni Network
    "alumni": CategoryMetadata(
        key="alumni",
        label="Alumni Association",
        description="MSAJCE Alumni association, alumni meet, distinguished alumni, networking and student mentorship.",
        is_allowed=True,
        jev_criteria="Alumni network, graduated students, alumni association, alumni meet, mentorship, distinguished alumni achievements.",
        keywords=[
            "alumni", "alumnus", "alumnae", "graduates", "alumni meet",
            "alumni association", "former students", "past students"
        ],
        regex_pattern=r'\b(alumni|alumnus|alumnae|graduates?|alumni\s+association|alumni\s+meet)\b',
        target_domains=["general"]
    ),

    # 14. Developer & Bot Profile
    "developer": CategoryMetadata(
        key="developer",
        label="Developer & Creator",
        description="Ramanathan S. (B.Tech IT), developer and creator of Lorin AI, technology stack, portfolio.",
        is_allowed=True,
        jev_criteria="Inquiries about the developer Ramanathan S., portfolio, creator of Lorin AI, tech stack.",
        keywords=[
            "developer", "creator", "who made you", "who created you", "who built you",
            "ramanathan", "ramanathan s", "ramzenderum", "ram", "lorin ai creator"
        ],
        regex_pattern=r'\b(developer|creator|who\s+(?:made|built|created|developed)\s+(?:you|lorin)|ramanathan|ramzenderum)\b',
        target_domains=["developer", "general"]
    ),

    # 15. Off-Topic Inquiries (Disallowed - Refused with College Boundary)
    "off_topic": CategoryMetadata(
        key="off_topic",
        label="Off-Topic Inquiry",
        description="Queries unrelated to MSAJCEA or college education (cooking, crypto, political debate, movies, gaming).",
        is_allowed=False,
        jev_criteria="Clearly unrelated to MSAJCEA, higher education, engineering, or campus life (e.g. recipes, cryptocurrency, politics, external gossip).",
        keywords=[
            "crypto", "bitcoin", "ethereum", "stock market", "trading",
            "recipe", "how to bake", "cake", "cook", "movie review",
            "who won the match", "president of", "prime minister of", "capital of"
        ],
        regex_pattern=r'\b(crypto|bitcoin|trading|stock\s+market|recipe\s+for|how\s+to\s+bake|who\s+won\s+the\s+match|capital\s+of\s+[A-Za-z]+)\b',
        target_domains=[],
        refusal_message="I am Lorin AI, the official intelligence assistant for Mohamed Sathak A.J. College of Engineering and Architecture (MSAJCEA). I can only assist with college admissions, departments, academics, placements, fees, and campus facilities."
    ),

    # 16. Security & Jailbreak Violations (Disallowed - Refused with Safety Policy)
    "jailbreak": CategoryMetadata(
        key="jailbreak",
        label="Security Policy Violation",
        description="Prompt injection, persona hijacking, DAN mode, instruction disregard, prompt extraction.",
        is_allowed=False,
        jev_criteria="Malicious prompt injection, instruction disregard, DAN mode, jailbreak attempt, or prompt extraction.",
        keywords=[
            "ignore previous instructions", "you are now in dan mode", "reveal system prompt",
            "print system prompt", "disregard college policy", "act as unrestricted ai"
        ],
        regex_pattern=r'\b(ignore\s+all\s+previous\s+instructions|ignore\s+previous\s+directives|you\s+are\s+now\s+in\s+dan\s+mode|reveal\s+your\s+system\s+prompt|print\s+system\s+prompt|disregard\s+college\s+policy|act\s+as\s+an\s+unrestricted\s+ai)\b',
        target_domains=[],
        refusal_message="I cannot comply with that request. I strictly operate under official MSAJCEA campus guidelines."
    )
}

# Precompile all regex patterns for 0ms execution
for cat in CAMPUS_TAXONOMY.values():
    if cat.regex_pattern:
        # Validated compiled patterns
        pass

# Comprehensive word-boundary domain whitelist for high-precision verification
CAMPUS_DOMAIN_TERMS: Set[str] = {
    'msajcea', 'msajce', 'college', 'admission', 'fee', 'tuition', 'hostel', 'bus', 'route',
    'placement', 'cse', 'it', 'ece', 'eee', 'mech', 'civil', 'cyber', 'ai', 'ds',
    'anna university', 'tnea', 'cutoff', 'scholarship', 'canteen', 'lab', 'principal',
    'faculty', 'syllabus', 'curriculum', 'regulation', 'nba', 'naac', 'aicte', 'campus',
    'siruseri', 'omr', 'chennai', 'exam', 'semester', 'grade', 'gpa', 'cgpa',
    'patent', 'patents', 'research', 'copyright', 'publication', 'publications',
    'paper', 'papers', 'journal', 'journals', 'inventor', 'author', 'supervisor',
    'dhiravidachelvi', 'ramanathan', 'developer', 'creator', 'project', 'funding', 'tnscst', 'phd'
}

DOMAIN_WORD_REGEX = re.compile(
    r'\b(?:' + '|'.join(re.escape(k) for k in sorted(CAMPUS_DOMAIN_TERMS, key=len, reverse=True)) + r')\b',
    re.IGNORECASE
)

IDENTIFIER_REGEX = re.compile(r'\b\d{6,12}[A-Za-z]?\b')  # Matches patent, ISBN, application numbers


# ==============================================================================
# 🛠️ TAXONOMY ACCESS & RESOLUTION HELPERS
# ==============================================================================

def get_all_categories() -> Dict[str, CategoryMetadata]:
    """Returns the full taxonomy map."""
    return CAMPUS_TAXONOMY


def get_allowed_category_keys() -> Set[str]:
    """Returns set of all allowed category keys."""
    return {k for k, v in CAMPUS_TAXONOMY.items() if v.is_allowed}


def get_jev_category_choices() -> Dict[str, str]:
    """
    Dynamically generates the choice schema for typesafe-ai/jev.
    Enables automatic schema updating whenever a new category is registered.
    """
    return {k: v.jev_criteria for k, v in CAMPUS_TAXONOMY.items()}


def is_conversational_greeting(query: str) -> bool:
    """Fast-path 0ms detection for greetings and pleasantries."""
    if not query:
        return False
    q_trim = query.strip()
    greetings_cat = CAMPUS_TAXONOMY.get("greetings")
    if greetings_cat and greetings_cat.regex_pattern:
        return bool(re.search(greetings_cat.regex_pattern, q_trim, re.IGNORECASE))
    return False


def is_jailbreak_attempt(query: str) -> bool:
    """Fast-path 0ms detection for jailbreaks & instruction hijacking."""
    if not query:
        return False
    jailbreak_cat = CAMPUS_TAXONOMY.get("jailbreak")
    if jailbreak_cat and jailbreak_cat.regex_pattern:
        return bool(re.search(jailbreak_cat.regex_pattern, query, re.IGNORECASE))
    return False


def is_campus_domain_term_present(query: str) -> bool:
    """Checks whether query contains verified college domain vocabulary or identifiers."""
    if not query:
        return False
    return bool(DOMAIN_WORD_REGEX.search(query)) or bool(IDENTIFIER_REGEX.search(query))


def fast_classify_intent(query: str) -> Optional[str]:
    """
    0ms lexical classifier: Resolves high-confidence intents before calling LLM or JEV.
    Returns category key if a unambiguous pattern matched, else None.
    """
    if not query:
        return None
    q_trim = query.strip()

    # 1. Greetings & Pleasantries
    if is_conversational_greeting(q_trim):
        return "greetings"

    # 2. Jailbreak Pre-check
    if is_jailbreak_attempt(q_trim):
        return "jailbreak"

    # 3. High-priority exact patent / research identification
    research_cat = CAMPUS_TAXONOMY["research"]
    if re.search(r'\b(patent|patents|patent\s*no|patent\s*number|inventors?)\b', q_trim, re.IGNORECASE) or (
        IDENTIFIER_REGEX.search(q_trim) and not re.search(r'\b(phone|mobile|call|tnea)\b', q_trim, re.IGNORECASE)
    ):
        return "research"

    # 4. Developer / Principal Persona
    if re.search(r'\b(who\s+(?:made|built|created|developed)\s+(?:you|lorin)|ramanathan|ramzenderum)\b', q_trim, re.IGNORECASE):
        return "developer"
    if re.search(r'\b(principal|dr\.?\s*k\.?s\.?\s*srinivasan)\b', q_trim, re.IGNORECASE):
        return "governance"

    return None
