"""
LORIN V6 — CAPABILITY REGISTRY & DOMAIN SCHEMAS
===============================================
Domain-independent capability registration system. Capabilities describe what entity types,
actions, attributes, and filters they support.
The Conversation Engine uses these schemas to validate query plans without domain-specific hardcoding.
"""

from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field

@dataclass
class CapabilitySchema:
    capability_id: str
    entity_types: List[str]
    actions: List[str]
    attributes: List[str]
    filters: List[str] = field(default_factory=list)
    comparison_support: bool = True
    list_support: bool = True
    supported_relations: List[str] = field(default_factory=list)
    description: str = ""

class CapabilityRegistry:
    """Central registry for domain capabilities."""
    def __init__(self):
        self._capabilities: Dict[str, CapabilitySchema] = {}
        self._executor_map: Dict[str, Callable] = {}

    def register_capability(self, schema: CapabilitySchema, executor: Optional[Callable] = None):
        """Registers a domain capability and its schema."""
        self._capabilities[schema.capability_id] = schema
        if executor:
            self._executor_map[schema.capability_id] = executor

    def get_capability(self, capability_id: str) -> Optional[CapabilitySchema]:
        return self._capabilities.get(capability_id)

    def list_capabilities(self) -> List[CapabilitySchema]:
        return list(self._capabilities.values())

    def find_capability_for_entity(self, entity_type: str) -> Optional[CapabilitySchema]:
        for cap in self._capabilities.values():
            if entity_type.lower() in [e.lower() for e in cap.entity_types]:
                return cap
        return None

    def execute_capability(self, capability_id: str, query_plan: Any, context: Any) -> Any:
        executor = self._executor_map.get(capability_id)
        if not executor:
            raise ValueError(f"No execution handler registered for capability '{capability_id}'")
        return executor(query_plan, context)


# Global singleton registry
global_capability_registry = CapabilityRegistry()

# ------------------------------------------------------------------------------
# Default Core Institutional Capabilities Registration
# ------------------------------------------------------------------------------

# 1. Transport RouteFinder Capability
global_capability_registry.register_capability(
    CapabilitySchema(
        capability_id="route_finder",
        entity_types=["route", "stop", "bus", "transport"],
        actions=["find_route", "find_stop", "buses_from", "routes_through", "fleet_overview", "stop_timings"],
        attributes=["full_route", "timings", "stops", "buses", "fare", "convener", "contact"],
        filters=["destination", "origin", "stop_id", "route_id", "bus_type"],
        comparison_support=True,
        list_support=True,
        supported_relations=["connects_to", "stops_at", "departs_from"],
        description="Transport query engine for 9 campus bus routes, 10 MTC public routes, and 175 stops."
    )
)

# 2. Academic & Admissions Capability
global_capability_registry.register_capability(
    CapabilitySchema(
        capability_id="academic_info",
        entity_types=["course", "program", "department", "degree", "branch"],
        actions=["details", "intake_lookup", "fee_lookup", "eligibility_lookup", "curriculum_lookup", "comparison"],
        attributes=["intake", "fees", "duration", "eligibility", "tnea_code", "specializations", "labs", "placements"],
        filters=["degree_level", "department_code", "quota_type"],
        comparison_support=True,
        list_support=True,
        supported_relations=["offered_by", "prerequisite_for"],
        description="Academic programs, intake, Anna University codes, course fees, and department details."
    )
)

# 3. Hostel & Accommodation Capability
global_capability_registry.register_capability(
    CapabilitySchema(
        capability_id="hostel_info",
        entity_types=["hostel", "room", "mess", "facility"],
        actions=["hostel_details", "rules_lookup", "fee_lookup", "warden_lookup", "facility_lookup"],
        attributes=["fees", "facilities", "rules", "timings", "mess_menu", "warden", "location", "capacity"],
        filters=["gender", "room_type", "occupancy"],
        comparison_support=True,
        list_support=True,
        supported_relations=["located_in", "managed_by"],
        description="Residential life, boys & girls hostels, mess, curfew timings, and room amenities."
    )
)

# 4. Governance & Leadership Capability
global_capability_registry.register_capability(
    CapabilitySchema(
        capability_id="governance_info",
        entity_types=["person", "office", "committee", "convener", "faculty"],
        actions=["person_lookup", "contact_lookup", "office_location", "qualification_lookup"],
        attributes=["name", "designation", "qualification", "office_location", "phone", "email", "department"],
        filters=["role", "department", "committee_name"],
        comparison_support=True,
        list_support=True,
        supported_relations=["heads", "member_of"],
        description="Principal, HODs, transport convener, anti-ragging committee, and administrative contacts."
    )
)

# 5. General Knowledge & RAG Fallback Capability
global_capability_registry.register_capability(
    CapabilitySchema(
        capability_id="rag_evidence_engine",
        entity_types=["document", "policy", "accreditation", "event", "scholarship", "club", "general"],
        actions=["rag_search", "document_lookup"],
        attributes=["details", "description", "year", "eligibility", "documents_required"],
        filters=["document_type", "version"],
        comparison_support=True,
        list_support=True,
        description="General hybrid dense + BM25 vector search over all verified campus knowledge chunks."
    )
)
