"""
LORIN V6 — CAPABILITY ORCHESTRATOR
==================================
Dispatches validated QueryPlans to domain capabilities (RouteFinder, Academic, Hostel, Governance, RAG Evidence Engine),
populates ResultSets, and retrieves factual context.
"""

import json
import logging
from typing import Dict, List, Optional, Tuple, Any

try:
    from backend.core.conversation_state import ConversationState, QueryPlan, EntityRef
    from backend.core.capability_registry import global_capability_registry
    from backend.core.dialogue_state_tracker import global_dialogue_state_tracker
except ImportError:
    from core.conversation_state import ConversationState, QueryPlan, EntityRef
    from core.capability_registry import global_capability_registry
    from core.dialogue_state_tracker import global_dialogue_state_tracker

logger = logging.getLogger("lorin_ai.orchestrator")

class CapabilityOrchestrator:
    """Orchestrates capability execution based on QueryPlan."""

    def execute_plan(
        self,
        query_plan: QueryPlan,
        state: ConversationState,
        route_finder_instance: Any = None,
        rag_search_func: Any = None
    ) -> Dict[str, Any]:
        """
        Executes query_plan against registered capability adapters.
        Returns execution context dict:
        {
          "sources": [...],
          "context_chunks": [...],
          "result_set": ResultSet,
          "executed_capability": str,
          "action_taken": str
        }
        """
        cap_id = query_plan.capability_id or "rag_evidence_engine"
        result = {
            "sources": [],
            "context_chunks": [],
            "result_set": None,
            "executed_capability": cap_id,
            "action_taken": query_plan.operation
        }

        # ----------------------------------------------------------------------
        # 1. Transport RouteFinder Capability Execution
        # ----------------------------------------------------------------------
        if cap_id == "route_finder" and route_finder_instance:
            rf = route_finder_instance
            target_ent = query_plan.target_entities[0] if query_plan.target_entities else None
            ent_id = target_ent.entity_id if target_ent else None

            # 1a. Specific Route Lookup (e.g. AR3, 570S, Route 22)
            if ent_id:
                route_data = rf.find_route(ent_id)
                if route_data:
                    r_id = route_data["route_id"]
                    r_name = route_data["name"]
                    chunk_text = f"Official Transport Schedule for Route {r_id} ({r_name}):\n"
                    chunk_text += f"- Route Code: {r_id}\n- Route Name: {r_name}\n"
                    if "timing" in route_data:
                        chunk_text += f"- Departure Timing: {route_data['timing']}\n"
                    chunk_text += "\nStops Covered:\n| Stop Name | Arrival Time |\n|---|---|\n"
                    
                    stop_items = []
                    for s_idx, st in enumerate(route_data.get("stops", []), 1):
                        chunk_text += f"| {st.get('name')} | {st.get('time', 'N/A')} |\n"
                        stop_items.append({
                            "position": s_idx,
                            "entity_type": "stop",
                            "entity_id": st.get("stop_id", f"stop_{s_idx}"),
                            "canonical_name": st.get("name"),
                            "attributes": {"time": st.get("time")}
                        })

                    # Buffer stops into ResultSet
                    rs = global_dialogue_state_tracker.buffer_result_set(
                        state=state,
                        items=stop_items,
                        semantic_type="stops",
                        title=f"Stops for Route {r_id}"
                    )
                    
                    result["sources"] = [{"title": f"Route {r_id} ({r_name})", "chunk_id": f"route_finder_{r_id}"}]
                    result["context_chunks"] = [chunk_text]
                    result["result_set"] = rs
                    return result

            # 1b. Stop Lookup (e.g. Velachery, Tambaram, Sholinganallur)
            stop_param = query_plan.slot_changes.get("stop") or (target_ent.canonical_name if target_ent else query_plan.search_query)
            stop_info, _ = rf.find_stop(stop_param) if stop_param else (None, None)
            
            if stop_info:
                s_id = stop_info["stop_id"]
                s_name = stop_info["name"]
                buses = rf.buses_from(s_id)
                
                chunk_text = f"Official Transport Schedule for Stop '{s_name}' (ID: {s_id}):\n"
                bus_items = []
                for b_idx, b in enumerate(buses, 1):
                    b_time = b.get("time_at_stop") or b.get("time") or "Scheduled"
                    chunk_text += f"- Position #{b_idx}: Route {b['route_id']} ({b['route_name']}) at {b_time}\n"
                    bus_items.append({
                        "position": b_idx,
                        "entity_type": "route",
                        "entity_id": b["route_id"],
                        "canonical_name": f"Route {b['route_id']} ({b['route_name']})",
                        "attributes": {"time": b_time, "stop_name": s_name}
                    })

                # Buffer matching buses into ResultSet for positional follow-ups ("first one")
                rs = global_dialogue_state_tracker.buffer_result_set(
                    state=state,
                    items=bus_items,
                    semantic_type="buses",
                    title=f"Buses serving {s_name}"
                )

                result["sources"] = [{"title": f"Bus Stop: {s_name}", "chunk_id": f"route_finder_stop_{s_id}"}]
                result["context_chunks"] = [chunk_text]
                result["result_set"] = rs
                return result

            # 1c. Fleet Overview Fallback
            overview_text = rf.get_fleet_overview()
            routes_list = [
                {"entity_type": "route", "entity_id": "AR3", "canonical_name": "Route AR3 (Velachery)"},
                {"entity_type": "route", "entity_id": "AR4", "canonical_name": "Route AR4 (Tambaram West)"},
                {"entity_type": "route", "entity_id": "N3", "canonical_name": "Route N3 (Tambaram East)"},
                {"entity_type": "route", "entity_id": "AR6", "canonical_name": "Route AR6 (Chengalpattu)"},
                {"entity_type": "route", "entity_id": "AR7", "canonical_name": "Route AR7 (Guduvanchery)"},
                {"entity_type": "route", "entity_id": "AR8", "canonical_name": "Route AR8 (Koyambedu)"},
                {"entity_type": "route", "entity_id": "AR9", "canonical_name": "Route AR9 (T. Nagar)"},
                {"entity_type": "route", "entity_id": "AR10", "canonical_name": "Route AR10 (Porur)"},
                {"entity_type": "route", "entity_id": "R22", "canonical_name": "Route R22 (Perambur)"},
                {"entity_type": "route", "entity_id": "570S", "canonical_name": "MTC 570S (CMBT ↔ Siruseri)"},
                {"entity_type": "route", "entity_id": "515", "canonical_name": "MTC 515 (Tambaram ↔ Mamallapuram)"},
                {"entity_type": "route", "entity_id": "555S", "canonical_name": "MTC 555S (Tambaram ↔ Siruseri)"}
            ]
            rs = global_dialogue_state_tracker.buffer_result_set(
                state=state,
                items=routes_list,
                semantic_type="buses",
                title="Full Verified Campus & MTC Fleet"
            )
            result["sources"] = [{"title": "Official Transport & Bus Fleet Overview", "chunk_id": "route_finder_fleet"}]
            result["context_chunks"] = [overview_text]
            result["result_set"] = rs
            return result

        # ----------------------------------------------------------------------
        # 2. RAG Knowledge Evidence Engine Execution (Academic, Hostel, Governance, RAG)
        # ----------------------------------------------------------------------
        if rag_search_func:
            search_query = query_plan.search_query or "MSAJCE campus information"
            
            # If explicit attribute requested (e.g. qualification, fees), append to search query
            if query_plan.attribute_requests:
                search_query += " " + " ".join(query_plan.attribute_requests)

            try:
                chunks, trace = rag_search_func(search_query)
                sources = []
                chunk_texts = []
                
                for c in chunks[:5]:
                    title = c.get("title") or c.get("chunk_id") or "Knowledge Record"
                    sources.append({"title": title, "chunk_id": c.get("chunk_id", "doc")})
                    content = c.get("content") or c.get("text") or ""
                    chunk_texts.append(f"[{title}]: {content}")

                result["sources"] = sources
                result["context_chunks"] = chunk_texts
                return result
            except Exception as e:
                logger.warning(f"RAG search execution warning: {e}")

        return result


# Global singleton orchestrator
global_capability_orchestrator = CapabilityOrchestrator()
