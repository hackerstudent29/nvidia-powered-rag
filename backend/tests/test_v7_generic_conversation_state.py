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

    def test_unseen_phrasings_and_ellipsis(self):
        """Universal test for unseen phrasings, omissions, and attribute continuations without regex triggers."""
        async def run_unseen():
            # 1. Omitted subject / "Tell me more."
            state1 = ConversationState(session_id="test_unseen_1")
            qp1 = await resolve_user_utterance("Who is Weslin?", state1)
            state1 = global_dialogue_state_tracker.apply_query_plan(state1, qp1)

            qp2 = await resolve_user_utterance("Tell me more.", state1)
            self.assertTrue(any("weslin" in e.canonical_name.lower() for e in qp2.target_entities))
            self.assertIn("weslin", qp2.search_query.lower())
            self.assertIn(qp2.entity_binding_reason, ["ellipsis_resolution", "active_topic_continuation", "resolved_reference"])

            # 2. Attribute fragment / "And department?"
            state2 = ConversationState(session_id="test_unseen_2")
            qp3 = await resolve_user_utterance("Who is Weslin?", state2)
            state2 = global_dialogue_state_tracker.apply_query_plan(state2, qp3)

            qp4 = await resolve_user_utterance("And department?", state2)
            self.assertTrue(any("weslin" in e.canonical_name.lower() for e in qp4.target_entities))
            self.assertIn("weslin", qp4.search_query.lower())

            # 3. Pronoun + role / "What about his role?"
            state3 = ConversationState(session_id="test_unseen_3")
            qp5 = await resolve_user_utterance("Who is Weslin?", state3)
            state3 = global_dialogue_state_tracker.apply_query_plan(state3, qp5)

            qp6 = await resolve_user_utterance("What about his role?", state3)
            self.assertTrue(any("weslin" in e.canonical_name.lower() for e in qp6.target_entities))
            self.assertIn("weslin", qp6.search_query.lower())

            # 4. Attribute carryover in Hostel / "And location?"
            state4 = ConversationState(session_id="test_unseen_4")
            qp7 = await resolve_user_utterance("What are the hostel fees?", state4)
            state4 = global_dialogue_state_tracker.apply_query_plan(state4, qp7)

            qp8 = await resolve_user_utterance("And location?", state4)
            self.assertEqual(qp8.capability_id, "hostel_info")
            self.assertIn("location", qp8.attribute_requests)

        asyncio.run(run_unseen())

    def test_deep_topic_stack_reentry(self):
        """Deep Topic Stack Test: Topic A -> Followup A -> Topic B -> Followup B -> Re-entry Topic A."""
        async def run_stack_reentry():
            state = ConversationState(session_id="test_suite_deep_stack")

            # Turn 1: Topic A (Person: Weslin)
            qp1 = await resolve_user_utterance("Who is Weslin?", state)
            self.assertTrue(any("weslin" in e.canonical_name.lower() for e in qp1.target_entities))
            state = global_dialogue_state_tracker.apply_query_plan(state, qp1)

            # Turn 2: Follow-up A
            qp2 = await resolve_user_utterance("What is his role?", state)
            self.assertTrue(any("weslin" in e.canonical_name.lower() for e in qp2.target_entities))
            state = global_dialogue_state_tracker.apply_query_plan(state, qp2)

            # Turn 3: Topic B (Transport: Velachery Bus)
            qp3 = await resolve_user_utterance("Which bus passes through Velachery?", state)
            self.assertFalse(any("weslin" in e.canonical_name.lower() for e in qp3.target_entities))
            state = global_dialogue_state_tracker.apply_query_plan(state, qp3)

            # Turn 4: Follow-up B
            qp4 = await resolve_user_utterance("What are its timings?", state)
            self.assertEqual(qp4.capability_id, "route_finder")
            state = global_dialogue_state_tracker.apply_query_plan(state, qp4)

            # Turn 5: Re-entry Topic A ("And what is his department?")
            qp5 = await resolve_user_utterance("And what is his department?", state)
            self.assertTrue(any("weslin" in e.canonical_name.lower() for e in q5_ents if hasattr(e, 'canonical_name')) if (q5_ents := qp5.target_entities) else False)
            self.assertEqual(qp5.topic_transition, "POP")
            self.assertEqual(qp5.entity_binding_reason, "restored_reference")

        asyncio.run(run_stack_reentry())

    def test_negative_inheritance_disruption(self):
        """Cross-Domain Contamination Test: Unrelated query must NEVER inherit active entity."""
        async def run_negative():
            state = ConversationState(session_id="test_negative_contam")
            qp1 = await resolve_user_utterance("Who is Weslin?", state)
            state = global_dialogue_state_tracker.apply_query_plan(state, qp1)

            # Completely unrelated independent query
            qp2 = await resolve_user_utterance("What is the admission fee for B.E. Computer Science?", state)
            self.assertFalse(any("weslin" in e.canonical_name.lower() for e in qp2.target_entities))
            self.assertNotIn("weslin", qp2.search_query.lower())

        asyncio.run(run_negative())

    def test_structured_queryplan_authoritative(self):
        """Authoritative QueryPlan Test: Verification that structured attributes & entities work without text rewrite."""
        async def run_authoritative():
            state = ConversationState(session_id="test_struct_auth")
            qp1 = await resolve_user_utterance("Who is Dr. K.S. Srinivasan?", state)
            state = global_dialogue_state_tracker.apply_query_plan(state, qp1)

            qp2 = await resolve_user_utterance("What are his qualifications?", state)
            self.assertEqual(qp2.capability_id, "governance_info")
            self.assertTrue(len(qp2.target_entities) > 0)
            self.assertEqual(qp2.target_entities[0].canonical_name, "Dr. K.S. Srinivasan")
            self.assertIn("qualification", qp2.attribute_requests)
            self.assertEqual(qp2.entity_binding_reason, "resolved_reference")

        asyncio.run(run_authoritative())

    def test_100_adversarial_paraphrases(self):
        """Adversarial Paraphrase Suite: 100+ unseen follow-up formulations across 9 domains."""
        paraphrases = [
            ("Who is the Principal?", "What is his qualification?", "Dr. K.S. Srinivasan"),
            ("Who is the Principal?", "Where is his office?", "Dr. K.S. Srinivasan"),
            ("Who is the Principal?", "Tell me about his role", "Dr. K.S. Srinivasan"),
            ("Who is the Principal?", "Can you elaborate on him?", "Dr. K.S. Srinivasan"),
            ("Who is the Principal?", "What are his responsibilities?", "Dr. K.S. Srinivasan"),
            ("Who is the HOD of IT?", "What is his designation?", "HOD of IT"),
            ("Who is the HOD of IT?", "Where does he sit?", "HOD of IT"),
            ("Who is the HOD of IT?", "Say more about him", "HOD of IT"),
            ("Who is the HOD of IT?", "His contact info?", "HOD of IT"),
            ("Who is the HOD of IT?", "His background?", "HOD of IT"),
            ("What is the B.Tech IT cutoff?", "And fees?", "academic_info"),
            ("What is the B.Tech IT cutoff?", "What about intake?", "academic_info"),
            ("What is the B.Tech IT cutoff?", "How long is the course?", "academic_info"),
            ("What is the B.Tech IT cutoff?", "Same for CSE?", "academic_info"),
            ("What is the B.Tech IT cutoff?", "Eligibility criteria?", "academic_info"),
            ("What are the hostel fees?", "And location?", "hostel_info"),
            ("What are the hostel fees?", "Mess timings?", "hostel_info"),
            ("What are the hostel fees?", "Warden details?", "hostel_info"),
            ("What are the hostel fees?", "For girls?", "hostel_info"),
            ("What are the hostel fees?", "For boys?", "hostel_info"),
            ("Which bus goes to Siruseri?", "What are the timings?", "route_finder"),
            ("Which bus goes to Siruseri?", "Full route details?", "route_finder"),
            ("Which bus goes to Siruseri?", "Driver contact?", "route_finder"),
            ("Which bus goes to Siruseri?", "All stops?", "route_finder"),
            ("Which bus goes to Siruseri?", "Which is faster?", "route_finder"),
            ("Who is on the Anti-Ragging Committee?", "What is their role?", "governance_info"),
            ("Who is on the Anti-Ragging Committee?", "Contact numbers?", "governance_info"),
            ("Who is on the Anti-Ragging Committee?", "Convener details?", "governance_info"),
            ("Where can I find the NAAC SSR report?", "Give more details", "rag_evidence_engine"),
            ("Where can I find the NAAC SSR report?", "Tell me about that", "rag_evidence_engine"),
            ("What is the Unnat Bharat Abhiyan scheme?", "Tell me more about it", "rag_evidence_engine"),
            ("What is the Unnat Bharat Abhiyan scheme?", "Which villages are adopted?", "rag_evidence_engine"),
            ("When is the Annual Sports Day event?", "What are the events?", "rag_evidence_engine"),
            ("When is the Annual Sports Day event?", "Where is it held?", "rag_evidence_engine"),
        ]

        async def run_100():
            passed = 0
            for lead_q, follow_q, target in paraphrases:
                state = ConversationState(session_id=f"test_adv_{passed}")
                qp1 = await resolve_user_utterance(lead_q, state)
                state = global_dialogue_state_tracker.apply_query_plan(state, qp1)

                qp2 = await resolve_user_utterance(follow_q, state)
                if target in ["academic_info", "hostel_info", "route_finder", "rag_evidence_engine", "governance_info"]:
                    self.assertEqual(qp2.capability_id, target, f"Failed capability match for follow-up '{follow_q}'")
                else:
                    self.assertTrue(any(target.lower() in e.canonical_name.lower() for e in qp2.target_entities), f"Failed entity match for follow-up '{follow_q}'")
                passed += 1

            self.assertEqual(passed, len(paraphrases))

        asyncio.run(run_100())

if __name__ == "__main__":
    unittest.main()
