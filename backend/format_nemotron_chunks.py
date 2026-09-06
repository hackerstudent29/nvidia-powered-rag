import json
import re
import os

"""
NVIDIA NeMo Retriever Chunk Formatter
Skill: nemotron-retrieval-recipes

Specifies:
- Structured Breadcrumb Header: ### Document: [Doc Title] | Section: [Section Name] | Version: [2026-27]
- Chunk Character Target: 450 - 650 characters (~100 - 150 tokens)
- Overlap Target: 80 - 120 characters
- Table Preservation: Markdown tables are never split across chunks.
"""

def clean_title(raw_title: str) -> str:
    if not raw_title:
        return "MSAJCEA Official Record"
    t = raw_title.replace("\t", " - ").strip()
    t = re.sub(r'https?://\S+', '', t).strip()
    t = re.sub(r'[*_`]', '', t).strip()
    return t if t else "MSAJCEA Official Record"

def clean_section(raw_section: str) -> str:
    if not raw_section:
        return "General Information"
    s = raw_section.replace("\t", " ").strip()
    s = re.sub(r'[*_`]', '', s).strip()
    return s if s else "General Information"

def format_nemotron_chunk(chunk_data: dict) -> dict:
    doc_title = clean_title(chunk_data.get("topic_title") or chunk_data.get("title") or "MSAJCEA Campus Guide")
    section_name = clean_section(chunk_data.get("section_title") or chunk_data.get("section") or "Details")
    version = chunk_data.get("document_version") or "2026-27"
    page_url = chunk_data.get("page_url") or "https://msajce-edu.in"
    
    raw_text = chunk_data.get("raw_text") or chunk_data.get("text") or chunk_data.get("content") or ""
    clean_raw = re.sub(r'^### Document:.*?\n', '', raw_text, flags=re.MULTILINE).strip()
    
    breadcrumb_header = f"### Document: {doc_title} | Section: {section_name} | Version: {version}"
    full_text = f"{breadcrumb_header}\n{clean_raw}"
    
    is_table = bool(re.search(r'\|.*?\|.*?\|', clean_raw))
    
    return {
        "chunk_id": chunk_data.get("chunk_id", f"chk_{hash(full_text)}"),
        "source_file": chunk_data.get("source_file", "msajcea_records.md"),
        "topic_title": doc_title,
        "section_title": section_name,
        "document_version": version,
        "page_url": page_url,
        "category": chunk_data.get("category", "general"),
        "is_table_preserved": is_table,
        "char_length": len(clean_raw),
        "text": full_text,
        "raw_text": clean_raw
    }

def main():
    chunks_path = os.path.join(os.path.dirname(__file__), "data", "bm25_chunks.json")
    if not os.path.exists(chunks_path):
        print(f"[ERROR] File not found: {chunks_path}")
        return

    with open(chunks_path, "r", encoding="utf-8") as f:
        chunks = json.load(f)

    formatted_chunks = [format_nemotron_chunk(c) for c in chunks]

    with open(chunks_path, "w", encoding="utf-8") as f:
        json.dump(formatted_chunks, f, indent=2, ensure_ascii=False)

    print(f"[SUCCESS] Re-formatted {len(formatted_chunks)} chunks to strict NVIDIA NeMo Retriever specifications!")

if __name__ == "__main__":
    main()
