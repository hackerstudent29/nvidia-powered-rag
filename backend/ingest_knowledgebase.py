import os
import sys
import glob
import json
import time
import uuid
import re
import requests
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, VectorParams, Distance

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from dotenv import load_dotenv

# Load environment variables from root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.join(BASE_DIR, ".env")
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
else:
    load_dotenv()

# Configurations
DATASET_DIR = os.path.join(BASE_DIR, "Dataset")
PAGES_LINK_FILE = os.path.join(DATASET_DIR, "links folder", "pageslink.md")
BM25_OUTPUT_FILE = os.path.join(BACKEND_DIR, "data", "bm25_chunks.json")
RESOURCE_JSON_FILE = os.path.join(BACKEND_DIR, "data", "resource_links.json")

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION_NAME = "nvidia_powered_ai"

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
NVIDIA_EMBED_MODEL = "nvidia/llama-nemotron-embed-vl-1b-v2"

# Parse pageslink.md to map source files to titles and official URLs
def load_page_links():
    mapping = {}
    if os.path.exists(PAGES_LINK_FILE):
        with open(PAGES_LINK_FILE, "r", encoding="utf-8", errors="ignore") as f:
            lines = [l.strip() for l in f if l.strip()]
        for i, l in enumerate(lines):
            if l.endswith(".md"):
                fn = l.lower().strip()
                norm_fn = fn.replace("msajcea_", "msajce_").replace("msajceapolicy", "msajcepolicy")
                topic = lines[i+1].split("\t")[0].strip() if i+1 < len(lines) else ""
                url = ""
                if i+1 < len(lines) and "\t" in lines[i+1]:
                    url = lines[i+1].split("\t")[1].strip()
                elif i+2 < len(lines) and (".in" in lines[i+2] or ".dev" in lines[i+2] or "http" in lines[i+2]):
                    url = lines[i+2].strip()
                if url and not url.startswith("http"):
                    url = "https://" + url
                
                info = {"topic_title": topic, "url": url}
                mapping[fn] = info
                mapping[norm_fn] = info
                mapping[norm_fn.replace("msajce_", "msajcea_")] = info
    return mapping


STOP_WORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at",
    "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can", "can't", "cannot",
    "could", "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from", "further", "had", "has",
    "have", "having", "he", "her", "here", "hers", "herself", "him", "himself", "his", "how", "i", "if", "in", "into",
    "is", "it", "its", "itself", "just", "me", "more", "most", "my", "myself", "no", "nor", "not", "of", "off", "on",
    "once", "only", "or", "other", "our", "ours", "ourselves", "out", "over", "own", "same", "she", "should", "so",
    "some", "such", "than", "that", "the", "their", "theirs", "them", "themselves", "then", "there", "these", "they",
    "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "we", "were", "what", "when",
    "where", "which", "while", "who", "whom", "why", "with", "would", "you", "your", "yours", "yourself", "yourselves",
    "document", "section", "version", "page", "file", "msajce", "msajcea"
}

