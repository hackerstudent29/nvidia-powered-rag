import json
import random
import os
import re
from rank_bm25 import BM25Okapi

file_path = os.path.join(os.path.dirname(__file__), "..", "backend", "data", "gold_qa_dataset.json")
with open(file_path, 'r', encoding='utf-8') as f:
    dataset = json.load(f)

EXCLUDED_CATS = {'off_topic', 'jailbreak'}
STOP_WORDS = {
    'what', 'is', 'are', 'the', 'a', 'an', 'in', 'on', 'at', 'for', 'to', 'of', 'and',
    'or', 'tell', 'me', 'about', 'how', 'does', 'do', 'can', 'i', 'get', 'you', 'we',
    'which', 'where', 'who', 'whom', 'whose', 'why', 'any', 'some', 'there', 'msajcea',
    'college', 'engineering', 'architecture'
}

def extract_keywords(text: str) -> set:
    words = re.findall(r'\w+', text.lower())
    # Simple stemming for plural 's'
    keywords = set()
    for w in words:
        if w not in STOP_WORDS and len(w) > 1:
            if w.endswith('s') and len(w) > 3 and not w.endswith('ss'):
                w = w[:-1]
            keywords.add(w)
    return keywords

def keyword_overlap_ratio(text1: str, text2: str) -> float:
    kw1 = extract_keywords(text1)
    kw2 = extract_keywords(text2)
    if not kw1 or not kw2:
        return 0.0
    intersection = kw1.intersection(kw2)
    min_len = min(len(kw1), len(kw2))
    return len(intersection) / float(min_len)

def normalize_cat(cat: str) -> str:
    c = cat.lower().strip()
    if c in ('placements', 'placement'):
        return 'placement'
    if c in ('fees', 'admissions'):
        return 'admissions'
    return c

filtered_qa = []
cat_to_questions = {}

for d in dataset:
    raw_cat = d.get('category', 'general')
    if raw_cat in EXCLUDED_CATS:
        continue
    norm_cat = normalize_cat(raw_cat)
    item = {
        'id': d.get('id'),
        'query': d['query'],
        'category': norm_cat,
        'raw_category': raw_cat
    }
    filtered_qa.append(item)
    if norm_cat not in cat_to_questions:
        cat_to_questions[norm_cat] = []
    cat_to_questions[norm_cat].append(item)

# Build BM25 index on all queries in dataset
corpus = [list(extract_keywords(d['query'])) for d in filtered_qa]
bm25 = BM25Okapi(corpus)

def get_followups(user_query: str, num_same_cat: int = 3, num_other_cat: int = 1):
    q_kw = list(extract_keywords(user_query))
    if not q_kw:
        q_kw = user_query.lower().split()
        
    scores = bm25.get_scores(q_kw)
    ranked_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)
    
    top_match = filtered_qa[ranked_indices[0]]
    primary_cat = top_match['category']
    
    print(f"Query: \"{user_query}\" -> Matched Category: '{primary_cat}' (Top match: \"{top_match['query']}\")")
    
    same_cat_candidates = []
    seen_queries = set([user_query.lower().strip()])
    
    for idx in ranked_indices:
        item = filtered_qa[idx]
        if item['category'] == primary_cat:
            q_text = item['query']
            # Skip if key terms overlap heavily (> 0.65) or seen
            overlap = keyword_overlap_ratio(user_query, q_text)
            if overlap > 0.65 or q_text.lower() in seen_queries:
                continue
            same_cat_candidates.append(q_text)
            seen_queries.add(q_text.lower())
            
    if len(same_cat_candidates) < num_same_cat and primary_cat in cat_to_questions:
        all_in_cat = [item['query'] for item in cat_to_questions[primary_cat]]
        for q_text in all_in_cat:
            if keyword_overlap_ratio(user_query, q_text) <= 0.65 and q_text.lower() not in seen_queries:
                same_cat_candidates.append(q_text)
                seen_queries.add(q_text.lower())
                if len(same_cat_candidates) >= num_same_cat:
                    break
                    
    selected_same = same_cat_candidates[:num_same_cat]
    
    valid_other_cats = [c for c in cat_to_questions.keys() if c != primary_cat and len(cat_to_questions[c]) > 0]
    
    selected_other = None
    for idx in ranked_indices:
        item = filtered_qa[idx]
        other_cat = item['category']
        q_text = item['query']
        if other_cat != primary_cat and keyword_overlap_ratio(user_query, q_text) <= 0.50 and q_text.lower() not in seen_queries:
            selected_other = (other_cat, q_text)
            break
            
    if not selected_other and valid_other_cats:
        chosen_cat = random.choice(valid_other_cats)
        pick_item = random.choice(cat_to_questions[chosen_cat])
        selected_other = (chosen_cat, pick_item['query'])
        
    print("Suggested Follow-ups:")
    for i, q in enumerate(selected_same, 1):
        print(f"  {i}. [{primary_cat}] {q}")
    if selected_other:
        print(f"  4. [NEW CATEGORY: {selected_other[0]}] {selected_other[1]}")
    print("=" * 60)

if __name__ == "__main__":
    get_followups("What is the TNEA counseling code for MSAJCEA?")
    get_followups("Tell me about CSE placements and highest package")
    get_followups("How is the food and hostel for boys?")
    get_followups("What sports facilities and grounds are available on campus?")
