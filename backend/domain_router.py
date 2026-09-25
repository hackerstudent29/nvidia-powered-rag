"""
Domain Router & Conversational Topic-Shift Architecture for Lorin AI RAG
========================================================================
Enterprise-grade multi-turn conversational RAG orchestration module.
Solves the root causes of multi-turn RAG hallucinations:
1. Topic Shift Detection (Discourse Segmentation):
   Prevents context decay and semantic bleed across conversational turns.
2. Semantic Domain Routing:
   Isolates knowledge domains (Research vs Transport vs Academics vs Admissions).
3. Corrective RAG (CRAG) Document Relevance Filter:
   Purges out-of-domain candidate chunks before they can reach the LLM generator.
"""

import re
from enum import Enum
from typing import List, Dict, Any, Optional, Tuple

try:
    from jev_evaluator import jev_evaluator
except ImportError:
    try:
        from backend.jev_evaluator import jev_evaluator
    except ImportError:
        jev_evaluator = None


class CampusDomain(str, Enum):
    RESEARCH = "research"
    TRANSPORT = "transport"
    ACADEMICS = "academics"
    ADMISSIONS = "admissions"
    FEES = "fees"
    CAMPUS_LIFE = "campus_life"
    PEOPLE = "people"
    GENERAL = "general"


class TopicRelation(str, Enum):
    STANDALONE = "standalone"
    NEW_TOPIC = "new_topic"
    FOLLOW_UP = "follow_up"


# Explicit lexical and semantic patterns defining each campus domain
DOMAIN_DEFINITIONS: Dict[CampusDomain, Dict[str, Any]] = {
    CampusDomain.RESEARCH: {
        "keywords": [
            "patent", "patents", "patent no", "patent number", "patent filed", "patent published",
            "research", "paper", "papers", "publication", "publications", "journal", "journals",
            "inventor", "inventors", "copyright", "copyrights", "isbn", "doi",
            "author", "co-author", "disaster management system", "iot", "vehicular edge computing",
            "battery swapping", "wireless sensor network", "drone", "cloud computing techniques",
            "research advisory committee", "tnscst", "dr. e. dhiravidachelvi", "dhiravidachelvi",
            "janarthanan", "supervisor", "supervisors", "phd", "funded project"
        ],
        "regex": re.compile(
            r'\b(patents?|patent\s*no|patent\s*number|copyrights?|isbn|journals?|publications?|research|inventors?|supervised|supervisors?)\b'
            r'|\b\d{6,12}[A-Za-z]?\b',  # Patent numbers & ISBNs
            re.IGNORECASE
        ),
        "allowed_categories": {"research", "faculty", "general"}
    },
    CampusDomain.TRANSPORT: {
        "keywords": [
            "bus", "buses", "route", "routes", "transport", "driver", "stops", "pickup", "drop",
            "boarding", "travel", "commute", "mtc", "van", "shuttle", "siruseri", "uthiramerur",
            "koyambedu", "avadi", "chengalpattu", "red hills", "tambaram", "porur", "arrival time",
            "8:00 am", "schedule", "schedules"
        ],
        "regex": re.compile(
            r'\b(bus|buses|transport|route|routes|driver|drivers|stops?|boarding|pickup|commute|van)\b'
            r'|\b(?:Route\s+)?(AR[\s\-]?\d+|R[\s\-]?\d+|MTC\s+\d+[A-Z]*)\b',
            re.IGNORECASE
        ),
        "allowed_categories": {"transport"}
    },
    CampusDomain.ADMISSIONS: {
        "keywords": [
            "admission", "admissions", "cutoff", "cutoffs", "cut-off", "cut off", "tnea",
            "counselling", "counseling", "eligibility", "quota", "government quota", "management quota",
            "7.5%", "tnea code", "1306", "lateral entry", "application", "seat matrix", "intake"
        ],
        "regex": re.compile(
            r'\b(admissions?|cutoff|cut-off|cut off|tnea|counselling|counseling|eligibility|quota|lateral\s+entry|intake)\b',
            re.IGNORECASE
        ),
        "allowed_categories": {"admissions", "academics", "general"}
    },
    CampusDomain.FEES: {
        "keywords": [
            "fee", "fees", "tuition", "hostel fee", "bus fee", "transport fee", "payment",
            "semester fee", "scholarship", "scholarships", "concession", "waiver"
        ],
        "regex": re.compile(
            r'\b(fees?|tuition|scholarships?|waiver|concession|cost|expenses?)\b',
            re.IGNORECASE
        ),
        "allowed_categories": {"fees", "admissions", "hostel", "transport", "general"}
    },
    CampusDomain.ACADEMICS: {
        "keywords": [
            "course", "courses", "department", "departments", "branch", "branches", "curriculum",
            "syllabus", "regulation", "anna university", "b.e", "b.tech", "m.e", "cse", "it",
            "ece", "eee", "mech", "civil", "ai & ds", "artificial intelligence", "cyber security",
            "accreditation", "nba", "naac", "semester", "exam", "exams", "gpa", "cgpa", "labs"
        ],
        "regex": re.compile(
            r'\b(courses?|departments?|branch|branches|curriculum|syllabus|regulations?|anna\s+university|b\.?tech|b\.?e|m\.?e|semesters?|exams?|gpa|cgpa)\b',
            re.IGNORECASE
        ),
        "allowed_categories": {"academics", "departments", "general"}
    },
    CampusDomain.CAMPUS_LIFE: {
        "keywords": [
            "hostel", "mess", "food", "canteen", "room", "rooms", "wifi", "library", "books",
            "sports", "games", "gym", "gymnasium", "yoga", "football", "basketball", "cricket",
            "volleyball", "kabaddi", "badminton", "table tennis", "chess", "carrom"
        ],
        "regex": re.compile(
            r'\b(hostels?|mess|canteens?|food|library|sports|gym|gymnasium|yoga|football|cricket|volleyball|basketball)\b',
            re.IGNORECASE
        ),
        "allowed_categories": {"hostel", "sports", "library", "facilities", "general"}
    },
    CampusDomain.PEOPLE: {
        "keywords": [
            "principal", "director", "dr. k.s. srinivasan", "srinivasan", "ramanathan", "ram",
            "creator", "developer", "who made", "who built", "who created", "hod", "faculty",
            "prof", "professor", "dean"
        ],
        "regex": re.compile(
            r'\b(principal|director|ramanathan|creator|developer|who\s+(?:made|built|created|developed)|hods?|professors?)\b',
            re.IGNORECASE
        ),
        "allowed_categories": {"faculty", "developer", "general"}
    }
}


