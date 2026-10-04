"""
LORIN V6 — SEMANTIC RESOLVER & DIALOGUE INTERPRETER
====================================================
Interprets user utterances in the context of durable ConversationState and produces
a strict, structured QueryPlan.
Combines deterministic fast-paths (positional references, topic restoration, exact entity matching)
with LLM-based structured JSON interpretation for complex coreference and multi-turn shifts.
"""

import os
import re
import json
import time
import hashlib
import asyncio
import httpx
from typing import Dict, List, Optional, Tuple, Any

try:
    from dotenv import load_dotenv
    load_dotenv()
    # Check backend/.env as well if cwd is root
    if os.path.exists("backend/.env"):
        load_dotenv("backend/.env")
except Exception:
    pass

from backend.core.conversation_state import (
    ConversationState, TopicFrame, QueryPlan, EntityRef, ResultSet, ResultItem
)
from backend.core.capability_registry import global_capability_registry, CapabilitySchema

VERCEL_AI_GATEWAY_KEY = os.getenv("AI_GATEWAY_API_KEY") or os.getenv("VERCEL_AI_GATEWAY_KEY") or os.getenv("AI_GATEWAY_API_KEY_BACKUP")
VERCEL_AI_GATEWAY_URL = os.getenv("VERCEL_AI_GATEWAY_URL", "https://ai-gateway.vercel.sh/v1")
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
NVIDIA_BASE_URL = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")

# Positional index extraction regex (1st, first, 2nd, second, last...)
POSITION_PATTERNS = [
    (re.compile(r'\b(?:the\s+)?(?:first|1st)\s*(?:one|item|route|bus|course|department|option)?\b', re.I), 1),
    (re.compile(r'\b(?:the\s+)?(?:second|2nd)\s*(?:one|item|route|bus|course|department|option)?\b', re.I), 2),
    (re.compile(r'\b(?:the\s+)?(?:third|3rd)\s*(?:one|item|route|bus|course|department|option)?\b', re.I), 3),
    (re.compile(r'\b(?:the\s+)?(?:fourth|4th)\s*(?:one|item|route|bus|course|department|option)?\b', re.I), 4),
    (re.compile(r'\b(?:the\s+)?(?:fifth|5th)\s*(?:one|item|route|bus|course|department|option)?\b', re.I), 5),
    (re.compile(r'\b(?:the\s+)?last\s*(?:one|item|route|bus|course|department|option)?\b', re.I), -1)
]

TOPIC_RESTORE_PATTERNS = [
    re.compile(r'\b(?:go|switch|turn|heading|back)\s+back\s+to\s+([a-z0-9_\s]{3,30})\b', re.I),
    re.compile(r'\b(?:as\s+asked|mentioned)\s+(?:earlier|previously)\s+about\s+([a-z0-9_\s]{3,30})\b', re.I),
    re.compile(r'\b(?:let\'?s\s+talk\s+about|regarding)\s+([a-z0-9_\s]{3,30})\s+again\b', re.I)
]

def resolve_positional_reference(query: str, state: ConversationState) -> Optional[Tuple[ResultItem, int]]:
    """Generic ResultSet positional reference finder (1st, 2nd, 3rd, last)."""
    if not state.active_result_sets:
        return None
    latest_rs = state.active_result_sets[-1]
    if not latest_rs.ordered_items:
        return None

    for pat, pos_idx in POSITION_PATTERNS:
        if pat.search(query):
            if pos_idx == -1:
                target_item = latest_rs.ordered_items[-1]
                actual_pos = len(latest_rs.ordered_items)
            elif 1 <= pos_idx <= len(latest_rs.ordered_items):
                target_item = latest_rs.ordered_items[pos_idx - 1]
                actual_pos = pos_idx
            else:
                continue
            return target_item, actual_pos
    return None

def resolve_topic_restoration(query: str, state: ConversationState) -> Optional[TopicFrame]:
    """Generic Topic Stack restoration (push/pop matching)."""
    for pat in TOPIC_RESTORE_PATTERNS:
        m = pat.search(query)
        if m:
            target_topic_raw = m.group(1).strip().lower()
            # Search suspended frames in stack
            for frame in reversed(state.topic_stack):
                if frame.semantic_topic.lower() in target_topic_raw or target_topic_raw in frame.semantic_topic.lower():
                    return frame
    return None

