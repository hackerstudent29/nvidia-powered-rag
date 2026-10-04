"""
LORIN V6 — DIALOGUE STATE TRACKER & TOPIC STACK MANAGER
======================================================
Applies structured state transitions to ConversationState based on incoming QueryPlans.
Manages TopicFrame stacks (push/pop), ResultSets, entity binding, and active slots.
"""

import time
import json
from typing import Dict, List, Optional, Tuple, Any

from backend.core.conversation_state import (
    ConversationState, TopicFrame, QueryPlan, EntityRef, ResultSet, ResultItem
)

class DialogueStateTracker:
    """Manages clean state transitions over ConversationState."""
    
    def apply_query_plan(self, state: ConversationState, plan: QueryPlan) -> ConversationState:
        """Applies a QueryPlan transition proposal to produce updated ConversationState."""
        state.turn_count += 1
        state.updated_at = time.time()
        state.last_intent = plan.intent
        state.last_query_plan = plan

        # 1. Topic Frame Stack Navigation
        if plan.intent in ["CREATE_TOPIC", "SWITCH_TOPIC"] or plan.topic_transition in ["NEW", "PUSH"]:
            if state.active_topic_frame:
                state.active_topic_frame.is_suspended = True
                state.topic_stack.append(state.active_topic_frame)
            
            # Create new active frame
            new_frame = TopicFrame(
                frame_id=f"frame_{int(time.time()*1000)}",
                semantic_topic=plan.capability_id.replace("_info", "").replace("_finder", ""),
                capability_id=plan.capability_id,
                active_entities=list(plan.target_entities),
                slots=dict(plan.slot_changes),
                constraints=dict(plan.constraint_changes),
                requested_attributes=list(plan.attribute_requests),
                last_intent=plan.intent,
                created_turn=state.turn_count,
                last_active_turn=state.turn_count
            )
            state.active_topic_frame = new_frame

        elif plan.intent == "RESTORE_TOPIC" or plan.topic_transition == "POP":
            if state.topic_stack:
                # Find matching target frame in stack or pop top
                target_frame = None
                if plan.target_entities:
                    target_id = plan.target_entities[0].entity_id.lower() if plan.target_entities[0].entity_id else ""
                    for idx, f in enumerate(reversed(state.topic_stack)):
                        if f.semantic_topic.lower() in target_id or any(e.entity_id and e.entity_id.lower() in target_id for e in f.active_entities):
                            target_frame = f
                            state.topic_stack.remove(f)
                            break
                
                if not target_frame and state.topic_stack:
                    target_frame = state.topic_stack.pop()

                if target_frame:
                    target_frame.is_suspended = False
                    target_frame.last_active_turn = state.turn_count
                    target_frame.requested_attributes = list(plan.attribute_requests) or target_frame.requested_attributes
                    state.active_topic_frame = target_frame

        else:
            # UPDATE_TOPIC / SAME / SELECT_POSITION / ATTRIBUTE_CHANGE
            if not state.active_topic_frame:
                state.active_topic_frame = TopicFrame(
                    frame_id=f"frame_{int(time.time()*1000)}",
                    semantic_topic=plan.capability_id.replace("_info", "").replace("_finder", ""),
                    capability_id=plan.capability_id,
                    created_turn=state.turn_count,
                    last_active_turn=state.turn_count
                )
            
            frame = state.active_topic_frame
            frame.last_active_turn = state.turn_count
            frame.last_intent = plan.intent
            if plan.capability_id:
                frame.capability_id = plan.capability_id

            # Merge entities
            if plan.target_entities:
                for ent in plan.target_entities:
                    if not any(e.entity_id == ent.entity_id for e in frame.active_entities if e.entity_id):
                        frame.active_entities.append(ent)
                frame.selected_entity = plan.target_entities[0]

            # Merge slots & constraints
            frame.slots.update(plan.slot_changes)
            frame.constraints.update(plan.constraint_changes)
            if plan.attribute_requests:
                frame.requested_attributes = list(plan.attribute_requests)

        # 2. Sync Global Active State from Active Topic Frame
        if state.active_topic_frame:
            af = state.active_topic_frame
            state.active_entities = list(af.active_entities)
            if af.selected_entity:
                state.selected_entities = [af.selected_entity]
            state.active_slots = dict(af.slots)
            state.active_constraints = dict(af.constraints)
            state.requested_attributes = list(af.requested_attributes)

        return state

    def buffer_result_set(self, state: ConversationState, items: List[Dict[str, Any]], semantic_type: str, title: str) -> ResultSet:
        """Stores structured result items (1, 2, 3...) into the session's active ResultSet."""
        rs_id = f"rs_{int(time.time()*1000)}"
        ordered_items = []
        
        for idx, it in enumerate(items, 1):
            r_item = ResultItem(
                position=idx,
                entity_type=it.get("entity_type", "item"),
                entity_id=it.get("entity_id") or f"item_{idx}",
                canonical_name=it.get("canonical_name") or it.get("name") or f"Item #{idx}",
                attributes=it.get("attributes", {})
            )
            ordered_items.append(r_item)

        rs = ResultSet(
            result_set_id=rs_id,
            turn_id=state.turn_count,
            semantic_type=semantic_type,
            title=title,
            ordered_items=ordered_items
        )
        
        # Keep maximum 5 recent result sets to prevent unbounded memory growth
        state.active_result_sets.append(rs)
        if len(state.active_result_sets) > 5:
            state.active_result_sets = state.active_result_sets[-5:]

        if state.active_topic_frame:
            state.active_topic_frame.result_set_ids.append(rs_id)

        return rs


# Global singleton dialogue state tracker
global_dialogue_state_tracker = DialogueStateTracker()
