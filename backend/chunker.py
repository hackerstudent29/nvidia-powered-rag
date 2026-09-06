import json
import re
import hashlib
import uuid
import os
from dataclasses import dataclass, field
from datetime import datetime

"""
NVIDIA NeMo Semantic Parent-Child Chunker & Schema Manager
Integrates Semantic Parent-Child Chunking with NVIDIA NeMo Retriever specifications.
"""

@dataclass
class Chunk:
    text: str
    section_title: str
    source_file: str
    category: str = "General — MSAJCEA"
    page_number: int = 1
    parent_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    title: str = "MSAJCEA Campus Document"
    url: str = "https://www.msajce-edu.in"
    department: str = "General"
    document_type: str = "markdown"
    chunk_index: int = 0
    total_chunks: int = 1
    scraped_at: str = field(default_factory=lambda: datetime.utcnow().strftime("%Y-%m-%dT00:00:00Z"))
    entities: list = field(default_factory=list)
    keywords: list = field(default_factory=list)
    chunk_hash: str = field(init=False)
    point_id: int = field(init=False)

    def __post_init__(self):
        # 16-char SHA-256 hash of text
        self.chunk_hash = hashlib.sha256(self.text.encode("utf-8")).hexdigest()[:16]
        # Qdrant point integer ID derived from hash
        self.point_id = int(self.chunk_hash, 16) % (10**7)

    def to_qdrant_payload(self) -> dict:
        doc_title = self.title.replace("\t", " ").strip()
        sec_title = self.section_title.replace("\t", " ").strip()
        breadcrumb_header = f"### Document: {doc_title} | Section: {sec_title} | Version: 2026-27"
        
        full_text = f"{breadcrumb_header}\n{self.text}"
        
        return {
            "id": self.point_id,
            "payload": {
                "text": full_text,
                "raw_text": self.text,
                "title": self.title,
                "section_title": self.section_title,
                "source_file": self.source_file,
                "url": self.url,
                "category": self.category,
                "department": self.department,
                "document_type": self.document_type,
                "page_number": self.page_number,
                "chunk_index": self.chunk_index,
                "total_chunks": self.total_chunks,
                "entities": self.entities,
                "entity_ids": [f"ent_{i}" for i in range(len(self.entities))],
                "keywords": self.keywords or extract_keywords(self.text),
                "parent_id": self.parent_id,
                "chunk_hash": self.chunk_hash,
                "scraped_at": self.scraped_at,
                "chunk_id": f"{self.source_file.replace('.md','')}_{self.chunk_index:03d}",
                "page_url": self.url
            }
        }

def extract_keywords(text: str) -> list:
    words = re.findall(r'\b[a-zA-Z0-9]{4,}\b', text.lower())
    stopwords = {"this", "that", "with", "from", "have", "more", "will", "been", "were", "they", "their", "about", "which", "shall", "under"}
    unique_kw = list(dict.fromkeys([w for w in words if w not in stopwords]))
    return unique_kw[:10]

def convert_existing_chunks_to_parent_child():
    data_dir = os.path.join(os.path.dirname(__file__), "data")
    bm25_path = os.path.join(data_dir, "bm25_chunks.json")
    if not os.path.exists(bm25_path):
        print(f"[WARN] File not found: {bm25_path}")
        return

    with open(bm25_path, "r", encoding="utf-8") as f:
        raw_items = json.load(f)

    parent_map = {}
    formatted_payloads = []

    total_count = len(raw_items)
    for idx, item in enumerate(raw_items):
        source = item.get("source_file", "msajcea_records.md")
        sec_title = item.get("section_title") or item.get("topic_title") or "General — MSAJCEA"
        
        parent_key = f"{source}_{sec_title}"
        if parent_key not in parent_map:
            parent_map[parent_key] = str(uuid.uuid4())
            
        parent_uuid = parent_map[parent_key]
        raw_t = item.get("raw_text") or item.get("text") or ""
        raw_t = re.sub(r'^### Document:.*?\n', '', raw_t, flags=re.MULTILINE).strip()

        chunk_obj = Chunk(
            text=raw_t,
            section_title=sec_title,
            source_file=source,
            category=item.get("category", "General — MSAJCEA"),
            page_number=1,
            parent_id=parent_uuid,
            title=item.get("topic_title") or "MSAJCEA Campus Document",
            url=item.get("page_url") or "https://www.msajce-edu.in",
            department=item.get("category", "General").capitalize(),
            document_type="markdown",
            chunk_index=idx + 1,
            total_chunks=total_count,
            entities=item.get("entities", []),
            keywords=item.get("keywords", extract_keywords(raw_t))
        )
        
        q_payload = chunk_obj.to_qdrant_payload()
        p = q_payload["payload"]
        p["id"] = q_payload["id"]
        formatted_payloads.append(p)

    with open(bm25_path, "w", encoding="utf-8") as f:
        json.dump(formatted_payloads, f, indent=2, ensure_ascii=False)

    print(f"[SUCCESS] Updated {len(formatted_payloads)} chunks to Semantic Parent-Child Chunking strategy & schema!")

if __name__ == "__main__":
    convert_existing_chunks_to_parent_child()