def build_canonical_cache_key(query_plan: QueryPlan) -> str:
    """Builds a deterministic, context-aware cache key based on canonical QueryPlan structure."""
    raw_key_payload = {
        "capability_id": query_plan.capability_id,
        "operation": query_plan.operation,
        "entities": sorted([e.entity_id for e in query_plan.target_entities]),
        "slots": sorted(list(query_plan.slot_changes.items())),
        "attributes": sorted(query_plan.attribute_requests),
        "search_query": query_plan.search_query.strip().lower()
    }
    dumped = json.dumps(raw_key_payload, sort_keys=True)
    return f"cplan_{hashlib.sha256(dumped.encode('utf-8')).hexdigest()[:24]}"

async def resolve_dialogue_intent_llm(
    current_query: str,
    state: ConversationState,
    http_client: Optional[httpx.AsyncClient] = None
) -> Optional[Dict[str, Any]]:
    """Calls fast LLM engine to interpret utterance into structured JSON transition proposal."""
    
    # Format active state summaries for prompt
    active_frame_summary = "None"
    if state.active_topic_frame:
        af = state.active_topic_frame
        active_frame_summary = f"Topic: '{af.semantic_topic}', Capability: '{af.capability_id}', Active Entities: {[e.canonical_name for e in af.active_entities]}, Slots: {af.slots}"

    stack_summary = []
    for f in state.topic_stack:
        stack_summary.append(f"Topic: '{f.semantic_topic}' (Capability: {f.capability_id})")

    result_set_summary = "None"
    if state.active_result_sets:
        latest_rs = state.active_result_sets[-1]
        items_str = ", ".join([f"Pos {it.position}: {it.canonical_name} (ID: {it.entity_id})" for it in latest_rs.ordered_items[:5]])
        result_set_summary = f"ResultSet ID: '{latest_rs.result_set_id}', Type: '{latest_rs.semantic_type}', Items: [{items_str}]"

    capabilities_info = []
    for cap in global_capability_registry.list_capabilities():
        capabilities_info.append(f"- ID: {cap.capability_id}, Entities: {cap.entity_types}, Attributes: {cap.attributes[:6]}")

    caps_str = "\n".join(capabilities_info)

    system_prompt = f"""You are the Lorin V6 Stateful Dialogue State Tracker.
Analyze the user utterance in the context of the structured conversation state and output a STRICT JSON object representing the Dialogue Transition Proposal.

REGISTERED CAPABILITIES:
{caps_str}

ACTIVE CONVERSATION STATE:
- Turn Count: {state.turn_count}
- Active Topic Frame: {active_frame_summary}
- Suspended Topic Stack: {stack_summary}
- Last Result Set: {result_set_summary}
- Active Slots: {state.active_slots}

OUTPUT JSON SCHEMA RULES:
Output ONLY valid JSON matching this exact structure:
{{
  "intent": "<CREATE_TOPIC | UPDATE_TOPIC | SWITCH_TOPIC | RESTORE_TOPIC | SELECT_POSITION | FILTER | COMPARE | ATTRIBUTE_CHANGE | REJECT>",
  "operation": "<find_route | find_stop | buses_from | fleet_overview | details | fee_lookup | intake_lookup | qualification_lookup | hostel_details | rag_search>",
  "capability_id": "<route_finder | academic_info | hostel_info | governance_info | rag_evidence_engine>",
  "target_entities": [
    {{
      "entity_type": "<route | stop | course | department | person | hostel | facility | general>",
      "entity_id": "<canonical ID like AR3, CSE, dr_ks_srinivasan, girls_hostel, or null>",
      "canonical_name": "<full clean name or null>"
    }}
  ],
  "slot_changes": {{ "key": "value" }},
  "attribute_requests": ["<fee | intake | duration | timings | qualification | office_location | full_route | warden>"],
  "topic_transition": "<NEW | SAME | PUSH | POP>",
  "search_query": "<standalone explicit search string with all implicit context resolved>",
  "confidence": 0.95
}}

DO NOT return markdown preambles or explanations. Return ONLY the JSON string.
"""

    user_msg = f"User Utterance: \"{current_query}\""

    # Model Cascade for fast sub-250ms JSON generation
    keys_to_test = [
        ("google/gemini-2.5-flash-lite", VERCEL_AI_GATEWAY_URL, VERCEL_AI_GATEWAY_KEY),
        ("nvidia/nemotron-3-super-120b-a12b", NVIDIA_BASE_URL, NVIDIA_API_KEY)
    ]

    client = http_client or httpx.AsyncClient(timeout=3.0)
    try:
        for m_name, base_url, k in keys_to_test:
            if not k:
                continue
            headers = {"Authorization": f"Bearer {k}", "Content-Type": "application/json"}
            payload = {
                "model": m_name,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_msg}
                ],
                "temperature": 0.05,
                "max_tokens": 250
            }
            try:
                resp = await client.post(f"{base_url.rstrip('/')}/chat/completions", headers=headers, json=payload)
                if resp.status_code == 200:
                    raw_content = resp.json()["choices"][0]["message"]["content"].strip()
                    raw_content = re.sub(r'<think>.*?</think>', '', raw_content, flags=re.DOTALL | re.IGNORECASE).strip()
                    raw_content = re.sub(r'```(?:json)?', '', raw_content).strip()
                    parsed = json.loads(raw_content)
                    return parsed
            except Exception as ex:
                continue
    finally:
        if not http_client:
            await client.aclose()

    return None

