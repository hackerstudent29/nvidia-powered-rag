"""
Lorin AI — Production RC1 Gates Unit & Integration Test Suite
=============================================================
Tests all 7 Production Readiness Pillars:
1. Security (Rate Limiting, Sanitization, Masking)
2. Observability (ContextVars Tracing, Structured JSON, Failure Taxonomy)
3. Reliability / Resilience (Exponential Backoff, Circuit Breaker)
4. Session Isolation (Multi-tenant Partitioning, Context Bleed Protection, TTL)
5. Monitoring (Prometheus Metrics Collector, Gauges, Histograms)
6. Rollback (Runtime Feature Flags, Safety Invariants)
"""

import os
import sys
import time
import json
import logging
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from core.security import SlidingWindowRateLimiter, sanitize_user_input, mask_sensitive_data
from core.observability import (
    trace_id_ctx, session_id_ctx, StructuredJsonFormatter, TAXONOMY_MAP, log_pipeline_telemetry
)
from core.resilience import (
    with_retry, CircuitBreaker, CircuitState, CircuitBreakerOpenException
)
from core.session_manager import SessionManager, SessionState
from core.monitoring import MetricsRegistry
from core.feature_flags import FeatureFlags


class TestRC1Security(unittest.TestCase):
    """Pillar 1: Security Gates"""
    def test_rate_limiter_burst_and_window(self):
        limiter = SlidingWindowRateLimiter(max_requests_per_minute=10, burst_limit=3)
        client = "192.168.1.100"

        # 3 requests within burst limit -> should pass
        for _ in range(3):
            allowed, count, retry_after = limiter.is_allowed(client)
            self.assertTrue(allowed)

        # 4th immediate request -> should trigger burst limit
        allowed, count, retry_after = limiter.is_allowed(client)
        self.assertFalse(allowed)
        self.assertGreater(retry_after, 0.0)

    def test_input_sanitization(self):
        # 1. HTML injection
        malicious = "Hello <script>alert('xss')</script> world!"
        cleaned = sanitize_user_input(malicious)
        self.assertNotIn("<script>", cleaned)
        self.assertNotIn("</script>", cleaned)
        self.assertIn("Hello", cleaned)

        # 2. Control characters
        ctrl_str = "Clean\x00\x08text\x1bwith\x7fcontrols"
        cleaned_ctrl = sanitize_user_input(ctrl_str)
        self.assertEqual(cleaned_ctrl, "Cleantextwithcontrols")

        # 3. Max length truncate
        oversized = "a" * 1500
        truncated = sanitize_user_input(oversized)
        self.assertEqual(len(truncated), 1000)

    def test_sensitive_data_masking(self):
        log_sample = "User authorization: Bearer nvapi-secretkey123456789 from student@msajce.edu.in"
        masked = mask_sensitive_data(log_sample)
        self.assertNotIn("nvapi-secretkey123456789", masked)
        self.assertIn("[REDACTED_TOKEN]", masked)
        self.assertNotIn("student@msajce.edu.in", masked)
        self.assertIn("[EMAIL_MASKED]", masked)


class TestRC1Observability(unittest.TestCase):
    """Pillar 2: Observability Gates"""
    def test_contextvars_tracing(self):
        trace_id_ctx.set("req_test_12345")
        session_id_ctx.set("sess_test_9999")
        self.assertEqual(trace_id_ctx.get(), "req_test_12345")
        self.assertEqual(session_id_ctx.get(), "sess_test_9999")

    def test_structured_json_logging(self):
        formatter = StructuredJsonFormatter()
        record = logging.LogRecord(
            name="lorin_test",
            level=logging.INFO,
            pathname=__file__,
            lineno=42,
            msg="Test log message",
            args=(),
            exc_info=None
        )
        record.telemetry = {"latency_ms": 12.5, "evidence_decision": "ANSWER"}
        formatted = formatter.format(record)
        parsed = json.loads(formatted)
        self.assertEqual(parsed["level"], "INFO")
        self.assertEqual(parsed["message"], "Test log message")
        self.assertIn("telemetry", parsed)
        self.assertEqual(parsed["telemetry"]["latency_ms"], 12.5)

    def test_taxonomy_coverage(self):
        # Must cover standard 13 failure codes A through M
        for char in "ABCDEFGHIJKLM":
            self.assertIn(char, TAXONOMY_MAP)


