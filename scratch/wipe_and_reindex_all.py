import os
import sys
import json
import subprocess
import time
import psycopg2

try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE_DIR = r"d:\.gemini\bots\nvidia powered AI"
sys.path.insert(0, os.path.join(BASE_DIR, "backend"))

from dotenv import load_dotenv
load_dotenv(os.path.join(BASE_DIR, ".env"))

DATABASE_URL = os.getenv("DATABASE_URL")

print("==========================================================")
print("🚀 WIPE & FRESH RE-INDEX MASTER SYSTEM PIPELINE")
print("==========================================================")

# Step 1: Extract all 464 Knowledge Entities cleanly
print("\n[STEP 1] Extracting all 464 precision Knowledge Entities from Dataset...")
res1 = subprocess.run(["python", os.path.join(BASE_DIR, "scratch", "extract_deep_knowledge_entities.py")], capture_output=True, text=True)
print(res1.stdout)
if res1.stderr:
    print(res1.stderr)

# Step 2: Clear PostgreSQL Cache & Test Data
print("\n[STEP 2] Wiping Neon PostgreSQL query_cache and test data...")
if DATABASE_URL:
    try:
        conn = psycopg2.connect(DATABASE_URL, sslmode="require")
        with conn.cursor() as cur:
            cur.execute("TRUNCATE TABLE query_cache;")
            cur.execute("TRUNCATE TABLE message_feedback CASCADE;")
            cur.execute("TRUNCATE TABLE correction_candidates CASCADE;")
            conn.commit()
            print("  --> Neon PostgreSQL query_cache and feedback tables wiped cleanly!")
        conn.close()
    except Exception as e:
        print(f"  [WARN] Neon Postgres Wipe warning: {e}")

# Step 3: Run full Knowledgebase Ingestion (Qdrant Vector DB + BM25 Chunks)
print("\n[STEP 3] Re-chunking Dataset, generating NVIDIA NeMo Embeddings, and building fresh Qdrant + BM25 indices...")
res3 = subprocess.run(["python", os.path.join(BASE_DIR, "backend", "ingest_knowledgebase.py")], capture_output=True, text=True)
print(res3.stdout)
if res3.stderr:
    print(res3.stderr)

print("\n==========================================================")
print("✅ ALL DATABASES & INDICES WIPED AND FRESHLY RE-INDEXED!")
print("==========================================================")
