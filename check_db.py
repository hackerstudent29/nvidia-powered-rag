#!/usr/bin/env python3
"""
Lorin AI - Database Table Row Count Inspector

Displays exact row counts for all tables in the PostgreSQL / Neon database.
Does NOT modify or delete any data.

Usage:
    python check_db.py
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

def main():
    print("\n" + "=" * 50)
    print(" LORIN AI - DATABASE TABLE ROW COUNTS")
    print("=" * 50)

    try:
        conn = psycopg2.connect(DATABASE_URL, sslmode="require")
        cur = conn.cursor()

        # Find all user/public tables
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """)
        tables = [r[0] for r in cur.fetchall()]

        if not tables:
            print("[INFO] No public tables found in the database.")
            return

        # Fetch count for each table
        counts = {}
        total_rows = 0
        for tbl in tables:
            try:
                cur.execute(f'SELECT COUNT(*) FROM "{tbl}";')
                cnt = cur.fetchone()[0]
                counts[tbl] = cnt
                total_rows += cnt
            except Exception as e:
                conn.rollback()
                counts[tbl] = "Error"

        print(f"\n{'Table Name':<32} {'Rows':<12}")
        print("-" * 46)
        for tbl, cnt in counts.items():
            print(f"{tbl:<32} {str(cnt):<12}")
        print("-" * 46)
        print(f"{'TOTAL ROWS ACROSS ALL TABLES':<32} {str(total_rows):<12}")
        print("=" * 50 + "\n")

        cur.close()
        conn.close()

    except Exception as e:
        print(f"\n[ERROR] Database connection failed: {e}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
