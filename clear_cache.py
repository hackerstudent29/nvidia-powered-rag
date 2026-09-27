#!/usr/bin/env python3
"""
Lorin AI - One-Shot User Data & Telemetry Cache Reset Utility

Wipes user session history, feedback, query cache, attack logs, and counters
WITHOUT touching knowledge base chunks, vector embeddings, BM25 indices, or prebuilt cards.

Usage:
    python clear_cache.py
"""

import os
import sys
from dotenv import load_dotenv

# Load environment
for env_path in [
    os.path.join(os.path.dirname(__file__), ".env"),
    os.path.join(os.path.dirname(__file__), "backend", ".env")
]:
    if os.path.exists(env_path):
        load_dotenv(env_path, override=True)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("[ERROR] DATABASE_URL environment variable is not set.")
    sys.exit(1)

try:
    import psycopg2
except ImportError:
    print("[ERROR] psycopg2 is required. Run: pip install psycopg2-binary")
    sys.exit(1)

TARGET_TABLES = [
    "message_feedback",
    "correction_candidates",
    "chat_messages",
    "chat_sessions",
    "query_cache",
    "user_security_bans",
    "security_attack_logs",
    "user_request_counters"
]

def main():
    print("\n" + "=" * 50)
    print(" LORIN AI - ONE-SHOT USER DATA RESET")
    print("=" * 50)

    try:
        conn = psycopg2.connect(DATABASE_URL, sslmode="require")
        cur = conn.cursor()

        # 1. Fetch BEFORE counts
        before_counts = {}
        for tbl in TARGET_TABLES:
            try:
                cur.execute(f"SELECT COUNT(*) FROM {tbl};")
                before_counts[tbl] = cur.fetchone()[0]
            except Exception:
                conn.rollback()
                before_counts[tbl] = "N/A"

        # 2. TRUNCATE all target user tables atomically
        tables_to_truncate = [tbl for tbl in TARGET_TABLES if before_counts.get(tbl) != "N/A"]
        if tables_to_truncate:
            sql_truncate = f"TRUNCATE TABLE {', '.join(tables_to_truncate)} CASCADE;"
            cur.execute(sql_truncate)
            conn.commit()

        # 3. Fetch AFTER counts
        after_counts = {}
        for tbl in TARGET_TABLES:
            try:
                cur.execute(f"SELECT COUNT(*) FROM {tbl};")
                after_counts[tbl] = cur.fetchone()[0]
            except Exception:
                after_counts[tbl] = "N/A"

        # 4. Display formatted summary table
        print(f"\n{'Table':<25} {'Before':<10} {'After':<10}")
        print("-" * 47)
        for tbl in TARGET_TABLES:
            b_cnt = before_counts.get(tbl, 0)
            a_cnt = after_counts.get(tbl, 0)
            print(f"{tbl:<25} {str(b_cnt):<10} {str(a_cnt):<10}")
        print("-" * 47)

        print("\n [SUCCESS] All user cache & session records wiped freshly.")
        print(" [PROTECTED] Knowledge chunks, Qdrant vectors, BM25 indices & 12 FAQ cards are preserved.")
        print("=" * 50 + "\n")

        cur.close()
        conn.close()

    except Exception as e:
        print(f"\n[ERROR] Database reset failed: {e}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
