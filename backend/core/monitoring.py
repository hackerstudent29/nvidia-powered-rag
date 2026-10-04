"""
Lorin AI — Production Monitoring & Health Metrics Module (RC1)
==============================================================
1. Health Probes: /healthz (liveness) and /ready (readiness with deep component checks).
2. Prometheus-compatible /metrics exporter.
3. Metric accumulators for request counts, latencies, evidence decisions, and taxonomy errors.
"""

import time
import threading
from typing import Dict, Any, List
from collections import defaultdict

class MetricsRegistry:
    """Thread-safe in-memory Prometheus metrics collector."""
    def __init__(self):
        self._lock = threading.Lock()
        self.request_counts: Dict[str, int] = defaultdict(int)
        self.decision_counts: Dict[str, int] = defaultdict(int)
        self.taxonomy_counts: Dict[str, int] = defaultdict(int)
        self.latency_buckets = [0.1, 0.25, 0.5, 1.0, 2.0, 3.0, 5.0, 10.0, float("inf")]
        self.latency_histogram: Dict[float, int] = {b: 0 for b in self.latency_buckets}
        self.latency_sum = 0.0
        self.latency_count = 0
        self.circuit_breaker_trips = 0

    def record_request(self, status_code: int, decision: str, duration_s: float):
        with self._lock:
            self.request_counts[str(status_code)] += 1
            self.decision_counts[decision] += 1
            self.latency_sum += duration_s
            self.latency_count += 1
            for b in self.latency_buckets:
                if duration_s <= b:
                    self.latency_histogram[b] += 1

    def record_taxonomy_failure(self, category: str, name: str):
        with self._lock:
            key = f'{category}:{name}'
            self.taxonomy_counts[key] += 1

    def record_circuit_trip(self):
        with self._lock:
            self.circuit_breaker_trips += 1

    def generate_prometheus_metrics(self, active_sessions: int = 0) -> str:
        """Outputs metrics formatted per Prometheus text-based exposition format 0.0.4."""
        lines = []
        with self._lock:
            # 1. Total Requests
            lines.append("# HELP lorin_http_requests_total Total HTTP requests processed.")
            lines.append("# TYPE lorin_http_requests_total counter")
            for status, count in self.request_counts.items():
                lines.append(f'lorin_http_requests_total{{status="{status}"}} {count}')

            # 2. Evidence Decisions
            lines.append("# HELP lorin_rag_decisions_total Total RAG evidence contract decisions.")
            lines.append("# TYPE lorin_rag_decisions_total counter")
            for dec, count in self.decision_counts.items():
                lines.append(f'lorin_rag_decisions_total{{decision="{dec}"}} {count}')

            # 3. Latency Histogram
            lines.append("# HELP lorin_request_duration_seconds Latency histogram of Lorin AI queries.")
            lines.append("# TYPE lorin_request_duration_seconds histogram")
            for b, count in sorted(self.latency_histogram.items(), key=lambda x: x[0]):
                le_str = "+Inf" if b == float("inf") else str(b)
                lines.append(f'lorin_request_duration_seconds_bucket{{le="{le_str}"}} {count}')
            lines.append(f'lorin_request_duration_seconds_sum {round(self.latency_sum, 4)}')
            lines.append(f'lorin_request_duration_seconds_count {self.latency_count}')

            # 4. Taxonomy Failures
            lines.append("# HELP lorin_failure_taxonomy_total RAG taxonomy failure counts.")
            lines.append("# TYPE lorin_failure_taxonomy_total counter")
            for key, count in self.taxonomy_counts.items():
                cat, name = key.split(":", 1)
                lines.append(f'lorin_failure_taxonomy_total{{category="{cat}",name="{name}"}} {count}')

            # 5. Circuit Breaker Trips
            lines.append("# HELP lorin_circuit_breaker_trips_total Circuit breaker open events.")
            lines.append("# TYPE lorin_circuit_breaker_trips_total counter")
            lines.append(f'lorin_circuit_breaker_trips_total {self.circuit_breaker_trips}')

            # 6. Active Sessions Gauge
            lines.append("# HELP lorin_active_sessions Active user sessions in memory.")
            lines.append("# TYPE lorin_active_sessions gauge")
            lines.append(f'lorin_active_sessions {active_sessions}')

        return "\n".join(lines) + "\n"

global_metrics = MetricsRegistry()
