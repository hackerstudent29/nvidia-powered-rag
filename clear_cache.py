#!/usr/bin/env python3
"""Root forwarder for scripts/clear_cache.py"""
import os
import runpy

if __name__ == "__main__":
    target = os.path.join(os.path.dirname(__file__), "scripts", "clear_cache.py")
    runpy.run_path(target, run_name="__main__")