def clean_content(text: str) -> str:
    """Removes internal comment markers and normalizes excess whitespace."""
    text = re.sub(r'<!--\s*ent_\d+\s*-->', '', text)
    text = re.sub(r'\r\n', '\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def extract_entities(raw_text: str) -> list:
    entities = set()

    # 1. Names with titles (Dr., Mr., Mrs., Prof., Er.)
    title_names = re.findall(r'\b(?:Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.|Er\.)\s+[A-Z][a-zA-Z\.]*(?:\s+[A-Z][a-zA-Z\.]*)+', raw_text)
    entities.update([n.strip() for n in title_names])

    # 2. Capitalized Proper Noun Phrases (e.g. "Mohamed Sathak A.J. College of Engineering", "SIPCOT IT Park")
    proper_nouns = re.findall(r'\b[A-Z][a-zA-Z0-9\.]*(?:\s+[A-Z][a-zA-Z0-9\.]*){1,5}\b', raw_text)
    for pn in proper_nouns:
        pn_clean = pn.strip(" .,:-_()")
        if len(pn_clean) >= 3 and not pn_clean.startswith("#") and pn_clean.lower() not in STOP_WORDS:
            entities.add(pn_clean)

    # 3. Route Numbers, Course Codes, Regulation Codes
    codes = re.findall(r'\b(?:Route\s+\w+|AR\s*\d+|R\s*\d+|N/3|CS\d{4}|EC\d{4}|IT\d{4}|EE\d{4}|ME\d{4}|TNEA\s*\d+|NAAC\s*A\+?|AICTE|ANNA\s*UNIVERSITY)\b', raw_text, re.IGNORECASE)
    entities.update([c.strip() for c in codes])

    # 4. Email addresses & Phone numbers
    emails = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', raw_text)
    entities.update(emails)
    phones = re.findall(r'\b\d{5}\s*\d{5}\b|\b\d{10}\b', raw_text)
    entities.update(phones)

    # Clean & deduplicate
    result = []
    for e in sorted(entities, key=len, reverse=True):
        e_str = e.strip(" .,:-_()")
        if len(e_str) >= 2 and e_str not in result:
            result.append(e_str)

    return result[:25]


def extract_keywords(topic_title: str, section_title: str, category: str, raw_text: str) -> list:
    keywords = []

    # Priority keywords from titles and category
    for base_term in [topic_title, section_title, category]:
        if base_term:
            clean_term = base_term.strip(" #1234567890.-_")
            if clean_term and clean_term not in keywords:
                keywords.append(clean_term)

    # Extract terms from raw text
    words = re.findall(r'\b[A-Za-z0-9\+\#\-]{3,}\b', raw_text)
    freq = {}
    for w in words:
        w_lower = w.lower()
        if w_lower not in STOP_WORDS and not w.isdigit():
            freq[w] = freq.get(w, 0) + 1

    sorted_words = sorted(freq.keys(), key=lambda x: freq[x], reverse=True)
    for kw in sorted_words:
        if kw not in keywords and len(keywords) < 20:
            keywords.append(kw)

    return keywords[:20]


def hierarchical_chunk_markdown(file_path: str, filename: str, doc_info: dict, max_chunk_chars: int = 750):
    """
    Semantic Hierarchical Chunker:
    - Maintains document hierarchy (Document Title -> Major Section -> Sub-section).
    - Preserves tables intact without breaking rows or schema.
    - Prevents empty or micro dangling chunks.
    - Attaches full hierarchical context to every chunk for optimal dense & sparse retrieval.
    """
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        raw_text = f.read()

    topic_title = doc_info.get("topic_title") or filename.replace(".md", "").replace("_", " ").title()
    page_url = doc_info.get("url") or "https://msajce-edu.in"

    # Category classification
    category = "general"
    fn_low = filename.lower()
    if any(k in fn_low for k in ["cse", "aids", "aiml", "it", "cyber", "ece", "eee", "mech", "civil", "csbs", "science_and_humanities"]):
        category = "department"
    elif any(k in fn_low for k in ["admission", "tnea", "cutoff", "courses"]):
        category = "admission"
    elif any(k in fn_low for k in ["hostel", "mess", "food", "dining"]):
        category = "hostel"
    elif any(k in fn_low for k in ["placement", "company", "sipcot", "recruiter"]):
        category = "placement"
    elif any(k in fn_low for k in ["transport", "bus", "route"]):
        category = "transport"
    elif any(k in fn_low for k in ["policy", "antiragging", "grievance", "iqac", "naac", "governing", "committee", "cell", "council"]):
        category = "governance"
    elif any(k in fn_low for k in ["sports", "library", "clubs", "social", "ebsb"]):
        category = "campus_life"

    lines = raw_text.split("\n")
    current_h1 = topic_title
    current_h2 = ""
    current_h3 = ""
    
    sections = [] # (h1, h2, h3, body)
    current_lines = []

    for line in lines:
        h1_m = re.match(r'^#\s+(.+)', line)
        h2_m = re.match(r'^##\s+(.+)', line)
        h3_m = re.match(r'^###\s+(.+)', line)

        if h1_m:
            if current_lines:
                sections.append((current_h1, current_h2, current_h3, "\n".join(current_lines)))
                current_lines = []
            current_h1 = h1_m.group(1).strip()
            current_h2 = ""
            current_h3 = ""
        elif h2_m:
            if current_lines:
                sections.append((current_h1, current_h2, current_h3, "\n".join(current_lines)))
                current_lines = []
            current_h2 = h2_m.group(1).strip()
            current_h3 = ""
        elif h3_m:
            if current_lines:
                sections.append((current_h1, current_h2, current_h3, "\n".join(current_lines)))
                current_lines = []
            current_h3 = h3_m.group(1).strip()
        else:
            current_lines.append(line)

    if current_lines:
        sections.append((current_h1, current_h2, current_h3, "\n".join(current_lines)))

    chunks = []
    chunk_idx = 0
    clean_base_id = filename.replace(".md", "")

    for h1, h2, h3, body in sections:
        body_clean = clean_content(body)
        if not body_clean or len(body_clean) < 15:
            continue

        sec_parts = [p for p in [h1, h2, h3] if p and p != topic_title]
        sec_title = " — ".join(sec_parts) if sec_parts else topic_title

        has_table = "|" in body_clean and ("-|-" in body_clean or "\n|" in body_clean)

        if len(body_clean) <= max_chunk_chars or has_table:
            chunk_idx += 1
            structured_text = f"{topic_title} — {sec_title}\n\n{body_clean}"
            chunks.append({
                "chunk_id": f"{clean_base_id}_{chunk_idx:03d}",
                "source_file": filename,
                "topic_title": topic_title,
                "section_title": sec_title,
                "page_url": page_url,
                "category": category,
                "keywords": extract_keywords(topic_title, sec_title, category, body_clean),
                "entities": extract_entities(body_clean),
                "document_version": "2026-27",
                "is_current": True,
                "text": structured_text,
                "raw_text": body_clean
            })
        else:
            paras = [p.strip() for p in body_clean.split("\n\n") if p.strip()]
            cur_buf = []
            cur_len = 0
            for p in paras:
                if cur_len + len(p) + 2 <= max_chunk_chars:
                    cur_buf.append(p)
                    cur_len += len(p) + 2
                else:
                    if cur_buf:
                        chunk_idx += 1
                        p_body = "\n\n".join(cur_buf)
                        chunks.append({
                            "chunk_id": f"{clean_base_id}_{chunk_idx:03d}",
                            "source_file": filename,
                            "topic_title": topic_title,
                            "section_title": sec_title,
                            "page_url": page_url,
                            "category": category,
                            "keywords": extract_keywords(topic_title, sec_title, category, p_body),
                            "entities": extract_entities(p_body),
                            "document_version": "2026-27",
                            "is_current": True,
                            "text": f"{topic_title} — {sec_title}\n\n{p_body}",
                            "raw_text": p_body
                        })
                    cur_buf = [p]
                    cur_len = len(p)
            if cur_buf:
                chunk_idx += 1
                p_body = "\n\n".join(cur_buf)
                chunks.append({
                    "chunk_id": f"{clean_base_id}_{chunk_idx:03d}",
                    "source_file": filename,
                    "topic_title": topic_title,
                    "section_title": sec_title,
                    "page_url": page_url,
                    "category": category,
                    "keywords": extract_keywords(topic_title, sec_title, category, p_body),
                    "entities": extract_entities(p_body),
                    "document_version": "2026-27",
                    "is_current": True,
                    "text": f"{topic_title} — {sec_title}\n\n{p_body}",
                    "raw_text": p_body
                })

    return chunks


def get_nvidia_embeddings(texts, batch_size=100):
    url = "https://integrate.api.nvidia.com/v1/embeddings"
    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Content-Type": "application/json"
    }
    all_embeddings = []
    failed_chunks = []
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        payload = {
            "input": batch,
            "model": NVIDIA_EMBED_MODEL,
            "input_type": "passage"
        }
        retries = 3
        backoff = 2
        success = False
        while retries > 0:
            try:
                res = requests.post(url, headers=headers, json=payload, timeout=30)
                if res.status_code == 200:
                    data = res.json()["data"]
                    data_sorted = sorted(data, key=lambda x: x.get("index", 0))
                    embeddings = [item["embedding"] for item in data_sorted]
                    all_embeddings.extend(embeddings)
                    print(f"  [Embeddings] Processed batch {i+1} to {min(i+batch_size, len(texts))} / {len(texts)} chunks", flush=True)
                    success = True
                    break
                else:
                    print(f"  [Embeddings Error {res.status_code}]: {res.text[:120]} (retrying in {backoff}s...)", flush=True)
                    time.sleep(backoff)
                    retries -= 1
                    backoff *= 2
            except Exception as e:
                print(f"  [Embeddings Exception]: {e} (retrying in {backoff}s...)", flush=True)
                time.sleep(backoff)
                retries -= 1
                backoff *= 2
        
        if not success:
            print(f"  [ERROR] DLQ: Failed to generate embeddings for batch starting at index {i}. Appending dummy vectors.", flush=True)
            all_embeddings.extend([[0.0] * 2048 for _ in range(len(batch))])
            failed_chunks.extend(batch)
            
    if failed_chunks:
        with open(os.path.join(BACKEND_DIR, "data", "dlq_failed_embeddings.json"), "w", encoding="utf-8") as f:
            json.dump(failed_chunks, f)
            
    return all_embeddings


