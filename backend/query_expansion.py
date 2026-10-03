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
