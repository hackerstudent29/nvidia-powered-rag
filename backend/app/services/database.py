import os
import logging
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool
from typing import Optional

from backend.app.config.settings import DATABASE_URL

logger = logging.getLogger("lorin_ai.db")

db_pool: Optional[ThreadedConnectionPool] = None

def init_db_pool() -> Optional[ThreadedConnectionPool]:
    global db_pool, DATABASE_URL
    if db_pool:
        return db_pool
    if DATABASE_URL:
        try:
            db_pool = ThreadedConnectionPool(minconn=2, maxconn=20, dsn=DATABASE_URL)
            logger.info("[DB Pool] ThreadedConnectionPool initialized (min=2, max=20)!")
            return db_pool
        except Exception as e:
            logger.warning(f"[DB Pool] Initialization error: {e}")
    return None

def get_db_connection():
    """Returns a pooled connection or direct connection to PostgreSQL."""
    global db_pool, DATABASE_URL
    if db_pool:
        try:
            return db_pool.getconn()
        except Exception as e:
            logger.warning(f"[DB Pool] Failed to get connection from pool: {e}")
    if DATABASE_URL:
        try:
            return psycopg2.connect(DATABASE_URL, sslmode="require")
        except Exception as e:
            logger.error(f"[DB] Direct DB connection failed: {e}")
            return None
    return None

def release_db_connection(conn):
    """Releases connection back to pool or closes it."""
    global db_pool
    if conn:
        if db_pool:
            try:
                db_pool.putconn(conn)
                return
            except Exception:
                pass
        try:
            conn.close()
        except Exception:
            pass

class DBContext:
    def __enter__(self):
        self.conn = get_db_connection()
        return self.conn

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.conn:
            release_db_connection(self.conn)
