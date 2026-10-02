import json
import logging
from typing import List, Dict, Any, Optional
import redis

from backend.app.config.settings import REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_URL

logger = logging.getLogger("lorin_ai.redis")

# Initialize Redis client
redis_client: Optional[redis.Redis] = None

# Local In-Memory Fallback Cache (if Redis Cloud host is unreachable)
_LOCAL_SESSION_CACHE: Dict[str, List[Dict[str, Any]]] = {}

def get_redis_client() -> Optional[redis.Redis]:
    global redis_client
    if redis_client is not None:
        return redis_client

    try:
        if REDIS_URL:
            client = redis.Redis.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=1.0, socket_timeout=1.0)
        elif REDIS_HOST and REDIS_HOST != "cloud.redis.io":
            client = redis.Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                password=REDIS_PASSWORD,
                decode_responses=True,
                socket_connect_timeout=1.0,
                socket_timeout=1.0
            )
        else:
            client = None

        if client and client.ping():
            logger.info("[Redis Cloud] Connected successfully to Redis Cloud cluster!")
            redis_client = client
            return redis_client
    except Exception as e:
        logger.warning(f"[Redis Cloud] Connection notice (using in-memory fallback): {e}")

    redis_client = None
    return None

def get_cached_session_history(session_id: str, limit: int = 10) -> List[Dict[str, Any]]:
    """
    Retrieves recent dialogue history for session_id in <1ms.
    First checks Redis Cloud cache; falls back to in-memory RAM cache.
    """
    client = get_redis_client()
    if client:
        try:
            key = f"session_history:{session_id}"
            raw_items = client.lrange(key, -limit, -1)
            if raw_items:
                messages = [json.loads(item) for item in raw_items]
                return messages
        except Exception as e:
            logger.warning(f"[Redis] Error reading session history: {e}")

    # Fallback to local RAM cache
    cached = _LOCAL_SESSION_CACHE.get(session_id, [])
    return cached[-limit:] if cached else []

def set_cached_session_history(session_id: str, messages: List[Dict[str, Any]], ttl_seconds: int = 86400) -> None:
    """
    Updates active session dialogue history in Redis Cloud with 24-hour TTL.
    """
    _LOCAL_SESSION_CACHE[session_id] = messages
    client = get_redis_client()
    if client and messages:
        try:
            key = f"session_history:{session_id}"
            pipe = client.pipeline()
            pipe.delete(key)
            for msg in messages:
                pipe.rpush(key, json.dumps(msg))
            pipe.expire(key, ttl_seconds)
            pipe.execute()
        except Exception as e:
            logger.warning(f"[Redis] Error caching session history: {e}")

def append_cached_session_message(session_id: str, role: str, content: str, ttl_seconds: int = 86400) -> None:
    """
    Appends a new turn message (user or assistant) to Redis Cloud session history.
    """
    msg = {"role": role, "content": content}
    if session_id not in _LOCAL_SESSION_CACHE:
        _LOCAL_SESSION_CACHE[session_id] = []
    _LOCAL_SESSION_CACHE[session_id].append(msg)
    if len(_LOCAL_SESSION_CACHE[session_id]) > 20:
        _LOCAL_SESSION_CACHE[session_id] = _LOCAL_SESSION_CACHE[session_id][-20:]

    client = get_redis_client()
    if client:
        try:
            key = f"session_history:{session_id}"
            client.rpush(key, json.dumps(msg))
            client.ltrim(key, -20, -1)
            client.expire(key, ttl_seconds)
        except Exception as e:
            logger.warning(f"[Redis] Error appending message: {e}")
