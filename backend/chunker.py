import json
import re
import hashlib
import uuid
import os
from dataclasses import dataclass, field
from datetime import datetime

"""
NVIDIA NeMo Semantic Parent-Child Chunker & Schema Manager
Integrates Semantic Hierarchical Parent-Child Chunking with NVIDIA NeMo Retriever specifications.
"""

@dataclass
class Chunk:
    text: str
    section_title: str
    source_file: str
    category: str = "general"
    page_number: int = 1
    parent_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    title: str = "MSAJCE Campus Document"
    url: str = "https://msajce-edu.in"
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
        full_text = f"{doc_title} — {sec_title}\n\n{self.text}"
        
        return {
            "id": self.point_id,
            "payload": {
                "text": full_text,
                "raw_text": self.text,
                "title": self.title,
                "topic_title": self.title,
                "section_title": self.section_title,
                "source_file": self.source_file,
                "url": self.url,
                "page_url": self.url,
                "category": self.category,
                "department": self.department,
                "document_type": self.document_type,
                "page_number": self.page_number,
                "chunk_index": self.chunk_index,
                "total_chunks": self.total_chunks,
                "entities": self.entities,
                "keywords": self.keywords or extract_keywords(self.text),
                "parent_id": self.parent_id,
                "chunk_hash": self.chunk_hash,
                "scraped_at": self.scraped_at,
                "chunk_id": f"{self.source_file.replace('.md','')}_{self.chunk_index:03d}",
                "document_version": "2026-27",
                "is_current": True
            }
        }

def extract_keywords(text: str) -> list:
    words = re.findall(r'\b[a-zA-Z0-9]{4,}\b', text.lower())
    stopwords = {"this", "that", "with", "from", "have", "more", "will", "been", "were", "they", "their", "about", "which", "shall", "under"}
    unique_kw = list(dict.fromkeys([w for w in words if w not in stopwords]))
    return unique_kw[:10]
