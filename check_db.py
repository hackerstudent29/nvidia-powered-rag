#!/usr/bin/env python3
"""Root forwarder for scripts/check_db.py"""
import os
import runpy

if __name__ == "__main__":
    target = os.path.join(os.path.dirname(__file__), "scripts", "check_db.py")
    runpy.run_path(target, run_name="__main__")