class TestRC1Reliability(unittest.TestCase):
    """Pillar 3: Reliability & Circuit Breaker Gates"""
    def test_exponential_backoff_retry(self):
        attempts = 0

        @with_retry(max_retries=3, initial_delay=0.01, backoff_factor=1.2, jitter=False)
        def flaky_network_call():
            nonlocal attempts
            attempts += 1
            if attempts < 3:
                raise ConnectionError("Temporary DNS getaddrinfo failed")
            return "SUCCESS"

        result = flaky_network_call()
        self.assertEqual(result, "SUCCESS")
        self.assertEqual(attempts, 3)

    def test_circuit_breaker_tripping_and_recovery(self):
        cb = CircuitBreaker("test_service", failure_threshold=2, recovery_timeout=0.05, half_open_max_calls=1)

        @cb
        def failing_api():
            raise ConnectionError("Upstream timeout")

        # 1st failure
        with self.assertRaises(ConnectionError):
            failing_api()
        self.assertEqual(cb.state, CircuitState.CLOSED)

        # 2nd failure -> Circuit trips to OPEN
        with self.assertRaises(ConnectionError):
            failing_api()
        self.assertEqual(cb.state, CircuitState.OPEN)

        # Immediate next call is blocked without executing
        with self.assertRaises(CircuitBreakerOpenException):
            failing_api()

        # Wait for recovery timeout
        time.sleep(0.06)
        self.assertTrue(cb.can_execute())
        self.assertEqual(cb.state, CircuitState.HALF_OPEN)


class TestRC1SessionIsolation(unittest.TestCase):
    """Pillar 4: Session Isolation Gates"""
    def test_session_state_isolation(self):
        sm = SessionManager(ttl_seconds=10)
        session_a = "sess_user_alpha_1234"
        session_b = "sess_user_beta_5678"

        # Record turns in session A
        sm.record_turn(session_a, "What is the hostel fee?", "Hostel fee is Rs. 85,000.", domain="hostel")

        # Record turns in session B
        sm.record_turn(session_b, "What is the CSE intake?", "CSE intake is 120 seats.", domain="academics")

        hist_a = sm.get_history(session_a)
        hist_b = sm.get_history(session_b)

        # Session A must not see Session B turns
        self.assertEqual(len(hist_a), 2)
        self.assertEqual(hist_a[0]["content"], "What is the hostel fee?")
        self.assertEqual(sm.get_session(session_a).domain, "hostel")

        # Session B must not see Session A turns
        self.assertEqual(len(hist_b), 2)
        self.assertEqual(hist_b[0]["content"], "What is the CSE intake?")
        self.assertEqual(sm.get_session(session_b).domain, "academics")

    def test_session_ttl_eviction(self):
        sm = SessionManager(ttl_seconds=0.05)
        sid = "sess_temporary_short_lived"
        sm.record_turn(sid, "Hello", "Hi there")
        self.assertEqual(sm.active_session_count(), 1)

        time.sleep(0.08)
        evicted = sm.clear_expired_sessions()
        self.assertEqual(evicted, 1)
        self.assertEqual(sm.active_session_count(), 0)


class TestRC1Monitoring(unittest.TestCase):
    """Pillar 5: Monitoring Gates"""
    def test_prometheus_metrics_generation(self):
        reg = MetricsRegistry()
        reg.record_request(200, "ANSWER", 0.125)
        reg.record_request(200, "ABSTAIN", 0.045)
        reg.record_taxonomy_failure("F", "Evidence contract")

        prom_text = reg.generate_prometheus_metrics(active_sessions=5)
        self.assertIn('lorin_http_requests_total{status="200"} 2', prom_text)
        self.assertIn('lorin_rag_decisions_total{decision="ANSWER"} 1', prom_text)
        self.assertIn('lorin_rag_decisions_total{decision="ABSTAIN"} 1', prom_text)
        self.assertIn('lorin_failure_taxonomy_total{category="F",name="Evidence contract"} 1', prom_text)
        self.assertIn('lorin_active_sessions 5', prom_text)


class TestRC1RollbackFeatureFlags(unittest.TestCase):
    """Pillar 6: Rollback & Feature Flag Gates"""
    def test_feature_flags_toggle(self):
        flags = FeatureFlags()
        self.assertTrue(flags.is_enabled("ADAPTIVE_DEPTH"))

        # Toggle flag off (instant rollback to baseline depth)
        flags.set_flag("ADAPTIVE_DEPTH", False)
        self.assertFalse(flags.is_enabled("ADAPTIVE_DEPTH"))

        # Safety Invariant: STRICT_ABSTENTION cannot be toggled off
        self.assertTrue(flags.is_enabled("STRICT_ABSTENTION"))
        success = flags.set_flag("STRICT_ABSTENTION", False)
        self.assertFalse(success)
        self.assertTrue(flags.is_enabled("STRICT_ABSTENTION"))


if __name__ == "__main__":
    unittest.main()
