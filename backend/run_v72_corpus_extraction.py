"""
LORIN V7.2 — CORPUS-WIDE ENTITY EXTRACTION & NEON POSTGRESQL SYNC
===================================================================
Executes automated entity, mention, claim, and relationship extraction across
all 51 knowledge base documents in Dataset/. Populates Neon PostgreSQL tables:
entities, entity_aliases, entity_mentions, entity_claims, entity_relationships, entity_chunk_map.
"""

import os
import sys
import logging

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("lorin_v72_extraction")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from backend.core.entity_knowledge import global_entity_registry, CorpusEntityExtractor

def main():
    logger.info("=================================================================")
    logger.info("🚀 LORIN V7.2 - AUTOMATED CORPUS-WIDE ENTITY EXTRACTION & SYNC")
    logger.info("=================================================================")

    dataset_dir = os.path.join(BASE_DIR, "Dataset")
    if not os.path.exists(dataset_dir):
        logger.error(f"Dataset directory not found at: {dataset_dir}")
        sys.exit(1)

    extractor = CorpusEntityExtractor(dataset_dir=dataset_dir, registry=global_entity_registry)
    results = extractor.extract_from_corpus()

    logger.info("\n📊 V7.2 CORPUS ENTITY EXTRACTION SUMMARY:")
    logger.info(f"   • Total Documents Processed:      {results['total_documents']}")
    logger.info(f"   • Total Mentions Extracted:       {results['total_mentions_processed']}")
    logger.info(f"   • New Entities Discovered:        {results['new_entities_discovered']}")
    logger.info(f"   • Total Canonical Entities:       {results['total_canonical_entities']}")
    logger.info(f"   • Total Entity-Chunk Mappings:    {results['total_chunk_mappings']}")
    logger.info("=================================================================\n")

if __name__ == "__main__":
    main()
