import sys
import psycopg

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

import os
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dotenv_path = os.path.join(BASE_DIR, ".env")
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
else:
    load_dotenv()

db_url = os.getenv("DATABASE_URL", "postgresql://neondb_owner:npg_paA3JgI7qNiE@ep-small-hill-ayswm787.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require")

schema_sql = """
-- 1. Chat Sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
    session_id VARCHAR(64) PRIMARY KEY,
    user_ip VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
    message_id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    citations JSONB DEFAULT '[]'::jsonb,
    model_used VARCHAR(100),
    latency_ms FLOAT,
    token_usage JSONB DEFAULT '{}'::jsonb,
    is_cached BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- 3. Message Feedback (Thumbs Up / Down)
CREATE TABLE IF NOT EXISTS message_feedback (
    feedback_id VARCHAR(64) PRIMARY KEY,
    message_id VARCHAR(64) REFERENCES chat_messages(message_id) ON DELETE CASCADE,
    session_id VARCHAR(64),
    rating VARCHAR(20) NOT NULL CHECK (rating IN ('thumbs_up', 'thumbs_down')),
    feedback_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_feedback_message_id ON message_feedback(message_id);

-- Ensure pgvector extension is enabled if available
CREATE EXTENSION IF NOT EXISTS vector;

-- 4. Query Cache (Zero-Token Exact & Semantic Cache)
CREATE TABLE IF NOT EXISTS query_cache (
    query_hash VARCHAR(64) PRIMARY KEY,
    query_embedding vector(2048),
    query_text TEXT NOT NULL,
    answer_text TEXT NOT NULL,
    source_chunks JSONB DEFAULT '[]'::jsonb,
    document_version VARCHAR(50) DEFAULT '2026-27',
    is_current BOOLEAN DEFAULT TRUE,
    confidence_score FLOAT DEFAULT 1.0,
    is_admin_verified BOOLEAN DEFAULT FALSE,
    hit_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_hit_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure columns exist if query_cache table pre-existed
ALTER TABLE query_cache ADD COLUMN IF NOT EXISTS query_embedding vector(2048);
ALTER TABLE query_cache ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_query_cache_is_current ON query_cache(is_current);

-- 5. Self-Healing Correction Candidates (from thumbs-down audit)
CREATE TABLE IF NOT EXISTS correction_candidates (
    candidate_id VARCHAR(64) PRIMARY KEY,
    message_id VARCHAR(64),
    user_query TEXT NOT NULL,
    bot_answer TEXT NOT NULL,
    issue_type VARCHAR(50) CHECK (issue_type IN ('USER_DISSATISFACTION', 'FACTUAL_ERROR', 'AMBIGUITY', 'OUTDATED_INFO')),
    proposed_correction TEXT,
    dislike_reason TEXT,
    sources JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'APPLIED', 'RE_EVALUATED')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE correction_candidates ADD COLUMN IF NOT EXISTS dislike_reason TEXT;
ALTER TABLE correction_candidates ADD COLUMN IF NOT EXISTS sources JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_correction_candidates_status ON correction_candidates(status);
"""

if __name__ == "__main__":
    print("Connecting to Neon PostgreSQL...", flush=True)
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(schema_sql)
            conn.commit()
            print("Successfully initialized all 5 core tables in Neon PostgreSQL!", flush=True)
            
            cur.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name;
            """)
            tables = cur.fetchall()
            print("Current tables in Neon DB:", [t[0] for t in tables], flush=True)