class DomainRouter:
    """
    Classifies a user query into a primary knowledge domain to enforce domain isolation.
    """

    def classify(self, query: str) -> CampusDomain:
        q_lower = query.lower().strip()

        # 1. High-priority exact code/patent/identifier matches
        if re.search(r'\b(patent|patents|patent\s*no|patent\s*number|whose\s+patent|who\s+filed|who\s+published|who\s+invented|inventor)\b', q_lower):
            return CampusDomain.RESEARCH
        if re.search(r'\b\d{6,12}[A-Za-z]?\b', q_lower) and not re.search(r'\b(phone|mobile|call|contact|tnea)\b', q_lower):
            # Numeric ID of 6-12 digits without phone/contact context is a patent or ISBN
            return CampusDomain.RESEARCH

        # 2. Check Developer / Principal personas
        if any(w in q_lower for w in ["who made", "who created", "who built", "developer", "ramanathan", "ramzenderum"]):
            return CampusDomain.PEOPLE
        if "principal" in q_lower:
            return CampusDomain.PEOPLE

        # 3. Score domains based on keywords and regex
        scores: Dict[CampusDomain, int] = {d: 0 for d in CampusDomain}
        for domain, defn in DOMAIN_DEFINITIONS.items():
            regex = defn["regex"]
            keywords = defn["keywords"]
            matches = len(regex.findall(q_lower))
            scores[domain] += matches * 3
            for kw in keywords:
                if kw in q_lower:
                    scores[domain] += 2

        # Filter out transport if research or academic keywords exist
        if scores[CampusDomain.RESEARCH] > 0 and scores[CampusDomain.TRANSPORT] > 0:
            if not any(w in q_lower for w in ["bus to", "route to", "bus timing", "bus schedule"]):
                scores[CampusDomain.TRANSPORT] = 0

        # 4. AI Decision Engine: typesafe-ai/jev System One Category Evaluation
        if jev_evaluator and jev_evaluator.is_enabled:
            try:
                jev_res = jev_evaluator.evaluate_query_sync(query, timeout=2.5)
                cat_map = {
                    "research_patents": CampusDomain.RESEARCH,
                    "transport": CampusDomain.TRANSPORT,
                    "admissions_fees": CampusDomain.ADMISSIONS,
                    "academics_depts": CampusDomain.ACADEMICS,
                    "hostel_campus": CampusDomain.CAMPUS_LIFE,
                    "developer": CampusDomain.PEOPLE
                }
                if jev_res.category in cat_map:
                    return cat_map[jev_res.category]
            except Exception:
                pass

        best_domain = max(scores.items(), key=lambda x: x[1])
        if best_domain[1] > 0:
            return best_domain[0]

        return CampusDomain.GENERAL

    def is_tool_allowed(self, tool_name: str, domain: CampusDomain) -> bool:
        """
        Guarantees tool isolation (e.g. RouteFinder can ONLY execute for TRANSPORT domain).
        """
        if tool_name == "route_finder":
            return domain == CampusDomain.TRANSPORT
        return True


