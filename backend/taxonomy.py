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
from typing import Dict, List, Optional, Set, Any, Tuple


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
        regex_pattern=r'^(?:hi+|he+y+|hello+|helo+|hola|namaste|vanakkam|salam|assalamu\s+alaikum|sup|yo|howdy|(?:good|gud|gd)\s+(?:morning|afternoon|evening|day|mrng|mng|aftn|evng|nite|night)|greetings|gm|ga|ge|gn|morning|afternoon|evening)(?:\s+(?:there|bot|lorin|assistant|sir|all|everyone|ai|bro|buddy))?[\s!.,?]*$|^(?:who\s+are\s+you|what\s+is\s+your\s+name|what\s+can\s+you\s+do|how\s+can\s+you\s+help|help\s*me|help|how\s+are\s+you|how\s+r\s+u|thank\s+you|thanks|thank\s+u|bye|goodbye|ok|okay)[\s!.,?]*$',
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

    # 5. Placements, Higher Studies, Internships & Recruiters
    "placements": CategoryMetadata(
        key="placements",
        label="Placements & Higher Studies",
        description="Campus placements, higher studies abroad, master's degree, top recruiters, salary packages (up to 8.5 LPA), placement cell training.",
        is_allowed=True,
        jev_criteria="Campus placements, higher studies abroad, master's degree, GRE/GATE, companies recruiting, salary packages, highest package, placement percentage, interview training, career cell, internships.",
        keywords=[
            "placement", "placements", "recruit", "recruiter", "recruiters", "salary",
            "package", "highest package", "average package", "lpa", "company", "companies",
            "job", "jobs", "internship", "internships", "training", "career", "career cell",
            "abroad", "higher studies", "master", "masters", "master's", "ms degree", "ms",
            "study abroad", "went abroad", "foreign university", "gre", "toefl", "ielts", "gate",
            "alumni", "higher education", "postgraduate",
            "tcs", "infosys", "wipro", "cognizant", "zoho", "kaar tech"
        ],
        regex_pattern=r'\b(placements?|recruiters?|salary|packages?|lpa|hiring|internships?|career\s+cell|job\s+offers?|higher\s+studies|masters?|abroad|ms|alumni|study\s+abroad)\b',
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
            "bus", "buses", "route", "routes", "transport", "tranport", "transpot", "driver", "drivers",
            "stops", "pickup", "drop", "boarding", "travel", "commute", "mtc",
            "van", "ar 3", "ar 4", "ar 5", "ar 6", "ar 7", "ar 8", "ar 9", "ar 10", "r 22",
            "transport officer", "transport convener", "transport incharge", "bus incharge", "santhosh nathan",
            "uthiramerur", "moolakadai", "anna nagar", "icf", "chunambedu", "manjambakkam",
            "ennore", "porur", "nemilichery", "siruseri", "8:00 am"
        ],
        regex_pattern=r'\b(bus|buses|transport|tranport|transpot|route|routes|driver|drivers|stops?|boarding|pickup|commute|convener|incharge|in-charge|transport\s*officer)\b|\b(?:Route\s+)?(AR[\s\-]?\d+|R[\s\-]?\d+|MTC\s+\d+[A-Z]*)\b',
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
        description="Ramanathan S. (Ram / Rama / ramzenderum, B.Tech IT), developer and creator of Lorin AI, technology stack, portfolio, GitHub.",
        is_allowed=True,
        jev_criteria="Inquiries about the developer Ramanathan S. (Ram, Rama, ramzenderum), creator of Lorin AI, portfolio, tech stack, architecture.",
        keywords=[
            "developer", "creator", "who made you", "who created you", "who built you",
            "who developed you", "who programmed you", "who is ram", "who is rama",
            "who is ramanathan", "ramanathan", "ramanathan s", "ramzenderum", "ramzendrum",
            "ram", "rama", "lorin ai creator", "developer portfolio", "github"
        ],
        regex_pattern=r'\b(developer|creator|author|who\s+(?:made|built|created|developed|programmed|coded)\s+(?:you|lorin|this\s+bot|the\s+bot|this\s+ai|the\s+ai)|who\s+is\s+(?:ram|rama|ramanathan|ramzenderum|ramzendrum)|ramanathan|ramzenderum|ramzendrum|\bram\b|\brama\b)\b',
        target_domains=["developer", "general"]
    ),

    # 15. Institutional Overview & About MSAJCE
    "institutional_overview": CategoryMetadata(
        key="institutional_overview",
        label="Institutional Overview & About MSAJCE",
        description="High-level overview of Mohamed Sathak A.J. College of Engineering (MSAJCE), history, vision, mission, accreditation, location in SIPCOT IT Park Siruseri, and campus highlights.",
        is_allowed=True,
        jev_criteria="General inquiry about Mohamed Sathak A.J. College of Engineering (MSAJCE), overview of the college, about MSAJCE, background, establishment, location, or why to join.",
        keywords=[
            "about", "overview", "college overview", "tell me about your college",
            "tell me about college", "tell me abt ur college", "about msajce", "about msajcea",
            "what is msajce", "tell me about mohamed sathak", "college info", "about the college",
            "why join msajce", "why choose msajce", "college background", "institution"
        ],
        regex_pattern=r'\b(about\s+(?:the\s+)?college|about\s+msajce|about\s+msajcea|tell\s+me\s+ab?o?u?t\s+(?:your\s+|ur\s+)?college|overview\s+of\s+(?:the\s+)?college|what\s+is\s+msajce|why\s+join\s+msajce|why\s+choose\s+msajce)\b',
        target_domains=["about", "general"]
    ),

    # 16. General Campus & Academic Guidance
    "general": CategoryMetadata(
        key="general",
        label="General Campus & Academic Guidance",
        description="General student questions, engineering guidance, academic advice, career skills, college hours, and campus inquiries.",
        is_allowed=True,
        jev_criteria="General campus guidance, student life, study advice, engineering disciplines, career tips, college info.",
        keywords=[
            "college", "campus", "guidance", "engineering", "study", "skills",
            "student", "students", "timing", "timings", "working hours", "chennai"
        ],
        regex_pattern=r'\b(college|campus|student|students|guidance|engineering|degree|study|skills?)\b',
        target_domains=["general"]
    ),

    # 17. Off-Topic Inquiries (Disallowed - Refused with College Boundary)
    "off_topic": CategoryMetadata(
        key="off_topic",
        label="Off-Topic Inquiry",
        description="Queries unrelated to MSAJCE or college education (arbitrary code generation, math problems, cooking, crypto, politics, movies, gaming, general trivia).",
        is_allowed=False,
        jev_criteria="Clearly unrelated to MSAJCE, higher education admissions, engineering degrees, or campus life (e.g. writing arbitrary code/HTML/Python scripts, solving homework/math, recipes, cryptocurrency, politics, external gossip).",
        keywords=[
            "write code", "html code", "python code", "solve math", "calculate",
            "crypto", "bitcoin", "ethereum", "stock market", "trading",
            "recipe", "how to bake", "cake", "cook", "movie review",
            "who won the match", "president of", "prime minister of", "capital of"
        ],
        regex_pattern=r'\b(write\s+(?:a\s+)?code|html\s+code|python\s+code|crypto|bitcoin|trading|stock\s+market|recipe\s+for|how\s+to\s+bake|who\s+won\s+the\s+match|capital\s+of\s+[A-Za-z]+)\b',
        target_domains=[],
        refusal_message="I am Lorin AI, the official campus assistant for Mohamed Sathak A.J. College of Engineering (MSAJCE). I am exclusively designed to assist with MSAJCE admissions, academic departments, degree programs, placements, fee structures, bus routes, hostels, and campus facilities. Please let me know if you have any questions about MSAJCE!"
    ),

    # 18. Security & Jailbreak Violations (Disallowed - Refused with Safety Policy)
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
        refusal_message="I cannot comply with that request. I strictly operate under official MSAJCE campus guidelines."
    )
}

