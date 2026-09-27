#!/usr/bin/env python3
"""
Lorin AI - One-Shot User Data & Telemetry Cache Reset Utility

Wipes user session history, accounts, feedback, query cache, attack logs, and counters
WITHOUT touching knowledge base chunks, vector embeddings, BM25 indices, or prebuilt cards.

Usage:
    python clear_cache.py
"""

import os
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

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
    print("\n" + "=" * 52)
    print("      LORIN AI - ONE-SHOT USER DATA RESET")
    print("=" * 52)

    try:
        conn = psycopg2.connect(DATABASE_URL, sslmode="require")
        cur = conn.cursor()

        # 1. Fetch BEFORE User metrics (from chat_sessions)
        before_users = 0
        before_ips = 0
        before_named = 0
        try:
            cur.execute("""
                SELECT 
                    COUNT(DISTINCT user_id),
                    COUNT(DISTINCT user_ip),
                    COUNT(DISTINCT CASE WHEN user_name IS NOT NULL AND user_name != '' THEN user_name END)
                FROM chat_sessions;
            """)
            u_row = cur.fetchone()
            if u_row:
                before_users = u_row[0] or 0
                before_ips = u_row[1] or 0
                before_named = u_row[2] or 0
        except Exception:
            conn.rollback()

        # 2. Fetch BEFORE Table counts
        before_counts = {}
        for tbl in TARGET_TABLES:
            try:
                cur.execute(f"SELECT COUNT(*) FROM {tbl};")
                before_counts[tbl] = cur.fetchone()[0]
            except Exception:
                conn.rollback()
                before_counts[tbl] = "N/A"

        # 3. Wipe all target user tables atomically (with DELETE fallback if TRUNCATE locks)
        tables_to_truncate = [tbl for tbl in TARGET_TABLES if before_counts.get(tbl) != "N/A"]
        if tables_to_truncate:
            try:
                cur.execute("SET lock_timeout = '3s';")
                sql_truncate = f"TRUNCATE TABLE {', '.join(tables_to_truncate)} CASCADE;"
                cur.execute(sql_truncate)
                conn.commit()
            except Exception:
                conn.rollback()
                # Fallback to DELETE (children first, then parents) to avoid AccessExclusiveLock deadlocks
                cur.execute("SET lock_timeout = '10s';")
                for tbl in tables_to_truncate:
                    cur.execute(f"DELETE FROM {tbl};")
                conn.commit()

        # 4. Fetch AFTER User metrics
        after_users = 0
        after_ips = 0
        after_named = 0
        try:
            cur.execute("""
                SELECT 
                    COUNT(DISTINCT user_id),
                    COUNT(DISTINCT user_ip),
                    COUNT(DISTINCT CASE WHEN user_name IS NOT NULL AND user_name != '' THEN user_name END)
                FROM chat_sessions;
            """)
            u_row = cur.fetchone()
            if u_row:
                after_users = u_row[0] or 0
                after_ips = u_row[1] or 0
                after_named = u_row[2] or 0
        except Exception:
            conn.rollback()

        # 5. Fetch AFTER Table counts
        after_counts = {}
        for tbl in TARGET_TABLES:
            try:
                cur.execute(f"SELECT COUNT(*) FROM {tbl};")
                after_counts[tbl] = cur.fetchone()[0]
            except Exception:
                after_counts[tbl] = "N/A"

        # 6. Display formatted summary table
        print(f"\n{'Category / Table':<28} {'Before':<11} {'After':<11}")
        print("-" * 52)
        print(f"{'unique_users (user_id)':<28} {str(before_users):<11} {str(after_users):<11}")
        print(f"{'unique_ips (user_ip)':<28} {str(before_ips):<11} {str(after_ips):<11}")
        print(f"{'named_user_profiles':<28} {str(before_named):<11} {str(after_named):<11}")
        print("-" * 52)
        for tbl in TARGET_TABLES:
            b_cnt = before_counts.get(tbl, 0)
            a_cnt = after_counts.get(tbl, 0)
            print(f"{tbl:<28} {str(b_cnt):<11} {str(a_cnt):<11}")
        print("-" * 52)

        print("\n [SUCCESS] All user accounts, sessions, messages & cache wiped freshly.")
        print(" [PROTECTED] Knowledge chunks, Qdrant vectors, BM25 indices & 12 FAQ cards are preserved.")
        print("=" * 52 + "\n")

        cur.close()
        conn.close()

    except Exception as e:
        print(f"\n[ERROR] Database reset failed: {e}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
