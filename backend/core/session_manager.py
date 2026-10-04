"""
Lorin AI — Session Isolation & Multi-Tenant Context Manager (RC1)
===================================================================
1. Strict Session Isolation: No cross-session bleeding of history, entities, or domain context.
2. Thread-safe in-memory session store with TTL (Time-To-Live) cleanup.
3. Max Turn Limit Enforcement (default 50 turns per session).
4. Secure Session ID validation and creation.
"""

import time
import re
import uuid
import threading
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field

SESSION_ID_REGEX = re.compile(r'^[a-zA-Z0-9_\-]{8,64}$')
DEFAULT_SESSION_TTL_SECONDS = 3600  # 1 hour idle TTL
MAX_TURNS_PER_SESSION = 50

@dataclass
class SessionState:
    session_id: str
    created_at: float = field(default_factory=time.time)
    last_accessed_at: float = field(default_factory=time.time)
    domain: Optional[str] = None
    active_subject: Optional[str] = None
    turn_count: int = 0
    history: List[Dict[str, str]] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def touch(self):
        self.last_accessed_at = time.time()

    def add_turn(self, role: str, content: str):
        self.touch()
        self.history.append({"role": role, "content": content})
        if len(self.history) > MAX_TURNS_PER_SESSION * 2:
            # Retain the most recent window of turns
            self.history = self.history[-MAX_TURNS_PER_SESSION * 2:]
        if role.lower() == "user":
            self.turn_count += 1

    def update_domain(self, domain: Optional[str], active_subject: Optional[str] = None):
        self.touch()
        if domain:
            self.domain = domain
        if active_subject:
            self.active_subject = active_subject

    def is_expired(self, ttl_seconds: float = DEFAULT_SESSION_TTL_SECONDS) -> bool:
        return (time.time() - self.last_accessed_at) > ttl_seconds


class SessionManager:
    """Thread-safe multi-session manager with automatic idle TTL eviction."""
    def __init__(self, ttl_seconds: float = DEFAULT_SESSION_TTL_SECONDS):
        self.ttl_seconds = ttl_seconds
        self._sessions: Dict[str, SessionState] = {}
        self._lock = threading.Lock()

    def validate_or_create_session_id(self, session_id: Optional[str]) -> str:
        """Validates incoming session_id format or generates a cryptographically sound UUID4."""
        if session_id and SESSION_ID_REGEX.match(session_id):
            return session_id
        return f"sess_{uuid.uuid4().hex}"

    def get_session(self, session_id: str) -> SessionState:
        """Retrieves or initializes an isolated session state."""
        clean_id = self.validate_or_create_session_id(session_id)
        with self._lock:
            # Check if existing session is expired
            if clean_id in self._sessions:
                sess = self._sessions[clean_id]
                if sess.is_expired(self.ttl_seconds):
                    del self._sessions[clean_id]
                else:
                    sess.touch()
                    return sess
            
            # Create new isolated session
            new_sess = SessionState(session_id=clean_id)
            self._sessions[clean_id] = new_sess
            return new_sess

    def record_turn(self, session_id: str, user_query: str, assistant_response: str, domain: Optional[str] = None):
        """Records a user-assistant dialogue turn within the isolated session."""
        sess = self.get_session(session_id)
        with self._lock:
            sess.add_turn("user", user_query)
            sess.add_turn("assistant", assistant_response)
            if domain:
                sess.update_domain(domain)

    def get_history(self, session_id: str) -> List[Dict[str, str]]:
        """Returns the conversation turns strictly isolated to this session."""
        sess = self.get_session(session_id)
        with self._lock:
            return list(sess.history)

    def clear_expired_sessions(self) -> int:
        """Evicts expired sessions to maintain low memory footprint."""
        with self._lock:
            now = time.time()
            expired_keys = [
                sid for sid, s in self._sessions.items()
                if (now - s.last_accessed_at) > self.ttl_seconds
            ]
            for sid in expired_keys:
                del self._sessions[sid]
            return len(expired_keys)

    def active_session_count(self) -> int:
        with self._lock:
            return len(self._sessions)


# Global singleton session manager
global_session_manager = SessionManager()
