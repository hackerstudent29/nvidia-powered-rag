"""
Ground Truth Manifest Builder for Lorin AI Evaluation
======================================================
Parses all 51 Markdown dataset files, knowledge entities, BM25 corpus, and bus routes
to construct a unified ground_truth_manifest.json for 500+ QA generation.
"""

import os
import sys
import json
import glob
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_DIR = os.path.join(os.path.dirname(BASE_DIR), "Dataset")
DATA_DIR = os.path.join(BASE_DIR, "data")

def main():
    print("[INIT] Building Ground Truth Manifest...")

    # 1. Document Inventory
    md_files = glob.glob(os.path.join(DATASET_DIR, "*.md"))
    documents = []
    for filepath in md_files:
        filename = os.path.basename(filepath)
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        
        # Extract headings and tables
        headings = re.findall(r'^#{1,4}\s+(.+)$', content, flags=re.MULTILINE)
        has_tables = "|" in content and "-|-" in content
        
        documents.append({
            "filename": filename,
            "char_count": len(content),
            "line_count": len(content.splitlines()),
            "headings_count": len(headings),
            "sample_headings": headings[:5],
            "has_tables": has_tables
        })

    # 2. Knowledge Entities
    entities_path = os.path.join(DATA_DIR, "knowledge_entities.json")
    entities = []
    if os.path.exists(entities_path):
        with open(entities_path, "r", encoding="utf-8") as f:
            raw_entities = json.load(f)
            for e in raw_entities:
                entities.append({
                    "entity_key": e.get("entity_key"),
                    "entity_name": e.get("entity_name"),
                    "entity_type": e.get("entity_type"),
                    "aliases": e.get("aliases", []),
                    "source_file": e.get("source_file")
                })

    # 3. BM25 Corpus Chunks
    bm25_path = os.path.join(DATA_DIR, "bm25_chunks.json")
    chunks_count = 0
    if os.path.exists(bm25_path):
        with open(bm25_path, "r", encoding="utf-8") as f:
            bm25_chunks = json.load(f)
            chunks_count = len(bm25_chunks)

    # 4. Transport Data
    routes_path = os.path.join(DATA_DIR, "bus_routes.json")
    stops_path = os.path.join(DATA_DIR, "bus_stops_master.json")
    routes_count = 0
    stops_count = 0
    if os.path.exists(routes_path):
        with open(routes_path, "r", encoding="utf-8") as f:
            routes_count = len(json.load(f))
    if os.path.exists(stops_path):
        with open(stops_path, "r", encoding="utf-8") as f:
            stops_count = len(json.load(f))

    manifest = {
        "document_count": len(documents),
        "total_knowledge_chunks": chunks_count,
        "total_entities": len(entities),
        "total_bus_routes": routes_count,
        "total_bus_stops": stops_count,
        "documents": documents,
        "sample_entities": entities[:10]
    }

    manifest_path = os.path.join(DATA_DIR, "ground_truth_manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"[SUCCESS] Ground Truth Manifest created with {len(documents)} documents, {chunks_count} chunks, {len(entities)} entities, {routes_count} routes, {stops_count} stops.")

if __name__ == "__main__":
    main()