async def resolve_user_utterance(
    user_query: str,
    state: ConversationState,
    http_client: Optional[httpx.AsyncClient] = None
) -> QueryPlan:
    """
    Main entry point: Converts user utterance + ConversationState into a fully validated QueryPlan.
    """
    q_clean = user_query.strip()
    
    # 1. Check Positional Reference Fast-Path (e.g. "first one", "2nd bus", "last route")
    pos_match = resolve_positional_reference(q_clean, state)
    if pos_match:
        item, pos = pos_match
        target_entity = EntityRef(
            entity_type=item.entity_type,
            entity_id=item.entity_id,
            canonical_name=item.canonical_name,
            attributes=item.attributes
        )
        cap_schema = global_capability_registry.find_capability_for_entity(item.entity_type)
        cap_id = cap_schema.capability_id if cap_schema else "rag_evidence_engine"
        
        qp = QueryPlan(
            plan_id=f"qp_{int(time.time()*1000)}",
            intent="SELECT_POSITION",
            operation="details" if cap_id != "route_finder" else "find_route",
            capability_id=cap_id,
            target_entities=[target_entity],
            slot_changes={"selected_position": pos, "entity_id": item.entity_id},
            attribute_requests=["full_route" if cap_id == "route_finder" else "details"],
            topic_transition="SAME",
            search_query=f"{item.canonical_name} details",
            confidence=1.0
        )
        qp.canonical_cache_key = build_canonical_cache_key(qp)
        return qp

    # 2. Check Topic Restoration Fast-Path (e.g. "go back to hostel")
    restored_frame = resolve_topic_restoration(q_clean, state)
    if restored_frame:
        qp = QueryPlan(
            plan_id=f"qp_{int(time.time()*1000)}",
            intent="RESTORE_TOPIC",
            operation="details",
            capability_id=restored_frame.capability_id,
            target_entities=restored_frame.active_entities,
            slot_changes=restored_frame.slots,
            constraint_changes=restored_frame.constraints,
            attribute_requests=restored_frame.requested_attributes,
            topic_transition="POP",
            search_query=f"{restored_frame.semantic_topic} details",
            confidence=1.0
        )
        qp.canonical_cache_key = build_canonical_cache_key(qp)
        return qp

    # 2.5 Fast Deterministic Contextual Coreference / Continuation Pass
    if state.active_topic_frame and (len(q_clean.split()) <= 6 or re.search(r'\b(it|he|she|they|this|that|his|her|girls|boys|where|location|timings|fee|fees|qualification|warden|office)\b', q_clean, re.I)):
        af = state.active_topic_frame
        cap_id = af.capability_id
        entities = list(af.active_entities)
        topic_name = af.semantic_topic.replace("_info", "").replace("_finder", "")
        
        # Check slot shift (e.g. girls vs boys)
        slots = dict(af.slots)
        if re.search(r'\bgirls?\b', q_clean, re.I):
            slots["gender"] = "girls"
        elif re.search(r'\bboys?\b', q_clean, re.I):
            slots["gender"] = "boys"

        # Check requested attributes
        attr_requests = list(af.requested_attributes)
        if re.search(r'\b(?:where|location|located|address)\b', q_clean, re.I):
            attr_requests = ["location"]
        elif re.search(r'\b(?:timings?|schedule|time)\b', q_clean, re.I):
            attr_requests = ["timings"]
        elif re.search(r'\b(?:fees?|cost|price)\b', q_clean, re.I):
            attr_requests = ["fee"]
        elif re.search(r'\b(?:qualification|qualifications|degree)\b', q_clean, re.I):
            attr_requests = ["qualification"]
        elif re.search(r'\b(?:warden|head)\b', q_clean, re.I):
            attr_requests = ["warden"]
        elif re.search(r'\b(?:office|room)\b', q_clean, re.I):
            attr_requests = ["office_location"]

        # Build context-aware search query
        ent_names = " ".join([e.canonical_name for e in entities]) if entities else topic_name
        search_q = f"{ent_names} {' '.join(slots.values())} {' '.join(attr_requests)}".strip()

        qp = QueryPlan(
            plan_id=f"qp_{int(time.time()*1000)}",
            intent="UPDATE_TOPIC",
            operation="details",
            capability_id=cap_id,
            target_entities=entities,
            slot_changes=slots,
            attribute_requests=attr_requests,
            topic_transition="SAME",
            search_query=search_q if search_q else q_clean,
            confidence=0.95
        )
        qp.canonical_cache_key = build_canonical_cache_key(qp)
        return qp

    # 3. Fall back to LLM Dialogue State Tracker (Structured JSON Output)
    llm_proposal = await resolve_dialogue_intent_llm(q_clean, state, http_client)
    
    if llm_proposal and isinstance(llm_proposal, dict):
        raw_entities = llm_proposal.get("target_entities", [])
        entities = []
        for re_item in raw_entities:
            if isinstance(re_item, dict) and re_item.get("entity_id"):
                entities.append(EntityRef(
                    entity_type=re_item.get("entity_type", "general"),
                    entity_id=re_item.get("entity_id"),
                    canonical_name=re_item.get("canonical_name") or re_item.get("entity_id")
                ))

        qp = QueryPlan(
            plan_id=f"qp_{int(time.time()*1000)}",
            intent=llm_proposal.get("intent", "UPDATE_TOPIC"),
            operation=llm_proposal.get("operation", "rag_search"),
            capability_id=llm_proposal.get("capability_id", "rag_evidence_engine"),
            target_entities=entities,
            slot_changes=llm_proposal.get("slot_changes", {}),
            constraint_changes=llm_proposal.get("constraint_changes", {}),
            attribute_requests=llm_proposal.get("attribute_requests", []),
            topic_transition=llm_proposal.get("topic_transition", "NEW"),
            search_query=llm_proposal.get("search_query") or q_clean,
            confidence=float(llm_proposal.get("confidence", 0.9))
        )
        qp.canonical_cache_key = build_canonical_cache_key(qp)
        return qp

    # Default standalone query fallback
    qp = QueryPlan(
        plan_id=f"qp_{int(time.time()*1000)}",
        intent="CREATE_TOPIC",
        operation="rag_search",
        capability_id="rag_evidence_engine",
        target_entities=[],
        search_query=q_clean,
        confidence=0.8
    )
    qp.canonical_cache_key = build_canonical_cache_key(qp)
    return qp
