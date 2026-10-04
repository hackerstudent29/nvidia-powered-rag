"""
Lorin AI — Production Resilience & Reliability Module (RC1)
============================================================
1. Exponential Backoff with Jitter for external API and network calls.
2. Circuit Breaker for Upstream Providers (NVIDIA NIM, Qdrant, Embeddings).
3. Graceful Degradation / Fallback handling for DNS / Timeout jitters.
"""

import time
import random
import logging
import asyncio
from enum import Enum
from typing import Callable, Any, Optional, Dict, Type

logger = logging.getLogger("lorin_ai.resilience")

# ---------------------------------------------------------------------------
# 1. Exponential Backoff & Retry Decorator / Wrapper
# ---------------------------------------------------------------------------
RETRYABLE_EXCEPTIONS = (
    ConnectionError,
    TimeoutError,
    OSError, # includes Errno 11001 getaddrinfo failed / DNS resolution
)

# Also check for httpx / requests exceptions dynamically if present
try:
    import httpx
    RETRYABLE_EXCEPTIONS += (httpx.ConnectError, httpx.ReadTimeout, httpx.ConnectTimeout)
except ImportError:
    pass

try:
    import requests
    RETRYABLE_EXCEPTIONS += (requests.exceptions.ConnectionError, requests.exceptions.Timeout)
except ImportError:
    pass


def with_retry(
    max_retries: int = 3,
    initial_delay: float = 0.5,
    backoff_factor: float = 2.0,
    jitter: bool = True,
    retry_exceptions: tuple = RETRYABLE_EXCEPTIONS
):
    """
    Decorator for synchronous functions with exponential backoff and jitter.
    Protects against transient network glitches, socket drops, and DNS resolution failures.
    """
    def decorator(func: Callable):
        def wrapper(*args, **kwargs):
            delay = initial_delay
            last_exception = None
            for attempt in range(1, max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except retry_exceptions as e:
                    last_exception = e
                    if attempt == max_retries:
                        logger.error(f"[Resilience] Call {func.__name__} failed permanently after {max_retries} attempts: {e}")
                        raise
                    
                    sleep_time = delay
                    if jitter:
                        sleep_time += random.uniform(0, delay * 0.5)
                    
                    logger.warning(
                        f"[Resilience] Call {func.__name__} failed (attempt {attempt}/{max_retries}): {e}. "
                        f"Retrying in {sleep_time:.2f}s..."
                    )
                    time.sleep(sleep_time)
                    delay *= backoff_factor
                except Exception as e:
                    # Non-retryable exception (e.g. 400 Bad Request, auth failure)
                    raise e
            raise last_exception
        return wrapper
    return decorator


def with_async_retry(
    max_retries: int = 3,
    initial_delay: float = 0.5,
    backoff_factor: float = 2.0,
    jitter: bool = True,
    retry_exceptions: tuple = RETRYABLE_EXCEPTIONS
):
    """
    Decorator for asynchronous coroutines with exponential backoff and jitter.
    """
    def decorator(func: Callable):
        async def wrapper(*args, **kwargs):
            delay = initial_delay
            last_exception = None
            for attempt in range(1, max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except retry_exceptions as e:
                    last_exception = e
                    if attempt == max_retries:
                        logger.error(f"[Resilience] Async call {func.__name__} failed permanently after {max_retries} attempts: {e}")
                        raise
                    
                    sleep_time = delay
                    if jitter:
                        sleep_time += random.uniform(0, delay * 0.5)
                    
                    logger.warning(
                        f"[Resilience] Async call {func.__name__} failed (attempt {attempt}/{max_retries}): {e}. "
                        f"Retrying in {sleep_time:.2f}s..."
                    )
                    await asyncio.sleep(sleep_time)
                    delay *= backoff_factor
                except Exception as e:
                    raise e
            raise last_exception
        return wrapper
    return decorator


# ---------------------------------------------------------------------------
# 2. Circuit Breaker
# ---------------------------------------------------------------------------
class CircuitState(str, Enum):
    CLOSED = "CLOSED"         # Normal operation
    OPEN = "OPEN"             # Upstream failing, fast fail / fallback
    HALF_OPEN = "HALF_OPEN"   # Testing recovery


class CircuitBreakerOpenException(Exception):
    """Raised when request is rejected immediately due to open circuit."""
    pass


class CircuitBreaker:
    """
    In-memory Circuit Breaker to prevent cascading failures when an external
    dependency (e.g. NVIDIA NIM API or Qdrant Cloud) experiences degradation.
    """
    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
        half_open_max_calls: int = 2
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max_calls = half_open_max_calls

        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_state_change = time.time()
        self.half_open_calls = 0

    def _update_state(self, new_state: CircuitState):
        logger.warning(f"[CircuitBreaker:{self.name}] Transitioning {self.state} -> {new_state}")
        self.state = new_state
        self.last_state_change = time.time()
        if new_state == CircuitState.CLOSED:
            self.failure_count = 0
            self.half_open_calls = 0
        elif new_state == CircuitState.HALF_OPEN:
            self.half_open_calls = 0

    def can_execute(self) -> bool:
        now = time.time()
        if self.state == CircuitState.CLOSED:
            return True
        elif self.state == CircuitState.OPEN:
            if now - self.last_state_change >= self.recovery_timeout:
                self._update_state(CircuitState.HALF_OPEN)
                return True
            return False
        elif self.state == CircuitState.HALF_OPEN:
            return self.half_open_calls < self.half_open_max_calls
        return False

    def record_success(self):
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.half_open_max_calls:
                self._update_state(CircuitState.CLOSED)
                self.success_count = 0
        elif self.state == CircuitState.CLOSED:
            self.failure_count = 0

    def record_failure(self):
        self.failure_count += 1
        if self.state == CircuitState.HALF_OPEN:
            self._update_state(CircuitState.OPEN)
        elif self.state == CircuitState.CLOSED and self.failure_count >= self.failure_threshold:
            self._update_state(CircuitState.OPEN)

    def __call__(self, func: Callable):
        def wrapper(*args, **kwargs):
            if not self.can_execute():
                logger.error(f"[CircuitBreaker:{self.name}] Call blocked - Circuit is {self.state}")
                raise CircuitBreakerOpenException(f"Circuit breaker '{self.name}' is OPEN.")
            
            if self.state == CircuitState.HALF_OPEN:
                self.half_open_calls += 1

            try:
                result = func(*args, **kwargs)
                self.record_success()
                return result
            except RETRYABLE_EXCEPTIONS as e:
                self.record_failure()
                raise e
            except Exception as e:
                raise e
        return wrapper


# Pre-configured circuit breakers for upstream services
qdrant_circuit_breaker = CircuitBreaker("qdrant", failure_threshold=5, recovery_timeout=20.0)
nvidia_nim_circuit_breaker = CircuitBreaker("nvidia_nim", failure_threshold=4, recovery_timeout=30.0)
