"""
Lorin AI — Production Feature Flags & Instant Rollback Module (RC1)
===================================================================
1. Dynamic Runtime Feature Toggles (no redeployment required).
2. Instant rollback capability for V5.1 enhancements if upstream latency spikes.
3. Thread-safe configuration state with environment variable overrides.
"""

import os
import threading
from typing import Dict, Any

class FeatureFlags:
    """Thread-safe runtime feature toggle store for safe staged rollout and instant rollback."""
    def __init__(self):
        self._lock = threading.Lock()
        self._flags = {
            "ADAPTIVE_DEPTH": os.getenv("FLAG_ADAPTIVE_DEPTH", "true").lower() == "true",
            "ADJACENT_STITCHING": os.getenv("FLAG_ADJACENT_STITCHING", "true").lower() == "true",
            "RATE_LIMITER": os.getenv("FLAG_RATE_LIMITER", "true").lower() == "true",
            "CIRCUIT_BREAKER": os.getenv("FLAG_CIRCUIT_BREAKER", "true").lower() == "true",
            "MULTI_HOP_VALIDATION": os.getenv("FLAG_MULTI_HOP_VALIDATION", "true").lower() == "true",
            "STRUCTURED_LOGGING": os.getenv("FLAG_STRUCTURED_LOGGING", "true").lower() == "true",
            "STRICT_ABSTENTION": True  # Immutable safety invariant
        }

    def is_enabled(self, flag_name: str) -> bool:
        with self._lock:
            return self._flags.get(flag_name.upper(), False)

    def set_flag(self, flag_name: str, enabled: bool) -> bool:
        flag_upper = flag_name.upper()
        if flag_upper == "STRICT_ABSTENTION" and not enabled:
            # Prevent disabling strict abstention guardrail
            return False
        with self._lock:
            if flag_upper in self._flags:
                self._flags[flag_upper] = bool(enabled)
                return True
            return False

    def get_all(self) -> Dict[str, bool]:
        with self._lock:
            return dict(self._flags)

    def reset_to_defaults(self):
        with self._lock:
            self._flags = {
                "ADAPTIVE_DEPTH": True,
                "ADJACENT_STITCHING": True,
                "RATE_LIMITER": True,
                "CIRCUIT_BREAKER": True,
                "MULTI_HOP_VALIDATION": True,
                "STRUCTURED_LOGGING": True,
                "STRICT_ABSTENTION": True
            }

global_flags = FeatureFlags()
