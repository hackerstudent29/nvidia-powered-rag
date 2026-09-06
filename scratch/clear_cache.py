import os
import psycopg2

NEON_DB_URL = "postgresql://neondb_owner:npg_paA3JgI7qNiE@ep-small-hill-ayswm787.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require"

try:
    conn = psycopg2.connect(NEON_DB_URL)
    cur = conn.cursor()
    cur.execute("TRUNCATE TABLE query_cache;")
    conn.commit()
    cur.close()
    conn.close()
    print("Successfully flushed NeonDB query_cache table!")
except Exception as e:
    print(f"Error flushing NeonDB cache: {e}")
