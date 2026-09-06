import os
import sys
import json
import random
import re
from rank_bm25 import BM25Okapi

GOLD_QA_FILE = os.path.join(os.path.dirname(__file__), "..", "backend", "data", "gold_qa_dataset.json")

GOLD_QA_DATASET = []
GOLD_QA_BY_CAT = {}
GOLD_QA_BM25 = None
GOLD_QA_CORPUS_ITEMS = []

STOP_WORDS_SET = {
    'what', 'is', 'are', 'the', 'a', 'an', 'in', 'on', 'at', 'for', 'to', 'of', 'and',
    'or', 'tell', 'me', 'about', 'how', 'does', 'do', 'can', 'i', 'get', 'you', 'we',
    'which', 'where', 'who', 'whom', 'whose', 'why', 'any', 'some', 'there', 'msajcea',
    'college', 'engineering', 'architecture'
}

def extract_qa_keywords(text: str):
    words = re.findall(r'\w+', text.lower())
    keywords = []
    for w in words:
        if w not in STOP_WORDS_SET and len(w) > 1:
            if w.endswith('s') and len(w) > 3 and not w.endswith('ss'):
                w = w[:-1]
            keywords.append(w)
    return keywords

def keyword_similarity(text1: str, text2: str) -> float:
    kw1 = set(extract_qa_keywords(text1))
    kw2 = set(extract_qa_keywords(text2))
    if not kw1 or not kw2:
        return 0.0
    intersection = kw1.intersection(kw2)
    min_len = min(len(kw1), len(kw2))
    return len(intersection) / float(min_len)

def normalize_qa_category(cat: str) -> str:
    c = (cat or "general").lower().strip()
    if c in ("placements", "placement"):
        return "placement"
    if c in ("fees", "admissions", "admission"):
        return "admissions"
    return c

def determine_primary_category(query: str, top_bm25_cat: str) -> str:
    q = query.lower()
    if any(w in q for w in ["placement", "package", "recruiter", "salary", "job", "internship", "hiring"]):
        return "placement"
    if any(w in q for w in ["fee", "tuition", "admission", "tnea", "cutoff", "quota", "scholarship", "apply"]):
        return "admissions"
    if any(w in q for w in ["hostel", "mess", "canteen", "room", "stay", "accommodation"]):
        return "hostel"
    if any(w in q for w in ["sport", "cricket", "football", "ground", "gym", "athletics"]):
        return "sports"
    if any(w in q for w in ["bus", "transport", "route"]):
        return "transport" if "transport" in GOLD_QA_BY_CAT else "infrastructure"
    if any(w in q for w in ["library", "lab", "facility", "infrastructure", "campus"]):
        return "infrastructure"
    if any(w in q for w in ["syllabus", "regulation", "curriculum", "course", "degree"]):
        return "academics"
    return top_bm25_cat

def init_gold_qa_dataset():
    global GOLD_QA_DATASET, GOLD_QA_BY_CAT, GOLD_QA_BM25, GOLD_QA_CORPUS_ITEMS
    if os.path.exists(GOLD_QA_FILE):
        with open(GOLD_QA_FILE, "r", encoding="utf-8") as f:
            raw_data = json.load(f)
        
        GOLD_QA_DATASET = []
        GOLD_QA_BY_CAT = {}
        GOLD_QA_CORPUS_ITEMS = []
        corpus_tokens = []
        
        excluded_cats = {"off_topic", "jailbreak"}
        
        for item in raw_data:
            cat = item.get("category", "general")
            if cat in excluded_cats:
                continue
            norm_cat = normalize_qa_category(cat)
            qa_item = {
                "id": item.get("id"),
                "query": item.get("query"),
                "ground_truth": item.get("ground_truth"),
                "category": norm_cat,
                "raw_category": cat
            }
            GOLD_QA_DATASET.append(qa_item)
            GOLD_QA_CORPUS_ITEMS.append(qa_item)
            
            if norm_cat not in GOLD_QA_BY_CAT:
                GOLD_QA_BY_CAT[norm_cat] = []
            GOLD_QA_BY_CAT[norm_cat].append(qa_item)
            
            kw = extract_qa_keywords(item.get("query", ""))
            if not kw:
                kw = item.get("query", "").lower().split()
            corpus_tokens.append(kw)
            
        if corpus_tokens:
            GOLD_QA_BM25 = BM25Okapi(corpus_tokens)
            print(f"[INIT] Loaded {len(GOLD_QA_DATASET)} gold QA items across {len(GOLD_QA_BY_CAT)} categories for follow-ups.")

