"""
Deterministic Query Normalization & Expansion Module for Lorin AI
===================================================================
Provides deterministic acronym expansion and alias lookup using verified entity metadata
(e.g., UBA -> Unnat Bharat Abhiyan, CSE -> Computer Science and Engineering)
without unconstrained LLM hallucinations.
"""

import json
import os
import re
from difflib import SequenceMatcher
from typing import List, Dict, Any

# Institutional Acronyms & Verified Aliases Dictionary
ACRONYM_MAP: Dict[str, str] = {
    "uba": "Unnat Bharat Abhiyan UBA Cell village adoption Siruseri",
    "unnat bharat": "Unnat Bharat Abhiyan Cell village adoption Siruseri",
    "naac": "National Assessment and Accreditation Council NAAC Grade A+ accredited",
    "nba": "National Board of Accreditation NBA accredited department",
    "tnea": "Tamil Nadu Engineering Admissions TNEA Counselling Code 1301",
    "tnea code": "TNEA Counselling Code 1301 Mohamed Sathak A.J. College of Engineering",
    "1301": "TNEA Counselling Code 1301 Mohamed Sathak A.J. College of Engineering",
    "msajce": "Mohamed Sathak A.J. College of Engineering",
    "msajcea": "Mohamed Sathak A.J. College of Engineering and Architecture",
    "ajce": "Mohamed Sathak A.J. College of Engineering",
    "cse": "Computer Science and Engineering B.E. CSE department intake 60",
    "it": "Information Technology B.Tech IT department intake 60",
    "ece": "Electronics and Communication Engineering B.E. ECE department intake 60",
    "eee": "Electrical and Electronics Engineering B.E. EEE department intake 30",
    "mech": "Mechanical Engineering B.E. MECH department intake 60",
    "civil": "Civil Engineering B.E. CIVIL department intake 30",
    "aids": "Artificial Intelligence and Data Science B.Tech AI & DS department intake 60",
    "ai&ds": "Artificial Intelligence and Data Science B.Tech AI & DS department intake 60",
    "ai and ds": "Artificial Intelligence and Data Science B.Tech AI & DS department intake 60",
    "aiml": "Artificial Intelligence and Machine Learning B.Tech AI & ML department intake 60",
    "ai&ml": "Artificial Intelligence and Machine Learning B.Tech AI & ML department intake 60",
    "csbs": "Computer Science and Business Systems B.Tech CSBS department intake 30",
    "cyber": "Cyber Security B.E. Cyber Security department intake 30",
    "b.arch": "Bachelor of Architecture B.Arch 5 year degree",
    "b.des": "Bachelor of Design B.Des 4 year degree",
    "iqac": "Internal Quality Assurance Cell IQAC Dr K S Srinivasan Principal",
    "nss": "National Service Scheme NSS social service camp",
    "ncc": "National Cadet Corps NCC unit",
    "csi": "Computer Society of India CSI Chapter",
    "landline": "landline phone number 044-27476300 contact office",
    "helpline": "admission helpline number 9940004500 contact phone",
    "affiliation": "affiliated to Anna University Chennai approved by AICTE",
    "established": "established in year 2001 Mohamed Sathak Trust",
    "principal": "Dr. K.S. Srinivasan Principal Mohamed Sathak A.J. College of Engineering",
    "hostel": "boys hostel girls hostel fees facilities mess menu Siruseri campus"
}

_ENTITY_LOOKUP_CACHE: Dict[str, List[Dict[str, Any]]] = {}

