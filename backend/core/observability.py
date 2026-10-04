"""
Lorin AI — Production Observability & Structured Tracing Module (RC1)
=====================================================================
1. ContextVars Request Tracing (trace_id, session_id propagation).
2. Structured JSON Logging with Stage Telemetry.
3. Standardized Error Taxonomy (A-M).
"""

import json
import time
import logging
import contextvars
from datetime import datetime, timezone
from typing import Dict, Any, Optional

# ContextVars for request and session propagation
trace_id_ctx = contextvars.ContextVar("trace_id", default="req_unassigned")
session_id_ctx = contextvars.ContextVar("session_id", default="sess_unassigned")

# Error / Failure Taxonomy
TAXONOMY_MAP = {
    "A": "Retrieval miss",
    "B": "Query expansion",
    "C": "Entity resolution",
    "D": "Ranking/RRF",
    "E": "Reranker",
    "F": "Evidence contract",
    "G": "Multi-hop",
    "H": "Follow-up/context",
    "I": "List completeness",
    "J": "LLM synthesis",
    "K": "API/streaming",
    "L": "Performance/timeout",
    "M": "Evaluation error"
}

class StructuredJsonFormatter(logging.Formatter):
    """Formats log records as parseable JSON for CloudWatch/Datadog/Grafana Loki."""
    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "trace_id": trace_id_ctx.get(),
            "session_id": session_id_ctx.get(),
        }

        # Include custom telemetry fields if passed in record.__dict__
        if hasattr(record, "telemetry") and isinstance(record.telemetry, dict):
            log_entry["telemetry"] = record.telemetry

        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry)

def setup_structured_logging(level=logging.INFO):
    """Configures structured JSON logging on the root logger."""
    handler = logging.StreamHandler()
    handler.setFormatter(StructuredJsonFormatter())
    
    app_logger = logging.getLogger("lorin_ai")
    app_logger.setLevel(level)
    app_logger.handlers = [handler]
    app_logger.propagate = False
    return app_logger

telemetry_logger = setup_structured_logging()

def log_pipeline_telemetry(
    query: str,
    decision: str,
    latency_ms: float,
    stage_durations: Dict[str, float],
    retrieved_count: int,
    refusal_reason: str = "NONE",
    failure_category: Optional[str] = None
):
    """Logs structured telemetry for each executed RAG request."""
    telemetry = {
        "query_snippet": query[:80],
        "evidence_decision": decision,
        "total_latency_ms": round(latency_ms, 2),
        "stage_timings_ms": stage_durations,
        "chunks_evaluated": retrieved_count,
        "refusal_reason": refusal_reason,
        "failure_category": failure_category,
        "failure_name": TAXONOMY_MAP.get(failure_category) if failure_category else None
    }
    telemetry_logger.info(
        f"Lorin Pipeline Query Executed: {decision} ({round(latency_ms, 1)}ms)",
        extra={"telemetry": telemetry}
    )