def generate_follow_up_suggestions(query: str, response: str = "", category: str = "general"):
    if not GOLD_QA_CORPUS_ITEMS or not GOLD_QA_BM25:
        return [
            "What are all 12 UG and 2 PG degree programs offered at MSAJCEA?",
            "What is the complete fee structure and scholarship details for B.E. CSE?",
            "What are the hostel and mess facilities offered for boys and girls?",
            "What is the placement record and highest salary package for CSE students?"
        ]
        
    q_lower = query.lower().strip()
    q_kw = extract_qa_keywords(query)
    if not q_kw:
        q_kw = q_lower.split()
        
    scores = GOLD_QA_BM25.get_scores(q_kw)
    ranked_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)
    
    top_item = GOLD_QA_CORPUS_ITEMS[ranked_indices[0]]
    bm25_cat = top_item["category"]
    primary_cat = determine_primary_category(query, bm25_cat)
    
    same_cat_candidates = []
    seen_queries = {q_lower}
    
    for idx in ranked_indices:
        item = GOLD_QA_CORPUS_ITEMS[idx]
        if item["category"] == primary_cat:
            q_text = item["query"]
            if keyword_similarity(query, q_text) > 0.65 or q_text.lower() in seen_queries:
                continue
            same_cat_candidates.append(q_text)
            seen_queries.add(q_text.lower())
            
    if len(same_cat_candidates) < 3 and primary_cat in GOLD_QA_BY_CAT:
        pool = GOLD_QA_BY_CAT[primary_cat]
        for item in pool:
            q_text = item["query"]
            if keyword_similarity(query, q_text) <= 0.65 and q_text.lower() not in seen_queries:
                same_cat_candidates.append(q_text)
                seen_queries.add(q_text.lower())
                if len(same_cat_candidates) >= 3:
                    break
                    
    selected_same = same_cat_candidates[:3]
    
    if len(selected_same) < 3:
        for idx in ranked_indices:
            item = GOLD_QA_CORPUS_ITEMS[idx]
            q_text = item["query"]
            if keyword_similarity(query, q_text) <= 0.65 and q_text.lower() not in seen_queries:
                selected_same.append(q_text)
                seen_queries.add(q_text.lower())
                if len(selected_same) >= 3:
                    break
                    
    valid_other_cats = [c for c in GOLD_QA_BY_CAT.keys() if c != primary_cat and len(GOLD_QA_BY_CAT[c]) > 0]
    selected_other = None
    
    for idx in ranked_indices:
        item = GOLD_QA_CORPUS_ITEMS[idx]
        other_cat = item["category"]
        q_text = item["query"]
        if other_cat != primary_cat and keyword_similarity(query, q_text) <= 0.50 and q_text.lower() not in seen_queries:
            selected_other = q_text
            break
            
    if not selected_other and valid_other_cats:
        chosen_cat = random.choice(valid_other_cats)
        pick_item = random.choice(GOLD_QA_BY_CAT[chosen_cat])
        selected_other = pick_item["query"]
        
    final_suggestions = selected_same[:3]
    if selected_other:
        final_suggestions.append(selected_other)
        
    while len(final_suggestions) < 4:
        for item in GOLD_QA_DATASET:
            q_text = item["query"]
            if q_text.lower() not in [s.lower() for s in final_suggestions]:
                final_suggestions.append(q_text)
                if len(final_suggestions) == 4:
                    break
                    
    return final_suggestions[:4]

if __name__ == "__main__":
    init_gold_qa_dataset()
    test_queries = [
        "What is the TNEA counseling code?",
        "Tell me about placements for CSE department",
        "Where is the hostel and what food is served?",
        "What sports grounds and facilities are available?",
        "Who is the principal of the college?"
    ]
    for q in test_queries:
        res = generate_follow_up_suggestions(q)
        print(f"\nUser Query: '{q}'")
        print(f"Follow-ups ({len(res)} total):")
        for i, f_q in enumerate(res, 1):
            cat = next((item['category'] for item in GOLD_QA_DATASET if item['query'] == f_q), 'unknown')
            print(f"  {i}. [{cat}] {f_q}")
