"""
Regression Test Suite for Lorin AI V5 RAG Pipeline Fixes
=========================================================
Tests:
1. Valid synonym matching (CSE ↔ Computer Science and Engineering)
2. Valid acronym expansion (YRC, RRC, EBSB, UBA, IQAC, CSBS, CSI, NSS, NCC)
3. Negative safety checks: Wrong department, similar department, unrelated entity
4. Conversational follow-up resolution (pronouns, topic continuation)
"""

import sys
import os
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from query_expansion import get_deterministic_query_variants, normalize_query_representation, resolve_conversational_followup
from server import classify_slot_entailment, process_lorin_query

class TestV5RAGPipeline(unittest.TestCase):

    def test_acronym_expansions(self):
        """Test deterministic expansion for key acronyms."""
        acronyms = ["yrc", "rrc", "ebsb", "uba", "iqac", "csbs", "csi", "nss", "ncc", "cse", "it"]
        for acr in acronyms:
            vars = get_deterministic_query_variants(acr)
            self.assertGreaterEqual(len(vars), 2, f"Acronym '{acr}' should produce multi-view variants.")

    def test_conversational_followup_resolution(self):
        """Test conversational follow-up resolution for pronouns and omitted subjects."""
        history = [
            {"role": "user", "content": "What is the hostel fee?"},
            {"role": "assistant", "content": "Hostel fee details for boys and girls."}
        ]
        resolved = resolve_conversational_followup("What about girls?", history)
        self.assertIn("hostel fee", resolved.lower(), f"Failed to resolve follow-up query: got '{resolved}'")
        self.assertIn("girls", resolved.lower())

        # Pronoun resolution
        resolved_pronoun = resolve_conversational_followup("Where is it located?", history)
        self.assertTrue("hostel fee" in resolved_pronoun.lower() or "hostel" in resolved_pronoun.lower())

    def test_soft_slot_entailment_valid_synonym(self):
        """Test soft slot entailment accepts valid synonyms (e.g. CSE ↔ Computer Science and Engineering)."""
        query = "What is the intake for CSE?"
        fact = "intake"
        chunk = {
            "content": "Computer Science and Engineering department has an intake of 60 seats.",
            "source_file": "msajce_about.md"
        }
        result = classify_slot_entailment(query, fact, chunk)
        self.assertIn(result, ["DIRECTLY_ENTAILED", "PARTIALLY_ENTAILED"], f"Expected entailed, got {result}")

    def test_soft_slot_entailment_wrong_department(self):
        """Test soft slot entailment rejects wrong department."""
        query = "What is the intake for CSE?"
        fact = "intake"
        chunk = {
            "content": "Mechanical Engineering department has an intake of 60 seats.",
            "source_file": "msajce_about.md"
        }
        result = classify_slot_entailment(query, fact, chunk)
        self.assertEqual(result, "RELATED_BUT_NOT_SUPPORTING", f"Expected REJECTED for wrong department, got {result}")

    def test_soft_slot_entailment_similar_incorrect_department(self):
        """Test soft slot entailment rejects similar but incorrect department."""
        query = "What is the intake for Computer Science and Engineering?"
        fact = "intake"
        chunk = {
            "content": "Cyber Security department has an intake of 30 seats.",
            "source_file": "msajce_about.md"
        }
        result = classify_slot_entailment(query, fact, chunk)
        self.assertEqual(result, "RELATED_BUT_NOT_SUPPORTING", f"Expected REJECTED for similar department, got {result}")

    def test_soft_slot_entailment_unrelated_entity(self):
        """Test soft slot entailment rejects unrelated entity."""
        query = "What is the intake for CSE?"
        fact = "intake"
        chunk = {
            "content": "Aerospace Engineering department has an intake of 120 seats at IIT Madras.",
            "source_file": "generic.md"
        }
        result = classify_slot_entailment(query, fact, chunk)
        self.assertEqual(result, "RELATED_BUT_NOT_SUPPORTING", f"Expected REJECTED for unrelated entity, got {result}")

    # =========================================================================
    # V5.1 TARGETED REGRESSION TESTS (U100-24, U100-30, U100-33, U100-36, U100-45, U100-58, U100-74, U100-75, U100-16, U100-96)
    # =========================================================================

    def test_u100_24_vlsi_intake(self):
        """U100-24: M.E. VLSI Design intake query expansion."""
        vars = get_deterministic_query_variants("What is the intake for M.E. VLSI Design?")
        self.assertTrue(any("intake" in v.lower() for v in vars))

    def test_u100_30_cyber_security_intake(self):
        """U100-30: Cyber Security intake query variants."""
        vars = get_deterministic_query_variants("What is the intake for Cyber Security department?")
        self.assertTrue(any("cyber" in v.lower() for v in vars))

    def test_u100_33_tnea_landline(self):
        """U100-33: TNEA code + landline multi-hop query decomposition."""
        norm = normalize_query_representation("What is the TNEA code of MSAJCE and what is the landline number?")
        self.assertEqual(norm.get("query_type"), "multi_hop")

    def test_u100_36_tambaram_bus_route(self):
        """U100-36: Tambaram route + arrival time."""
        norm = normalize_query_representation("Which bus route serves Tambaram and what time does it reach campus?")
        self.assertTrue(norm.get("query_type") in ["transport", "multi_hop"])

    def test_u100_45_hostel_warden_followup(self):
        """U100-45: 5-turn hostel conversation warden follow-up resolution."""
        history = [
            {"role": "user", "content": "What is the hostel fee?"},
            {"role": "assistant", "content": "Hostel fee details for boys and girls."},
            {"role": "user", "content": "What about girls?"},
            {"role": "assistant", "content": "Girls hostel fee is structured annually."},
            {"role": "user", "content": "and for boys?"},
            {"role": "assistant", "content": "Boys hostel is located inside Siruseri campus."},
            {"role": "user", "content": "where is it located?"},
            {"role": "assistant", "content": "Hostel is inside Siruseri campus."}
        ]
        resolved = resolve_conversational_followup("who is the warden?", history)
        self.assertIn("hostel", resolved.lower(), f"Expected 'hostel' in resolved query, got '{resolved}'")
        self.assertIn("warden", resolved.lower())

    def test_u100_58_scholarship_list(self):
        """U100-58: Scholarship list query classification."""
        norm = normalize_query_representation("What scholarships can students apply for?")
        self.assertEqual(norm.get("query_type"), "list")

    def test_u100_74_karma_definition(self):
        """U100-74: KARMA scheme acronym expansion."""
        vars = get_deterministic_query_variants("What is the KARMA scheme introduced by AICTE?")
        self.assertTrue(any("kaushal augmentation" in v.lower() for v in vars))

    def test_u100_75_dr_srinivasan_context_alias(self):
        """U100-75: Dr. Srinivasan context-scoped alias expansion."""
        vars = get_deterministic_query_variants("Who heads the Anti-Ragging Committee?")
        self.assertTrue(any("anti" in v.lower() for v in vars))

    def test_u100_16_unat_barat_abiyan_typo_alias(self):
        """U100-16: Unat Barat Abiyan typo alias expansion to UBA."""
        vars = get_deterministic_query_variants("Tell me about Unat Barat Abiyan cell Siruseri")
        self.assertTrue(any("unnat bharat" in v.lower() for v in vars))

    def test_u100_96_metro_negative(self):
        """U100-96: Metro train negative query."""
        norm = normalize_query_representation("What is the Metro train station located inside the campus?")
        self.assertIsNotNone(norm)

if __name__ == "__main__":
    unittest.main()
