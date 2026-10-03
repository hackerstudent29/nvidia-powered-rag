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
    "uba": "Unnat Bharat Abhiyan",
    "unnat bharat": "Unnat Bharat Abhiyan",
    "naac": "National Assessment and Accreditation Council NAAC Grade A+",
    "nba": "National Board of Accreditation NBA",
    "tnea": "Tamil Nadu Engineering Admissions TNEA Code 1301",
    "tnea code": "TNEA Code 1301 Mohamed Sathak A.J. College of Engineering",
    "1301": "TNEA Code 1301 Mohamed Sathak A.J. College of Engineering",
    "msajce": "Mohamed Sathak A.J. College of Engineering",
    "msajcea": "Mohamed Sathak A.J. College of Engineering and Architecture",
    "ajce": "Mohamed Sathak A.J. College of Engineering",
    "cse": "Computer Science and Engineering B.E. CSE",
    "it": "Information Technology B.Tech IT",
    "ece": "Electronics and Communication Engineering B.E. ECE",
    "eee": "Electrical and Electronics Engineering B.E. EEE",
    "mech": "Mechanical Engineering B.E. MECH",
    "civil": "Civil Engineering B.E. CIVIL",
    "aids": "Artificial Intelligence and Data Science B.Tech AI & DS",
    "aiml": "Artificial Intelligence and Machine Learning B.Tech AI & ML",
    "csbs": "Computer Science and Business Systems B.Tech CSBS",
    "cyber": "Cyber Security B.E. Cyber Security",
    "b.arch": "Bachelor of Architecture B.Arch",
    "b.des": "Bachelor of Design B.Des",
    "iqac": "Internal Quality Assurance Cell IQAC",
    "nss": "National Service Scheme NSS",
    "ncc": "National Cadet Corps NCC",
    "csi": "Computer Society of India CSI Chapter"
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