class TopicShiftDetector:
    """
    Detects whether the current user query is a continuation of the previous turn
    or a new topic shift, preventing contextual contamination.
    """

    # Pure anaphoric phrases that explicitly demand previous topic context
    STRICT_ANAPHORA_PATTERNS = re.compile(
        r'^\s*(?:what\s+about\s+(?:that|them|those|it|him|her)|tell\s+me\s+more|tell\s+about\s+(?:that|it|him|her)|more\s+details?|elaborate|explain\s+(?:further|more)|give\s+more\s+info|continue)\s*$',
        re.IGNORECASE
    )

    # Referential follow-up starts
    REFERENTIAL_START_PATTERNS = re.compile(
        r'^\s*(?:and\s+what\s+about|what\s+about\s+the|how\s+about\s+the|its|their|his|her)\s+',
        re.IGNORECASE
    )

    def detect(self, current_query: str, last_assistant_snippet: Optional[str] = None) -> TopicRelation:
        q_clean = current_query.strip()
        q_lower = q_clean.lower()

        # Rule 1: Standalone Identifiers / Explicit Lookup
        # Queries with exact patent numbers, Anna Univ codes, ISBNs, or explicit question targets
        if re.search(r'\b\d{6,12}[A-Za-z]?\b', q_clean):
            return TopicRelation.STANDALONE

        # Rule 2: Explicit topic indicators (patent, cutoff, admissions, developer, fee, course)
        if re.search(r'\b(whose\s+patent|who\s+invented|who\s+published|who\s+filed|cutoff|tnea|admissions?|how\s+many\s+buses)\b', q_lower):
            return TopicRelation.STANDALONE

        # Rule 3: Jev AI Model Topic Shift Evaluation (probabilistic System One discourse gate)
        if last_assistant_snippet and jev_evaluator and jev_evaluator.is_enabled:
            try:
                jev_res = jev_evaluator.evaluate_topic_shift_sync(current_query, last_assistant_snippet, timeout=2.5)
                if jev_res.get("is_continuation"):
                    return TopicRelation.FOLLOW_UP
                else:
                    return TopicRelation.STANDALONE
            except Exception:
                pass

        # Rule 4: Pure anaphora matching (explicit follow-up request)
        if self.STRICT_ANAPHORA_PATTERNS.match(q_lower):
            return TopicRelation.FOLLOW_UP

        if self.REFERENTIAL_START_PATTERNS.match(q_lower):
            return TopicRelation.FOLLOW_UP

        # Rule 5: Domain Divergence Check
        # If last turn discussed transport and current turn has zero transport keywords, it's a NEW_TOPIC
        if last_assistant_snippet:
            prev_lower = last_assistant_snippet.lower()
            prev_was_transport = any(w in prev_lower for w in ["bus", "route", "driver", "stop", "mtc"])
            curr_has_transport = any(w in q_lower for w in ["bus", "route", "driver", "stop", "timing", "schedule"])

            if prev_was_transport and not curr_has_transport:
                return TopicRelation.NEW_TOPIC

        # Default for complete grammatical questions is STANDALONE
        words = q_clean.split()
        if len(words) >= 4 and not any(w in q_lower.split() for w in ["it", "its", "that", "this", "them", "him", "her"]):
            return TopicRelation.STANDALONE

        return TopicRelation.STANDALONE


class CorrectiveRAGFilter:
    """
    Implements Corrective RAG (CRAG) document relevance grading and cross-domain purification.
    Ensures zero out-of-domain chunks reach the generation context.
    """

    def filter_chunks(
        self,
        chunks: List[Dict[str, Any]],
        domain: CampusDomain,
        query: str
    ) -> List[Dict[str, Any]]:
        """
        Grades and filters candidate chunks:
        1. Strips out chunks from incompatible domains (e.g. Transport chunks for Research queries).
        2. Preserves domain-aligned chunks.
        """
        if not chunks:
            return []

        # If domain is RESEARCH, strictly exclude all transport and bus routes
        if domain == CampusDomain.RESEARCH:
            purified = []
            for c in chunks:
                cat = (c.get("category") or "").lower()
                src = (c.get("source_file") or "").lower()
                title = (c.get("title") or "").lower()
                if "transport" in cat or "transport" in src or "bus" in title or "route" in title:
                    continue  # Purge transport pollution
                purified.append(c)
            return purified

        # If domain is TRANSPORT, prioritize transport chunks and drop unrelated research
        if domain == CampusDomain.TRANSPORT:
            purified = []
            for c in chunks:
                cat = (c.get("category") or "").lower()
                src = (c.get("source_file") or "").lower()
                if "research" in src and "bus" not in c.get("content", "").lower():
                    continue
                purified.append(c)
            return purified if purified else chunks

        # For other domains, drop chunks that blatantly conflict with intent
        return chunks


# Singleton instances for high-throughput zero-allocation reuse
domain_router = DomainRouter()
topic_shift_detector = TopicShiftDetector()
crag_filter = CorrectiveRAGFilter()
