"""
Lorin AI — Cache Service Module
===============================
Provides exact MD5 hash caching, semantic vector similarity caching,
and DB-backed state persistence for user request counters and regeneration limits.
"""

import hashlib
import time
from typing import Dict, Any, Optional
from psycopg2.extras import RealDictCursor

from backend.core.config import get_db_connection, release_db_connection

# Local RAM fallback state caches
REGEN_COUNTS_MAP: Dict[str, int] = {}
RATE_LIMIT_MAP: Dict[str, Any] = {}

def get_db_regen_count(regen_key: str) -> int:
    """Retrieves current regeneration count for key from PostgreSQL DB (or RAM fallback)."""
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT request_count FROM user_request_counters WHERE counter_key = %s;", (f"regen_{regen_key}",))
                row = cur.fetchone()
                if row:
                    return int(row["request_count"])
        except Exception:
            pass
        finally:
            release_db_connection(conn)
    return REGEN_COUNTS_MAP.get(regen_key, 0)

def increment_db_regen_count(regen_key: str) -> int:
    """Increments regeneration count in PostgreSQL DB (and RAM fallback) atomically."""
    new_count = REGEN_COUNTS_MAP.get(regen_key, 0) + 1
    REGEN_COUNTS_MAP[regen_key] = new_count
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO user_request_counters (counter_key, request_count, updated_at)
                    VALUES (%s, 1, NOW())
                    ON CONFLICT (counter_key) DO UPDATE SET
                        request_count = user_request_counters.request_count + 1,
                        updated_at = NOW()
                    RETURNING request_count;
                """, (f"regen_{regen_key}",))
                row = cur.fetchone()
                conn.commit()
                if row:
                    new_count = int(row[0])
        except Exception:
            pass
        finally:
            release_db_connection(conn)
    return new_count
