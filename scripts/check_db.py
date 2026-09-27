#!/usr/bin/env python3
"""
Lorin AI - Database Table Row Count & User Inspector

Displays exact row counts for all database tables AND extracts unique user counts.
Does NOT modify or delete any data.

Usage:
    python check_db.py
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
    os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
    os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend", ".env")
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
    print("\n" + "=" * 55)
    print("      LORIN AI - DATABASE & USER INSPECTOR")
    print("=" * 55)

    try:
        conn = psycopg2.connect(DATABASE_URL, sslmode="require")
        cur = conn.cursor()

        # 1. Find all user/public tables
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

        # 2. Fetch count for each table
        counts = {}
        total_rows = 0
        for tbl in tables:
            try:
                cur.execute(f'SELECT COUNT(*) FROM "{tbl}";')
                cnt = cur.fetchone()[0]
                counts[tbl] = cnt
                total_rows += cnt
            except Exception:
                conn.rollback()
                counts[tbl] = "Error"

        print(f"\n[TABLE ROW COUNTS]")
        print(f"{'Table Name':<32} {'Rows':<12}")
        print("-" * 46)
        for tbl, cnt in counts.items():
            print(f"{tbl:<32} {str(cnt):<12}")
        print("-" * 46)
        print(f"{'TOTAL ROWS ACROSS ALL TABLES':<32} {str(total_rows):<12}")

        # 3. User Statistics (from chat_sessions)
        print("\n" + "=" * 55)
        print("[USER & AUDIENCE METRICS]")
        print("-" * 55)
        try:
            cur.execute("""
                SELECT 
                    COUNT(DISTINCT user_id) AS unique_users,
                    COUNT(DISTINCT user_ip) AS unique_ips,
                    COUNT(*) AS total_sessions,
                    COUNT(DISTINCT CASE WHEN user_name IS NOT NULL AND user_name != '' THEN user_name END) AS named_users
                FROM chat_sessions;
            """)
            u_users, u_ips, t_sessions, n_users = cur.fetchone()
            print(f"  • Unique Users (user_id):      {u_users or 0}")
            print(f"  • Unique IP Addresses:         {u_ips or 0}")
            print(f"  • Named User Profiles:         {n_users or 0}")
            print(f"  • Total Chat Sessions:         {t_sessions or 0}")

            # Show recent users if available
            cur.execute("""
                SELECT DISTINCT ON (user_id)
                    user_id, 
                    COALESCE(user_name, 'Anonymous') AS name,
                    COALESCE(user_ip, 'Unknown') AS ip,
                    last_active_at
                FROM chat_sessions
                WHERE user_id IS NOT NULL
                ORDER BY user_id, last_active_at DESC
                LIMIT 10;
            """)
            user_rows = cur.fetchall()
            if user_rows:
                print("\n  [Recent Active Users]:")
                print(f"  {'User ID':<28} {'Name':<15} {'IP':<15} {'Last Active'}")
                print("  " + "-" * 75)
                for u in user_rows:
                    last_str = str(u[3])[:19] if u[3] else "N/A"
                    print(f"  {str(u[0]):<28} {str(u[1]):<15} {str(u[2]):<15} {last_str}")
        except Exception as e:
            conn.rollback()
            print(f"  [Notice] Could not query user metrics: {e}")

        print("=" * 55 + "\n")

        cur.close()
        conn.close()

    except Exception as e:
        print(f"\n[ERROR] Database connection failed: {e}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
