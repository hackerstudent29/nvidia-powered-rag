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
    "yrc": "Youth Red Cross YRC unit social service blood donation camp",
    "rrc": "Red Ribbon Club RRC unit health awareness AIDS awareness",
    "ebsb": "Ek Bharat Shreshtha Bharat EBSB cultural exchange scheme student activity",
    "uba": "Unnat Bharat Abhiyan UBA Cell village adoption Siruseri rural development",
    "unnat bharat": "Unnat Bharat Abhiyan Cell village adoption Siruseri",
    "unat barat abiyan": "Unnat Bharat Abhiyan UBA Cell village adoption Siruseri rural development",
    "unat barat": "Unnat Bharat Abhiyan Cell village adoption Siruseri",
    "karma": "Kaushal Augmentation and Restructuring Model for Academics KARMA scheme AICTE skill development",
    "karma scheme": "Kaushal Augmentation and Restructuring Model for Academics KARMA scheme AICTE skill development",
    "iqac": "Internal Quality Assurance Cell IQAC Dr K S Srinivasan Principal quality management",
    "csbs": "Computer Science and Business Systems B.Tech CSBS department intake 30",
    "csi": "Computer Society of India CSI Chapter student branch",
    "nss": "National Service Scheme NSS social service camp community service",
    "ncc": "National Cadet Corps NCC unit drill training",
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
    "cyber": "Cyber Security B.E. Cyber Security department intake 30",
    "b.arch": "Bachelor of Architecture B.Arch 5 year degree",
    "b.des": "Bachelor of Design B.Des 4 year degree",
    "landline": "landline phone number 044-27476300 contact office",
    "helpline": "admission helpline number 9940004500 contact phone",
    "affiliation": "affiliated to Anna University Chennai approved by AICTE",
    "established": "established in year 2001 Mohamed Sathak Trust",
    "principal": "Dr. K.S. Srinivasan Principal Mohamed Sathak A.J. College of Engineering",
    "dr srinivasan": "Dr. K.S. Srinivasan Principal Anti-Ragging Committee Mohamed Sathak A.J. College of Engineering",
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
    Returns deterministic multi-view query variants:
    1. original_query
    2. normalized_query (canonical token replacement)
    3. expanded_query (full expansion)
    """
    if not query:
        return [query]
    
    q_clean = query.strip()
    q_lower = q_clean.lower()
    variants = [q_clean]

    # Context-scoped entity alias expansion for "Dr. Srinivasan" when query involves committee/principal/anti-ragging
    if "srinivasan" in q_lower and "k.s." not in q_lower:
        if any(w in q_lower for w in ["anti", "ragging", "committee", "head", "principal", "chairman", "who", "lead"]):
            q_clean_replaced = re.sub(r'\bdr\.?\s*srinivasan\b', "Dr. K.S. Srinivasan", q_clean, flags=re.IGNORECASE)
            q_clean_replaced = re.sub(r'\bsrinivasan\b', "Dr. K.S. Srinivasan", q_clean_replaced, flags=re.IGNORECASE)
            variants.append(q_clean_replaced)

    # Check for direct acronym and phrase matches in ACRONYM_MAP
    expanded_parts = []
    for term, expansion in ACRONYM_MAP.items():
        if re.search(rf'\b{re.escape(term)}\b', q_lower):
            expanded_parts.append(expansion)

    if expanded_parts:
        expanded_str = " ".join(expanded_parts)
        if expanded_str not in variants:
            variants.append(expanded_str)
        combined = f"{q_clean} {expanded_str}"
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

def resolve_conversational_followup(query: str, conversation_history: List[Dict[str, str]] = None) -> str:
    """
    Resolves conversational follow-up references, pronouns, omitted subjects,
    and omitted attributes before retrieval using structured conversation domain state.
    """
    if not query:
        return ""
    if not conversation_history:
        return query.strip()

    q_clean = query.strip()
    q_low = q_clean.lower()

    # Scan ENTIRE conversation history to extract structured active subject state
    all_user_text = []
    all_asst_text = []
    last_user = ""
    for msg in conversation_history:
        role = msg.get("role", "")
        content = msg.get("content", "")
        if role in ["user", "human"]:
            all_user_text.append(content)
            last_user = content
        elif role in ["assistant", "bot", "system"]:
            all_asst_text.append(content)

    full_history_text = " ".join(all_user_text + all_asst_text).lower()

    # Detect active subject / domain across conversation turns
    active_subject = None
    subject_keywords = [
        ("hostel", r'\bhostel\s*(?:fee|fees|facilities|mess|warden|location)?\b'),
        ("admission", r'\badmission\s*(?:fee|fees|process|eligibility)?\b'),
        ("bus route", r'\b(?:bus|route|transport|timing)\b'),
        ("placement", r'\b(?:placement|salary|recruiter|package)\b'),
        ("principal", r'\b(?:principal|head of institution)\b'),
        ("iqac", r'\biqac\b'),
        ("library", r'\blibrary\b'),
        ("canteen", r'\bcanteen\b'),
        ("cse department", r'\b(?:cse|computer science)\b'),
        ("it department", r'\b(?:it|information technology)\b'),
    ]

    for subj_label, pattern in subject_keywords:
        if re.search(pattern, full_history_text):
            active_subject = subj_label
            break

    # 1. Topic Continuation / Omitted Subject (e.g. "What about girls?", "And for boys?", "and boys?")
    if re.search(r'^\s*(?:what|how)\s+about\s+(.+)$', q_low, re.I):
        m = re.search(r'^\s*(?:what|how)\s+about\s+(.+)$', q_clean, re.I)
        target_spec = m.group(1).rstrip("?") if m else ""
        if active_subject:
            return f"What is the {active_subject} fee for {target_spec}?"
        elif last_user:
            return f"{last_user} - specifically for {target_spec}"

    if re.search(r'^\s*(?:and|what about)\s+(?:for\s+)?(.+)$', q_low, re.I):
        m = re.search(r'^\s*(?:and|what about)\s+(?:for\s+)?(.+)$', q_clean, re.I)
        target_spec = m.group(1).rstrip("?") if m else ""
        if active_subject:
            return f"What is the {active_subject} details for {target_spec}?"
        elif last_user:
            return f"{last_user} for {target_spec}"

    # 2. Specific follow-up role / location / timing queries ("who is the warden?", "where is it located?", "what are their timings?")
    if active_subject == "hostel":
        if re.search(r'\b(?:who|name|detail|details)\s+(?:is|are|of)?\s*(?:the|a)?\s*warden\b', q_low):
            return "Who is the hostel warden for boys and girls hostel?"
        if re.search(r'\bwhere\s+(?:is\s+it|is\s+located|are\s+they)\b', q_low) or q_low in ["where is it located?", "where is it?"]:
            return "Where is the hostel located inside the campus?"
        if re.search(r'\b(?:what\s+are|how\s+much)\s+(?:their|the)?\s*(?:timings|fee|fees|cost)\b', q_low):
            return "What are the hostel fees and timings?"

    # 3. Pronoun & Omitted Subject Resolution ("where is it located?", "who is its HOD?", "how much is it?")
    pronoun_match = re.search(r'\b(it|its|they|their|this|that|he|she|his|her)\b', q_low)
    if pronoun_match and active_subject:
        pronoun = pronoun_match.group(1)
        resolved = re.sub(rf'\b{re.escape(pronoun)}\b', f"the {active_subject}", q_clean, flags=re.IGNORECASE)
        return resolved

    if q_low in ["what is the fee?", "what are the fees?", "who is the hod?", "where is it?", "what is the intake?", "who is the warden?", "how much is it?"]:
        if active_subject:
            return f"{q_clean} for {active_subject}"
        elif last_user:
            return f"{q_clean} for {last_user}"

    return q_clean

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
    standalone_q = resolve_conversational_followup(q_clean, conversation_history)
    q_low = standalone_q.lower()

    # Extract Years & Dates
    years = re.findall(r'\b(20\d\d|19\d\d)\b', standalone_q)

    # Extract Locations & Cities
    known_locations = {
        "siruseri", "padur", "chennai", "omr", "bangalore", "hyderabad", "mumbai", "delhi",
        "pondicherry", "vellore", "mysore", "paris", "dubai", "singapore", "tokyo", "madurai",
        "kanchipuram", "sydney", "berlin", "london", "california", "everest", "mars", "jupiter"
    }
    locations = [w for w in known_locations if w in q_low]

    # Extract Roles
    known_roles = [
        "dean", "cfo", "director", "warden", "principal", "president", "ceo",
        "chief ai officer", "lead drone operator", "vice chancellor", "hod", "head of department"
    ]
    roles = [r for r in known_roles if r in q_low]

    # Extract Departments
    known_departments = {
        "cse", "it", "ece", "eee", "mech", "civil", "aids", "ai&ds", "ai and ds", "aiml", "csbs",
        "cyber", "biotechnology", "aerospace", "marine", "architecture", "quantum", "nuclear"
    }
    departments = [d for d in known_departments if d in q_low]

    # Extract Degrees
    known_degrees = ["b.e", "b.tech", "m.e", "m.tech", "b.arch", "b.des", "phd", "diploma", "undergraduate", "postgraduate"]
    degrees = [deg for deg in known_degrees if deg in q_low]

    # Extract Acronyms & Entities
    acronyms = [term for term in ACRONYM_MAP if re.search(rf'\b{re.escape(term)}\b', q_low)]
    aliases = [ACRONYM_MAP[t] for t in acronyms if t in ACRONYM_MAP]

    # Extract Numeric Slots / Fees
    numbers = re.findall(r'\b(\d+k?|rs\.?\s*\d+|\$\d+)\b', q_low)

    # Classify Query Type
    query_type = "single_fact"
    if any(w in q_low for w in ["bus", "route", "timing", "stop", "pickup", "drop"]):
        query_type = "transport"
    elif any(w in q_low for w in ["compare", "difference", "versus", "vs", "better"]):
        query_type = "comparison"
    elif any(w in q_low for w in ["list", "all departments", "which courses", "enlist", "names of", "all courses", "scholarships", "scholarship"]):
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

