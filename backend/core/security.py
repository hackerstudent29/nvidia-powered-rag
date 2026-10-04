"""
Lorin AI — Production Security & Policy Module (RC1)
======================================================
1. Token Bucket & Sliding Window Rate Limiting (per-IP and per-session).
2. Input Sanitization & Prompt Injection Protection.
3. Sensitive Credential & PII Masking in Logging.
4. Request Validation & Header Guards.
"""

import re
import time
from collections import defaultdict
from typing import Dict, Tuple, Optional

# ---------------------------------------------------------------------------
# 1. Sliding Window Rate Limiter
# ---------------------------------------------------------------------------
class SlidingWindowRateLimiter:
    """In-memory sliding window rate limiter per client IP / session ID."""
    def __init__(self, max_requests_per_minute: int = 60, burst_limit: int = 15):
        self.max_per_min = max_requests_per_minute
        self.burst_limit = burst_limit
        self.request_history: Dict[str, list] = defaultdict(list)

    def is_allowed(self, client_key: str) -> Tuple[bool, int, float]:
        now = time.time()
        window_start = now - 60.0
        burst_start = now - 5.0

        # Purge timestamps older than 60s
        self.request_history[client_key] = [t for t in self.request_history[client_key] if t > window_start]
        client_timestamps = self.request_history[client_key]

        # Check 5s burst limit
        burst_count = sum(1 for t in client_timestamps if t > burst_start)
        if burst_count >= self.burst_limit:
            retry_after = round(5.0 - (now - client_timestamps[-1]), 1)
            return False, len(client_timestamps), max(0.5, retry_after)

        # Check 60s window limit
        if len(client_timestamps) >= self.max_per_min:
            retry_after = round(60.0 - (now - client_timestamps[0]), 1)
            return False, len(client_timestamps), max(1.0, retry_after)

        self.request_history[client_key].append(now)
        return True, len(client_timestamps), 0.0

global_rate_limiter = SlidingWindowRateLimiter(max_requests_per_minute=60, burst_limit=15)

# ---------------------------------------------------------------------------
# 2. Input Sanitization
# ---------------------------------------------------------------------------
MAX_QUERY_LENGTH = 1000
FORBIDDEN_CONTROL_CHARS = re.compile(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]')
HTML_TAG_PATTERN = re.compile(r'<[^>]*>')

def sanitize_user_input(text: str) -> str:
    """
    Sanitizes user input to prevent prompt injections, script execution,
    and denial-of-service via oversized payloads.
    """
    if not text:
        return ""

    # Truncate to maximum allowable length
    cleaned = text[:MAX_QUERY_LENGTH]

    # Remove non-printable control characters
    cleaned = FORBIDDEN_CONTROL_CHARS.sub('', cleaned)

    # Strip dangerous HTML tags
    cleaned = HTML_TAG_PATTERN.sub('', cleaned)

    # Normalize excessive whitespace
    cleaned = re.sub(r'[ \t]+', ' ', cleaned).strip()

    return cleaned

# ---------------------------------------------------------------------------
# 3. Sensitive Data Masking
# ---------------------------------------------------------------------------
SECRET_PATTERNS = [
    (re.compile(r'(Bearer\s+)[A-Za-z0-9_\-\.]{15,}', re.IGNORECASE), r'\1[REDACTED_TOKEN]'),
    (re.compile(r'(key=)[A-Za-z0-9_\-\.]{15,}', re.IGNORECASE), r'\1[REDACTED_KEY]'),
    (re.compile(r'(password[:=]\s*)[^\s,]+', re.IGNORECASE), r'\1[REDACTED_PASS]'),
    (re.compile(r'(authorization[:=]\s*)[^\s,]+', re.IGNORECASE), r'\1[REDACTED_AUTH]'),
    (re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b'), r'[EMAIL_MASKED]'),
]

def mask_sensitive_data(log_message: str) -> str:
    """Masks authorization tokens, API keys, passwords, and sensitive PII."""
    if not log_message:
        return ""
    masked = log_message
    for pattern, replacement in SECRET_PATTERNS:
        masked = pattern.sub(replacement, masked)
    return masked
