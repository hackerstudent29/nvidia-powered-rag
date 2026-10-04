"""
LORIN V6 — DOMAIN-INDEPENDENT CONVERSATION STATE MODEL
=====================================================
Structured, serializable dataclasses representing conversation state, topic frames,
entity references, result sets, and structured query plans.
"""

import time
import json
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field, asdict

@dataclass
class EntityRef:
    entity_type: str                   # e.g., "route", "course", "department", "person", "facility"
    entity_id: str                     # e.g., "AR3", "CSE", "dr_ks_srinivasan"
    canonical_name: str                # e.g., "Route AR3 (Velachery)", "B.E. Computer Science & Engineering"
    attributes: Dict[str, Any] = field(default_factory=dict)
    source: Optional[str] = None       # e.g., "route_finder", "rag_retrieval", "taxonomy"
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class ResultItem:
    position: int                      # 1-indexed position in list (1, 2, 3...)
    entity_type: str
    entity_id: str
    canonical_name: str
    attributes: Dict[str, Any] = field(default_factory=dict)

@dataclass
class ResultSet:
    result_set_id: str
    turn_id: int
    semantic_type: str                 # e.g., "buses", "courses", "faculty", "facilities"
    title: str                         # e.g., "Verified Campus & MTC Bus Fleet"
    ordered_items: List[ResultItem] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    expires_at: Optional[float] = None

@dataclass
class TopicFrame:
    frame_id: str
    semantic_topic: str                # e.g., "transport", "hostel", "admissions", "governance"
    capability_id: str                 # e.g., "route_finder", "academic_info", "governance_info"
    active_entities: List[EntityRef] = field(default_factory=list)
    selected_entity: Optional[EntityRef] = None
    slots: Dict[str, Any] = field(default_factory=dict)
    constraints: Dict[str, Any] = field(default_factory=dict)
    result_set_ids: List[str] = field(default_factory=list)
    requested_attributes: List[str] = field(default_factory=list)
    last_intent: Optional[str] = None
    created_turn: int = 0
    last_active_turn: int = 0
    is_suspended: bool = False

@dataclass
class QueryPlan:
    plan_id: str
    intent: str                        # e.g., "CREATE_TOPIC", "UPDATE_TOPIC", "SWITCH_TOPIC", "RESTORE_TOPIC", "SELECT_POSITION", "FILTER", "COMPARE", "ATTRIBUTE_CHANGE"
    operation: str                     # e.g., "ROUTE_LOOKUP", "FLEET_OVERVIEW", "STOP_TIMINGS", "RAG_SEARCH", "COMPARISON"
    capability_id: str                 # e.g., "route_finder", "academic_info", "governance_info"
    target_entities: List[EntityRef] = field(default_factory=list)
    slot_changes: Dict[str, Any] = field(default_factory=dict)
    constraint_changes: Dict[str, Any] = field(default_factory=dict)
    attribute_requests: List[str] = field(default_factory=list)
    topic_transition: Optional[str] = None # e.g., "PUSH", "POP", "SAME", "NEW"
    search_query: str = ""
    canonical_cache_key: str = ""
    confidence: float = 1.0

@dataclass
class EvidencePlan:
    plan_id: str
    required_entities: List[EntityRef] = field(default_factory=list)
    required_attributes: List[str] = field(default_factory=list)
    minimum_completeness: float = 0.8
    search_queries: List[str] = field(default_factory=list)
    is_probing: bool = False