def chunk_resources():
    chunks = []
    if os.path.exists(RESOURCE_JSON_FILE):
        with open(RESOURCE_JSON_FILE, "r", encoding="utf-8", errors="ignore") as f:
            res_data = json.load(f)
        
        grouped = {}
        for item in res_data:
            key = item.get("source_page_title", "General Resources")
            grouped.setdefault(key, []).append(item)
        
        chunk_idx = 0
        for page_title, items in grouped.items():
            for batch_i in range(0, len(items), 8):
                batch_items = items[batch_i:batch_i+8]
                chunk_idx += 1
                lines = [f"{page_title} — Verified Resource Downloads & Media"]
                for it in batch_items:
                    rtype = it.get("resource_type", "link").upper()
                    title = it.get("title", "Resource").replace("\n", " ").strip()
                    url = it.get("url", "")
                    desc = it.get("description", "").replace("\n", " ").strip()[:100]
                    lines.append(f"- [{rtype}] **{title}**: [View Resource]({url}) - {desc}")
                
                text_content = "\n".join(lines)
                clean_title = re.sub(r'[^a-zA-Z0-9]', '_', page_title).lower()
                chunks.append({
                    "chunk_id": f"resource_{clean_title}_{chunk_idx:03d}",
                    "source_file": "resource_catalog.md",
                    "topic_title": page_title,
                    "section_title": "Verified Resource Downloads & Media",
                    "page_url": items[0].get("source_page_url", "https://msajce-edu.in"),
                    "category": "resources",
                    "keywords": extract_keywords(page_title, "Verified Resource Downloads & Media", "resources", text_content),
                    "entities": extract_entities(text_content),
                    "document_version": "2026-27",
                    "is_current": True,
                    "text": text_content,
                    "raw_text": text_content
                })
    return chunks


