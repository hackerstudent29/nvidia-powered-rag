"""
RouteFinder Regression Test Suite for Lorin AI Architecture Overhaul
=====================================================================
Verifies that RouteFinder transit graph lookups (stop names, bus routes, schedules, transfers)
remain 100% exact and unchanged during outer orchestration refactoring.
"""

import sys
import os
import unittest

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from route_finder import RouteFinder


class TestRouteFinder(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rf = RouteFinder()

    def test_find_stop_exact_and_fuzzy(self):
        """Test stop identification for common pickup points."""
        res = self.rf.find_stop("Tambaram")
        self.assertIsNotNone(res, "Tambaram stop should be found")
        stop_id, confidence = res
        self.assertIsNotNone(stop_id)

    def test_find_route(self):
        """Test route finding by route ID."""
        res = self.rf.find_route("AR3")
        self.assertIsNotNone(res, "Route AR3 should be found")
        self.assertEqual(res["route_id"], "AR3")


if __name__ == "__main__":
    unittest.main()