# Precompile all regex patterns for 0ms execution
for cat in CAMPUS_TAXONOMY.values():
    if cat.regex_pattern:
        pass

# Dynamic Knowledge Entities Integration: auto-load alias phrases and words
import os
import json

def _load_knowledge_entity_aliases() -> Tuple[Set[str], List[str]]:
    """Loads all alias terms and entity names from knowledge_entities.json dynamically."""
    single_words = set()
    multi_words = []
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        ke_path = os.path.join(base_dir, "data", "knowledge_entities.json")
        if os.path.exists(ke_path):
            with open(ke_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            for ent in data:
                for a in ent.get("aliases", []):
                    a_clean = a.lower().strip()
                    if not a_clean:
                        continue
                    if len(a_clean.split()) > 1:
                        multi_words.append(a_clean)
                    else:
                        if len(a_clean) >= 3 and a_clean not in {"the", "and", "for", "with", "this", "that", "code", "file", "header", "size", "basic", "text"}:
                            single_words.add(a_clean)
    except Exception:
        pass
    return single_words, multi_words

ENTITY_SINGLE_WORDS, ENTITY_MULTI_WORDS = _load_knowledge_entity_aliases()

# Comprehensive word-boundary domain whitelist for high-precision verification
CAMPUS_DOMAIN_TERMS: Set[str] = {
    # Core College & Campus
    'msajcea', 'msajce', 'college', 'colleges', 'campus', 'campuses', 'siruseri', 'omr', 'chennai',
    'mohamed sathak', 'sathak', 'trust', 'office', 'admin', 'principal', 'srinivasan', 'head', 'dean',
    # Creator & Developer
    'ram', 'rama', 'ramanathan', 'ramzenderum', 'ramzendrum', 'developer', 'creator', 'author', 'architect',
    # Admissions & Quotas
    'admission', 'admissions', 'fee', 'fees', 'tuition', 'tnea', '1301', 'cutoff', 'cutoffs',
    'counselling', 'counseling', 'quota', 'quotas', 'seat', 'seats', 'intake', 'allotment',
    'first graduate', 'fg', 'scholarship', 'scholarships', 'waiver', 'concession', 'lateral entry',
    'eligibility', 'documents', 'certificate', 'certificates', 'bonafide', 'merit',
    # Academics, Degrees & Exams
    'course', 'courses', 'department', 'departments', 'branch', 'branches', 'degree', 'degrees',
    'btech', 'b.tech', 'be', 'b.e', 'me', 'm.e', 'ug', 'pg', 'curriculum', 'syllabus', 'syllabi',
    'regulation', 'regulations', 'anna university', 'anna univ', 'semester', 'semesters',
    'exam', 'exams', 'grade', 'grades', 'gpa', 'cgpa', 'marks', 'credits', 'arrear', 'arrears',
    'lab', 'labs', 'laboratories', 'engineering',
    # Engineering Disciplines & Programs
    'cse', 'computer science', 'information technology', 'ece', 'eee', 'mech', 'mechanical', 'civil',
    'cyber security', 'ai&ds', 'ai&ml', 'csbs', 'vlsi', 'applied electronics', 'structural engineering',
    # Placements, Careers & Recruiters
    'placement', 'placements', 'recruit', 'recruiter', 'recruiters', 'recruitment', 'salary',
    'package', 'packages', 'lpa', 'hiring', 'interview', 'interviews', 'internship', 'internships',
    'career', 'careers', 'tcs', 'infosys', 'wipro', 'cognizant', 'zoho', 'kaar tech',
    # Campus Life, Hostels & Facilities
    'hostel', 'hostels', 'room', 'rooms', 'warden', 'canteen', 'mess', 'food', 'dining',
    'library', 'books', 'delnet', 'ieee', 'bus', 'buses', 'route', 'routes', 'transport', 'driver',
    'pickup', 'stop', 'stops', 'commute', 'sports', 'cricket', 'football', 'basketball', 'volleyball',
    'gym', 'gymnasium', 'fest', 'sathak fest', 'cultural', 'culturals', 'symposium', 'workshop',
    'club', 'clubs', 'rotaract', 'nss', 'yrc', 'wifi', 'auditorium', 'timing', 'timings', 'rules',
    # Research, Patents & Accreditations
    'patent', 'patents', 'research', 'copyright', 'copyrights', 'publication', 'publications',
    'paper', 'papers', 'journal', 'journals', 'inventor', 'inventors', 'supervisor', 'supervisors',
    'phd', 'dhiravidachelvi', 'funded project', 'tnscst', 'nba', 'naac', 'aicte', 'accreditation'
}
CAMPUS_DOMAIN_TERMS.update(ENTITY_SINGLE_WORDS)

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
    """Checks whether query contains verified college domain vocabulary, knowledge entities, or identifiers."""
    if not query:
        return False
    q_lower = query.lower().strip()

    # 1. Multi-word entity aliases match (e.g. "who is ram", "dr ks srinivasan", "central library")
    for phrase in ENTITY_MULTI_WORDS:
        if phrase in q_lower:
            return True

    # 2. Domain words or numeric identifier regex
    return bool(DOMAIN_WORD_REGEX.search(query)) or bool(IDENTIFIER_REGEX.search(query))


def fast_classify_intent(query: str) -> Optional[str]:
    """
    0ms lexical classifier: Resolves high-confidence intents before calling LLM or JEV.
    Returns category key if an unambiguous pattern matched, else None.
    """
    if not query:
        return None
    q_trim = query.strip()
    q_lower = q_trim.lower()

    # 1. Greetings & Pleasantries
    if is_conversational_greeting(q_trim):
        return "greetings"

    # 2. Jailbreak Pre-check
    if is_jailbreak_attempt(q_trim):
        return "jailbreak"

    # 2.5 Institutional Overview / About College
    if re.search(r'\b(about\s+(?:the\s+)?college|about\s+msajce|about\s+msajcea|tell\s+me\s+ab?o?u?t\s+(?:your\s+|ur\s+)?college|overview\s+of\s+(?:the\s+)?college|what\s+is\s+msajce|why\s+join\s+msajce|why\s+choose\s+msajce|college\s+overview)\b', q_lower, re.IGNORECASE):
        return "institutional_overview"

    # 3. High-priority exact patent / research identification
    if re.search(r'\b(patent|patents|patent\s*no|patent\s*number|inventors?)\b', q_trim, re.IGNORECASE) or (
        IDENTIFIER_REGEX.search(q_trim) and not re.search(r'\b(phone|mobile|call|tnea)\b', q_trim, re.IGNORECASE)
    ):
        return "research"

    # 4. Developer / Creator Persona (Ram, Rama, Ramanathan)
    if re.search(r'\b(who\s+(?:made|built|created|developed|programmed|coded)\s+(?:you|lorin|this\s+bot|the\s+bot|this\s+ai|the\s+ai)|who\s+is\s+(?:ram|rama|ramanathan|ramzenderum|ramzendrum)|ramanathan|ramzenderum|ramzendrum|\bram\b|\brama\b)\b', q_trim, re.IGNORECASE):
        return "developer"

    # 5. Principal / Leadership
    if re.search(r'\b(principal|dr\.?\s*k\.?s\.?\s*srinivasan)\b', q_trim, re.IGNORECASE):
        return "governance"

    # 6. Hostel & Living
    if re.search(r'\b(hostel|hostels|boys\s+hostel|girls\s+hostel|warden|wardens|room\s+types|room\s+capacity|sharing|non-ac|hostellers)\b', q_trim, re.IGNORECASE):
        return "hostel"

    # 7. Dining Mess & Canteen
    if re.search(r'\b(mess|canteen|dining|cafeteria|food\s+menu|meal\s+timings?)\b', q_trim, re.IGNORECASE):
        return "canteen"

    # 8. Transport & Bus Routes
    if re.search(r'\b(bus|buses|transport|tranport|transpot|convener|incharge|pickup|drop|boarding|commute|route|routes|mtc|driver|drivers|stops?)\b', q_trim, re.IGNORECASE) or re.search(r'\b(?:Route\s+)?(AR[\s\-]?\d+|R[\s\-]?\d+)\b', q_trim, re.IGNORECASE):
        return "transport"

    # 9. Admissions & Cutoffs
    if re.search(r'\b(admission|admissions|cutoff|cut-off|cut\s+off|tnea|1301|counselling|counseling|eligibility|lateral\s+entry|seat\s+matrix|intake)\b', q_trim, re.IGNORECASE):
        return "admissions"

    # 10. Placements & Careers
    if re.search(r'\b(placement|placements|recruiter|recruiters|salary|package|packages|lpa|hiring|internship|internships|highest\s+package)\b', q_trim, re.IGNORECASE):
        return "placements"

    # 11. Fees & Scholarships
    if re.search(r'\b(fee|fees|tuition|scholarship|scholarships|first\s+graduate|concession|waiver)\b', q_trim, re.IGNORECASE):
        return "fees"

    # 12. Academics & Departments
    if re.search(r'\b(courses?|departments?|branch|branches|curriculum|syllabus|anna\s+university|cse|it\s+dept|ece|eee|mech|civil|ai&ds|cyber|b\.?tech|b\.?e)\b', q_trim, re.IGNORECASE):
        return "academics"

    # 13. Campus Facilities & Infrastructure
    if re.search(r'\b(library|central\s+library|delnet|ieee|labs?|laboratories|ios\s+lab|auditorium|smart\s+classrooms?|campus\s+infrastructure|facilities)\b', q_trim, re.IGNORECASE):
        return "infrastructure"

    # 14. Sports & Athletics
    if re.search(r'\b(sports|games|cricket|football|basketball|volleyball|gym|gymnasium|badminton|physical\s+education)\b', q_trim, re.IGNORECASE):
        return "sports"

    return None