def load_entity_dictionary() -> List[Dict[str, Any]]:
    """Loads knowledge entities from backend/data/knowledge_entities.json."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(base_dir, "data", "knowledge_entities.json")
    if not os.path.exists(file_path):
        return []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[WARN] Error loading knowledge_entities.json: {e}")
        return []

def get_deterministic_query_variants(query: str) -> List[str]:
    """
    Returns deterministic query variants by expanding verified acronyms and aliases.
    Example: "UBA" -> ["UBA", "Unnat Bharat Abhiyan"]
    """
    if not query:
        return [query]
    
    q_clean = query.strip()
    q_lower = q_clean.lower()
    variants = [q_clean]

    # Check for direct acronym matches
    tokens = re.findall(r'\b[a-z0-9]+\b', q_lower)
    for token in tokens:
        if token in ACRONYM_MAP:
            expanded = ACRONYM_MAP[token]
            if expanded not in variants:
                variants.append(expanded)
                # Also create a combined variant
                combined = re.sub(rf'\b{re.escape(token)}\b', expanded, q_clean, flags=re.IGNORECASE)
                if combined not in variants:
                    variants.append(combined)

    return list(dict.fromkeys(variants))

def fuzzy_find_alias(term: str, entities: List[Dict[str, Any]], threshold: float = 0.85) -> List[Dict[str, Any]]:
    """
    Performs fuzzy Levenshtein distance matching against verified entity aliases to handle typos.
    """
    t_clean = term.lower().strip()
    if len(t_clean) < 3:
        return []

    matched = []
    for ent in entities:
        aliases = ent.get("aliases", [])
        name = ent.get("entity_name", "").lower()
        key = ent.get("entity_key", "").lower()

        candidates = aliases + [name, key]
        for cand in candidates:
            score = SequenceMatcher(None, t_clean, cand.lower()).ratio()
            if score >= threshold:
                matched.append(ent)
                break
    return matched

def normalize_query_representation(query: str, conversation_history: List[Dict[str, str]] = None) -> Dict[str, Any]:
    """
    Builds a deterministic normalized query representation extracting typed slots:
    years, dates, locations, roles, departments, degrees, numbers, requested_attributes, and query_type.
    """
    if not query:
        return {
            "original_query": "",
            "standalone_query": "",
            "entities": [],
            "aliases": [],
            "acronyms": [],
            "years": [],
            "dates": [],
            "locations": [],
            "roles": [],
            "departments": [],
            "degrees": [],
            "numbers": [],
            "requested_attributes": [],
            "query_type": "single_fact"
        }

    q_clean = query.strip()
    q_low = q_clean.lower()

    # 1. Resolve context / standalone query if follow-up
    standalone_q = q_clean
    if conversation_history:
        last_turn = conversation_history[-1].get("content", "") if conversation_history else ""
        if any(w in q_low for w in ["what about", "how about", "and for", "its", "their", "where is it", "fee for that"]):
            subj_match = re.search(r'\b(hostel|fees?|placement|admission|bus|route|canteen|library|principal|iqac)\b', last_turn, re.I)
            if subj_match:
                standalone_q = f"{q_clean} regarding {subj_match.group(1)}"

    # 2. Extract Years & Dates
    years = re.findall(r'\b(20\d\d|19\d\d)\b', q_clean)

    # 3. Extract Locations & Cities
    known_locations = {
        "siruseri", "padur", "chennai", "omr", "bangalore", "hyderabad", "mumbai", "delhi",
        "pondicherry", "vellore", "mysore", "paris", "dubai", "singapore", "tokyo", "madurai",
        "kanchipuram", "sydney", "berlin", "london", "california", "everest", "mars", "jupiter"
    }
    locations = [w for w in known_locations if w in q_low]

    # 4. Extract Roles
    known_roles = [
        "dean", "cfo", "director", "warden", "principal", "president", "ceo",
        "chief ai officer", "lead drone operator", "vice chancellor", "hod", "head of department"
    ]
    roles = [r for r in known_roles if r in q_low]

    # 5. Extract Departments
    known_departments = {
        "cse", "it", "ece", "eee", "mech", "civil", "aids", "ai&ds", "ai and ds", "aiml", "csbs",
        "cyber", "biotechnology", "aerospace", "marine", "architecture", "quantum", "nuclear"
    }
    departments = [d for d in known_departments if d in q_low]

    # 6. Extract Degrees
    known_degrees = ["b.e", "b.tech", "m.e", "m.tech", "b.arch", "b.des", "phd", "diploma", "undergraduate", "postgraduate"]
    degrees = [deg for deg in known_degrees if deg in q_low]

    # 7. Extract Acronyms & Entities
    tokens = re.findall(r'\b[a-z0-9]+\b', q_low)
    acronyms = [t for t in tokens if t in ACRONYM_MAP]
    aliases = [ACRONYM_MAP[t] for t in acronyms if t in ACRONYM_MAP]

    # 8. Extract Numeric Slots / Fees
    numbers = re.findall(r'\b(\d+k?|rs\.?\s*\d+|\$\d+)\b', q_low)

    # 9. Classify Query Type
    query_type = "single_fact"
    if any(w in q_low for w in ["bus", "route", "timing", "stop", "pickup", "drop"]):
        query_type = "transport"
    elif any(w in q_low for w in ["compare", "difference", "versus", "vs", "better"]):
        query_type = "comparison"
    elif any(w in q_low for w in ["list", "all departments", "which courses", "enlist", "names of"]):
        query_type = "list"
    elif any(w in q_low for w in ["fee", "intake", "seat", "table", "cutoff", "percentage", "rate"]):
        query_type = "structured_table"
    elif len(re.findall(r'\b(and|who is the.*that|department.*offers|hod of)\b', q_low)) >= 1:
        query_type = "multi_hop"

    return {
        "original_query": q_clean,
        "standalone_query": standalone_q,
        "entities": list(set(departments + roles + degrees)),
        "aliases": aliases,
        "acronyms": acronyms,
        "years": list(set(years)),
        "dates": [],
        "locations": locations,
        "roles": roles,
        "departments": departments,
        "degrees": degrees,
        "numbers": numbers,
        "requested_attributes": ["fee", "intake", "location", "hod", "principal", "route"] if any(w in q_low for w in ["fee", "intake", "where", "hod", "principal", "route"]) else [],
        "query_type": query_type
    }
