"""
LORIN V7.2 — Generic State Transition, Entity Resolution & Isolation Regression Suite
====================================================================================
Tests the generic architectural contracts:
1. Previous entity != Current entity by default.
2. Independent utterances across domains (Person, Transport, Hostel, Academic, etc.)
   do NOT inherit previous entities or stale hard filters.
3. Pronoun and referential follow-ups DO correctly preserve and bind active entities.
4. Unseen/unknown entities enter candidate discovery path without being gated by registry.
5. Cache keys only contain current-turn justified context.
"""

import unittest
import asyncio
import os
import sys

# Ensure project root is in sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
for p in [project_root, backend_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

from core.conversation_state import ConversationState, EntityRef, QueryPlan
from core.semantic_resolver import resolve_user_utterance, build_canonical_cache_key
from core.dialogue_state_tracker import global_dialogue_state_tracker
from core.entity_knowledge import global_entity_registry, EntityResolutionStatus

class TestV7GenericConversationState(unittest.TestCase):
    
    def test_multi_turn_entity_isolation_and_followup(self):
        async def run_test():
            state = ConversationState(session_id="test_suite_turn_isolation")
            
            # Step 1: Query entity A (Weslin)
            qp1 = await resolve_user_utterance("Who is Weslin?", state)
            self.assertIn(qp1.topic_transition, ["NEW", "SWITCH"])
            self.assertTrue(any(e.canonical_name == "Mr. D. Weslin" for e in qp1.target_entities))
            self.assertEqual(qp1.entity_binding_reason, "explicit_current_query")
            state = global_dialogue_state_tracker.apply_query_plan(state, qp1)
            self.assertIsNotNone(state.active_topic_frame)
            self.assertEqual(state.active_topic_frame.selected_entity.canonical_name, "Mr. D. Weslin")
            
            # Step 2: Unrelated query B (Transport / Bus) -> Must NOT inherit Weslin
            qp2 = await resolve_user_utterance("Which bus passes through Velachery?", state)
            self.assertIn(qp2.topic_transition, ["NEW", "PUSH", "SWITCH"])
            # Target entities must be empty or bus-related, NEVER Weslin
            self.assertFalse(any(e.canonical_name == "Mr. D. Weslin" for e in qp2.target_entities))
            self.assertEqual(qp2.search_query.strip(), "Which bus passes through Velachery?")
            self.assertNotIn("weslin", qp2.canonical_cache_key)
            state = global_dialogue_state_tracker.apply_query_plan(state, qp2)
            self.assertEqual(len(state.active_topic_frame.active_entities), 0)
            self.assertIsNone(state.active_topic_frame.selected_entity)
            
            # Step 3: Entity C (Usha) -> Must NOT inherit Weslin or Bus
            qp3 = await resolve_user_utterance("Who is Usha?", state)
            self.assertIn(qp3.topic_transition, ["NEW", "PUSH", "SWITCH"])
            self.assertFalse(any("weslin" in e.canonical_name.lower() for e in qp3.target_entities))
            self.assertTrue(any("usha" in e.canonical_name.lower() for e in qp3.target_entities))
            self.assertEqual(qp3.search_query.strip(), "Who is Usha?")
            state = global_dialogue_state_tracker.apply_query_plan(state, qp3)
            self.assertTrue(any("usha" in e.canonical_name.lower() for e in state.active_topic_frame.active_entities))
            
            # Step 4: Follow-up directly referring to C ("What is her email?")
            qp4 = await resolve_user_utterance("What is her email?", state)
            self.assertIn(qp4.topic_transition, ["CONTINUE", "MODIFY", "DRILL_DOWN", "SAME"])
            self.assertTrue(any("usha" in e.canonical_name.lower() for e in qp4.target_entities))
            self.assertIn("usha", qp4.search_query.lower())
            self.assertIn(qp4.entity_binding_reason, ["coreference_pronoun", "resolved_reference", "active_topic_continuation"])
            
        asyncio.run(run_test())

    def test_cross_domain_topic_switches(self):
        """Cross-domain tests: Person -> Transport -> Academic -> Hostel -> Document -> Scheme -> Department."""
        domains = [
            ("Who is the Principal?", "governance_info", "Dr. K.S. Srinivasan"),
            ("What are the college bus fees?", "route_finder", None),
            ("What is the cutoff for Artificial Intelligence and Data Science?", "academic_info", None),
            ("Is mess food included in hostel fees?", "hostel_info", None),
            ("Where can I find the NAAC SSR report?", "rag_evidence_engine", None),
            ("Tell me about the PMKVY scheme", "rag_evidence_engine", None),
            ("Who is the HOD of Information Technology?", "academic_info", None)
        ]
        
        async def run_domains():
            state = ConversationState(session_id="test_suite_cross_domain")
            last_entities = []
            
            for query, expected_cap, expected_entity in domains:
                qp = await resolve_user_utterance(query, state)
                # Ensure no entity from previous turn was blindly carried over
                if last_entities:
                    for prev_ent in last_entities:
                        self.assertFalse(
                            any(e.entity_id == prev_ent.entity_id for e in qp.target_entities),
                            f"Stale entity {prev_ent.canonical_name} contaminated query '{query}'"
                        )
                state = global_dialogue_state_tracker.apply_query_plan(state, qp)
                last_entities = list(state.active_topic_frame.active_entities)
                if expected_entity:
                    self.assertTrue(any(expected_entity in e.canonical_name for e in qp.target_entities))

        asyncio.run(run_domains())

    def test_unregistered_entity_discovery_status(self):
        """Unseen entity must be tagged ENTITY_UNKNOWN and not block retrieval."""
        async def run_discovery():
            state = ConversationState(session_id="test_suite_discovery")
            qp = await resolve_user_utterance("Who is Professor Chandramouli?", state)
            self.assertTrue(len(qp.target_entities) > 0)
            unknown_ent = qp.target_entities[0]
            self.assertEqual(getattr(unknown_ent, "resolution_status", None), "ENTITY_UNKNOWN")
            self.assertIn("Professor Chandramouli", qp.search_query)
            
        asyncio.run(run_discovery())

if __name__ == "__main__":
    unittest.main()