@dataclass
class ConversationState:
    session_id: str
    user_id: Optional[str] = None
    turn_count: int = 0
    state_version: int = 1
    active_topic_frame: Optional[TopicFrame] = None
    topic_stack: List[TopicFrame] = field(default_factory=list)
    active_entities: List[EntityRef] = field(default_factory=list)
    selected_entities: List[EntityRef] = field(default_factory=list)
    active_result_sets: List[ResultSet] = field(default_factory=list)
    active_constraints: Dict[str, Any] = field(default_factory=dict)
    active_slots: Dict[str, Any] = field(default_factory=dict)
    requested_attributes: List[str] = field(default_factory=list)
    comparison_set: List[EntityRef] = field(default_factory=list)
    last_intent: Optional[str] = None
    last_query_plan: Optional[QueryPlan] = None
    updated_at: float = field(default_factory=time.time)

    def to_dict(self) -> Dict[str, Any]:
        """Convert dataclass structure to a JSON-serializable dictionary."""
        return json.loads(json.dumps(self, default=lambda o: o.__dict__))

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ConversationState":
        """Reconstruct ConversationState from a dictionary (e.g., loaded from JSONB)."""
        if not data:
            return cls(session_id="default")
        
        # Reconstruct active_entities
        active_entities = [EntityRef(**e) if isinstance(e, dict) else e for e in data.get("active_entities", [])]
        selected_entities = [EntityRef(**e) if isinstance(e, dict) else e for e in data.get("selected_entities", [])]
        comparison_set = [EntityRef(**e) if isinstance(e, dict) else e for e in data.get("comparison_set", [])]

        # Reconstruct result sets
        result_sets = []
        for rs in data.get("active_result_sets", []):
            if isinstance(rs, dict):
                items = [ResultItem(**it) if isinstance(it, dict) else it for it in rs.get("ordered_items", [])]
                rs_copy = dict(rs)
                rs_copy["ordered_items"] = items
                result_sets.append(ResultSet(**rs_copy))

        # Reconstruct topic frames
        def _parse_frame(f_dict: Optional[Dict[str, Any]]) -> Optional[TopicFrame]:
            if not f_dict:
                return None
            f_copy = dict(f_dict)
            f_copy["active_entities"] = [EntityRef(**e) if isinstance(e, dict) else e for e in f_dict.get("active_entities", [])]
            if f_dict.get("selected_entity") and isinstance(f_dict["selected_entity"], dict):
                f_copy["selected_entity"] = EntityRef(**f_dict["selected_entity"])
            return TopicFrame(**f_copy)

        active_frame = _parse_frame(data.get("active_topic_frame"))
        topic_stack = [_parse_frame(f) for f in data.get("topic_stack", []) if f]

        # Reconstruct QueryPlan
        qp_dict = data.get("last_query_plan")
        last_qp = None
        if qp_dict and isinstance(qp_dict, dict):
            qp_copy = dict(qp_dict)
            qp_copy["target_entities"] = [EntityRef(**e) if isinstance(e, dict) else e for e in qp_dict.get("target_entities", [])]
            last_qp = QueryPlan(**qp_copy)

        return cls(
            session_id=data.get("session_id", "default"),
            user_id=data.get("user_id"),
            turn_count=data.get("turn_count", 0),
            state_version=data.get("state_version", 1),
            active_topic_frame=active_frame,
            topic_stack=topic_stack,
            active_entities=active_entities,
            selected_entities=selected_entities,
            active_result_sets=result_sets,
            active_constraints=data.get("active_constraints", {}),
            active_slots=data.get("active_slots", {}),
            requested_attributes=data.get("requested_attributes", []),
            comparison_set=comparison_set,
            last_intent=data.get("last_intent"),
            last_query_plan=last_qp,
            updated_at=data.get("updated_at", time.time())
        )


def load_durable_conversation_state(session_id: str) -> ConversationState:
    """Loads durable ConversationState from Neon DB (or initializes new if not found)."""
    try:
        from backend.app.services.database import DBContext
        from psycopg2.extras import RealDictCursor
        with DBContext() as conn:
            if conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("SELECT state FROM chat_sessions WHERE session_id = %s;", (session_id,))
                    row = cur.fetchone()
                    if row and row.get("state"):
                        raw_state = row["state"]
                        if isinstance(raw_state, str):
                            raw_state = json.loads(raw_state)
                        if isinstance(raw_state, dict) and raw_state:
                            return ConversationState.from_dict(raw_state)
    except Exception as e:
        pass
    
    return ConversationState(session_id=session_id)


def commit_durable_conversation_state(state: ConversationState):
    """Persists updated ConversationState JSONB into Neon DB chat_sessions table with atomic optimistic concurrency control."""
    try:
        from backend.app.services.database import DBContext
        dict_state = state.to_dict()
        with DBContext() as conn:
            if conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO chat_sessions (session_id, state, last_active_at, updated_at)
                        VALUES (%s, %s, NOW(), NOW())
                        ON CONFLICT (session_id) DO UPDATE SET
                            state = EXCLUDED.state,
                            last_active_at = NOW(),
                            updated_at = NOW()
                        WHERE COALESCE((chat_sessions.state->>'turn_count')::int, 0) <= %s;
                    """, (state.session_id, json.dumps(dict_state), state.turn_count))
                    conn.commit()
    except Exception as e:
        pass