def validate_chunk_schema(chunks):
    valid_chunks = []
    invalid_chunks = []
    required_keys = ["chunk_id", "source_file", "topic_title", "page_url", "text"]
    for c in chunks:
        is_valid = True
        for k in required_keys:
            if not c.get(k) or str(c.get(k)).strip() == "":
                is_valid = False
                break
        if is_valid:
            valid_chunks.append(c)
        else:
            invalid_chunks.append(c)
    return valid_chunks, invalid_chunks


def main():
    print("=" * 70, flush=True)
    print("🚀 LORIN AI - HIGH-PRECISION SEMANTIC KNOWLEDGE INGESTION PIPELINE", flush=True)
    print("=" * 70, flush=True)

    # 1. Load links mapping
    page_links = load_page_links()
    print(f"Loaded page links mapping for {len(page_links)} document variants.", flush=True)

    # 2. Find all markdown files in Dataset
    md_files = glob.glob(os.path.join(DATASET_DIR, "*.md"))
    print(f"Found {len(md_files)} knowledge markdown files in Dataset/", flush=True)

    all_chunks = []
    for file_path in md_files:
        filename = os.path.basename(file_path)
        doc_info = page_links.get(filename, {})
        chunks = hierarchical_chunk_markdown(file_path, filename, doc_info)
        all_chunks.extend(chunks)

    # 3. Add Verified Resource Chunks
    resource_chunks = chunk_resources()
    all_chunks.extend(resource_chunks)
    print(f"Generated {len(resource_chunks)} structured resource catalog chunks.", flush=True)

    print(f"Total structured knowledge chunks generated: {len(all_chunks)}", flush=True)

    # Schema Validation
    all_chunks, invalid_chunks = validate_chunk_schema(all_chunks)
    print(f"Schema Validation: {len(all_chunks)} valid, {len(invalid_chunks)} invalid.", flush=True)

    # Data Coverage & Freshness Tracking
    print("\n📊 --- DATA COVERAGE & FRESHNESS REPORT ---")
    category_counts = {}
    current_count = 0
    for c in all_chunks:
        cat = c.get("category", "unknown")
        category_counts[cat] = category_counts.get(cat, 0) + 1
        if c.get("is_current") and c.get("document_version") == "2026-27":
            current_count += 1
    
    print(f"Total Active Chunks: {len(all_chunks)}")
    print(f"Freshness (2026-27): {current_count}/{len(all_chunks)} ({(current_count/len(all_chunks))*100 if all_chunks else 0:.1f}%)")
    print("Category Breakdown:")
    for cat, count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  - {cat}: {count} chunks")
    print("-------------------------------------------\n")

    # 4. Save BM25 Artifact
    os.makedirs(os.path.dirname(BM25_OUTPUT_FILE), exist_ok=True)
    with open(BM25_OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_chunks, f, indent=2, ensure_ascii=False)
    print(f"✅ Saved clean BM25 chunks repository -> {BM25_OUTPUT_FILE}", flush=True)

    # 5. Generate NVIDIA NeMo 2048-dim Dense Embeddings
    print(f"\nComputing 2048-dim NVIDIA NeMo embeddings using '{NVIDIA_EMBED_MODEL}'...", flush=True)
    texts_to_embed = [c["text"] for c in all_chunks]
    embeddings = get_nvidia_embeddings(texts_to_embed, batch_size=100)
    print(f"Successfully generated {len(embeddings)} dense embeddings (dim={len(embeddings[0])})!", flush=True)

    # 6. Connect and Upsert into Qdrant Cloud
    print(f"\nConnecting to Qdrant Cloud -> Collection '{COLLECTION_NAME}'...", flush=True)
    client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=60)

    # Wipe and recreate collection for a completely fresh ingestion
    collections = [c.name for c in client.get_collections().collections]
    if COLLECTION_NAME in collections:
        print(f"🧹 Wiping existing Qdrant collection '{COLLECTION_NAME}' for fresh ingestion...", flush=True)
        client.delete_collection(collection_name=COLLECTION_NAME)
        time.sleep(2)

    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(size=2048, distance=Distance.COSINE)
    )
    print(f"✅ Created fresh empty collection '{COLLECTION_NAME}' (2048 dims, Cosine)", flush=True)

    # Prepare Points
    points = []
    for idx, (chunk, vector) in enumerate(zip(all_chunks, embeddings)):
        point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, chunk["chunk_id"]))
        points.append(
            PointStruct(
                id=point_id,
                vector=vector,
                payload={
                    "chunk_id": chunk["chunk_id"],
                    "source_file": chunk["source_file"],
                    "topic_title": chunk["topic_title"],
                    "section_title": chunk["section_title"],
                    "page_url": chunk["page_url"],
                    "category": chunk["category"],
                    "keywords": chunk.get("keywords", []),
                    "entities": chunk.get("entities", []),
                    "text": chunk["text"],
                    "raw_text": chunk["raw_text"],
                    "document_version": "2026-27",
                    "is_current": True
                }
            )
        )

    # Upsert in batch_size=50 with retry to ensure stability
    print(f"Upserting {len(points)} points into Qdrant Cloud in batches...", flush=True)
    batch_size = 50
    max_retries = 3
    for i in range(0, len(points), batch_size):
        sub_batch = points[i:i + batch_size]
        for attempt in range(1, max_retries + 1):
            try:
                client.upsert(collection_name=COLLECTION_NAME, points=sub_batch)
                print(f"  --> Upserted points {i+1} to {min(i+batch_size, len(points))} / {len(points)}", flush=True)
                break
            except Exception as e:
                if attempt == max_retries:
                    print(f"  ❌ Failed after {max_retries} attempts: {e}", flush=True)
                    raise
                wait = 2 ** attempt
                print(f"  ⚠️ Attempt {attempt} failed ({e}), retrying in {wait}s...", flush=True)
                time.sleep(wait)

    col_info = client.get_collection(COLLECTION_NAME)
    print("\n" + "=" * 70, flush=True)
    print(f"✅ HIGH-PRECISION INGESTION COMPLETE! Collection '{COLLECTION_NAME}' Points: {col_info.points_count}", flush=True)
    print("=" * 70 + "\n", flush=True)


if __name__ == "__main__":
    main()
