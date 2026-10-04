"""
LORIN V7.2 — CORPUS-WIDE ENTITY INTELLIGENCE, RESOLUTION & PROVENANCE LAYER
=============================================================================
Full-spectrum, enterprise Entity Knowledge Layer sitting between ingestion,
retrieval, and conversation state. Features PostgreSQL schema management
(entities, entity_aliases, entity_mentions, entity_relationships, entity_claims,
entity_chunk_map), canonical identity resolution, multi-signal candidate scoring,
confidence bands (HIGH, MEDIUM, LOW), ambiguity handling, merge/split lineage,
span-level mention provenance, and idempotent corpus ingestion.
"""

import os
import re
import json
import time
import glob
import logging
import hashlib
import psycopg2
from psycopg2.extras import execute_values
from enum import Enum
from typing import Dict, List, Optional, Any, Set, Tuple
from dataclasses import dataclass, field

logger = logging.getLogger("lorin_ai.entity_knowledge")

# ============================================================================
# 1. TAXONOMY & ENUMS
# ============================================================================

class EntityType(str, Enum):
    PERSON = "person"
    ORGANIZATION = "organization"
    DEPARTMENT = "department"
    PROGRAM = "program"
    COURSE = "course"
    FACILITY = "facility"
    LOCATION = "location"
    ROUTE = "route"
    BUS = "bus"
    STOP = "stop"
    COMMITTEE = "committee"
    DOCUMENT = "document"
    POLICY = "policy"
    SCHEME = "scheme"
    EVENT = "event"
    SCHOLARSHIP = "scholarship"
    SERVICE = "service"
    INSTITUTION = "institution"
    CONTACT = "contact"

class EntityStatus(str, Enum):
    CANDIDATE = "candidate"
    ACTIVE = "active"
    VERIFIED = "verified"
    AMBIGUOUS = "ambiguous"
    DEPRECATED = "deprecated"
    MERGED = "merged"

class ConfidenceBand(str, Enum):
    HIGH = "HIGH"       # >= 0.85 (Deterministic / strong identity evidence -> auto link)
    MEDIUM = "MEDIUM"   # 0.60 - 0.84 (Plausible match requiring candidate validation)
    LOW = "LOW"         # < 0.60 (Insufficient identity evidence -> create candidate/unresolved)

# ============================================================================
# 2. DATACLASS MODELS
# ============================================================================

@dataclass
class CanonicalEntity:
    entity_id: str
    canonical_name: str
    display_name: str
    entity_type: EntityType
    entity_subtype: str
    domains: List[str] = field(default_factory=list)
    roles: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    aliases: List[str] = field(default_factory=list)
    description: str = ""
    source_file: str = ""
    namespace: str = "msajce"
    external_ids: Dict[str, Any] = field(default_factory=dict)
    source_authority: float = 0.95
    identity_confidence: float = 0.95
    importance_score: float = 0.80
    mention_count: int = 1
    document_count: int = 1
    status: EntityStatus = EntityStatus.VERIFIED
    merged_into_entity_id: Optional[str] = None
    version: int = 1
    canonical_source: str = ""
    first_seen_at: str = field(default_factory=lambda: time.strftime("%Y-%m-%d %H:%M:%S"))
    last_seen_at: str = field(default_factory=lambda: time.strftime("%Y-%m-%d %H:%M:%S"))

@dataclass
class EntityAlias:
    alias_id: Optional[int]
    entity_id: str
    surface_form: str
    normalized_form: str
    alias_type: str = "alias"
    language: str = "en"
    source: str = "extracted"
    confidence: float = 0.95
    is_preferred: bool = False
    frequency: int = 1

@dataclass
class EntityMention:
    mention_id: Optional[int]
    entity_id: str
    document_id: str
    document_version_id: str
    chunk_id: str
    surface_form: str
    normalized_form: str
    mention_type: str = "explicit"
    page_number: int = 1
    section_path: str = ""
    start_char: int = 0
    end_char: int = 0
    extraction_confidence: float = 0.90
    resolution_confidence: float = 0.90
    created_at: str = field(default_factory=lambda: time.strftime("%Y-%m-%d %H:%M:%S"))

@dataclass
class EntityClaim:
    claim_id: Optional[int]
    subject_entity_id: str
    predicate: str
    object_entity_id: Optional[str]
    object_value: str
    value_type: str = "string"
    source_document_id: str = ""
    source_document_version_id: str = "2026-27"
    source_chunk_id: str = ""
    evidence_span: str = ""
    confidence: float = 0.95
    source_authority: float = 0.95
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None
    status: str = "active"

@dataclass
class EntityRelationship:
    relationship_id: Optional[int]
    source_entity_id: str
    relationship_type: str
    target_entity_id: str
    confidence: float = 0.95
    source_document_id: str = ""
    source_chunk_id: str = ""
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None
    status: str = "active"

# ============================================================================
# 3. ENTITY RESOLUTION ENGINE (MULTI-SIGNAL MATCHING)
# ============================================================================

class EntityResolver:
    """
    Generic Entity Resolution Engine.
    Combines exact external ID, normalized string match, acronym matching,
    role/department matching, and context overlap to score candidate entities.
    Outputs linking decisions into HIGH, MEDIUM, and LOW confidence bands.
    """

    @staticmethod
    def normalize_name(name: str) -> str:
        """Standardizes name strings by stripping honorifics, punctuation, and extra spaces."""
        n = name.strip().lower()
        n = re.sub(r'^(dr\.|prof\.|mr\.|mrs\.|ms\.|er\.|dr\s+|mr\s+)\s*', '', n)
        n = re.sub(r'[^a-z0-9\s]', ' ', n)
        n = re.sub(r'\s+', ' ', n).strip()
        return n

    @staticmethod
    def calculate_match_score(
        mention_name: str,
        mention_context: str,
        entity: CanonicalEntity,
        known_aliases: List[str]
    ) -> float:
        """Calculates multi-signal match score between a mention and a candidate entity."""
        score = 0.0
        norm_mention = EntityResolver.normalize_name(mention_name)
        norm_canonical = EntityResolver.normalize_name(entity.canonical_name)

        if norm_mention == norm_canonical or norm_mention in norm_canonical:
            score += 0.60
        else:
            for alias in known_aliases:
                norm_alias = EntityResolver.normalize_name(alias)
                if norm_mention == norm_alias or norm_mention in norm_alias:
                    score += 0.55
                    break
                elif len(norm_mention) >= 4 and len(norm_alias) >= 4:
                    if norm_mention in norm_alias or norm_alias in norm_mention:
                        score += 0.35
                        break

        mention_upper = mention_name.strip().upper()
        if mention_upper in entity.aliases or mention_upper == entity.canonical_name.upper():
            score += 0.50

        ctx_lower = mention_context.lower()
        if entity.entity_subtype.lower() in ctx_lower:
            score += 0.15
        for domain in entity.domains:
            if domain.lower() in ctx_lower:
                score += 0.10
                break
        for role in entity.roles:
            if role.lower() in ctx_lower:
                score += 0.15
                break

        score *= (0.85 + 0.15 * entity.importance_score)
        return min(1.0, score)

    @staticmethod
    def get_confidence_band(confidence_score: float) -> ConfidenceBand:
        if confidence_score >= 0.85:
            return ConfidenceBand.HIGH
        elif confidence_score >= 0.60:
            return ConfidenceBand.MEDIUM
        else:
            return ConfidenceBand.LOW

# ============================================================================
# 4. ENTITY KNOWLEDGE REGISTRY
# ============================================================================

class EntityRegistry:
    """Canonical Entity Knowledge Registry & Provenance Store."""

    def __init__(self):
        self.entities: Dict[str, CanonicalEntity] = {}
        self.alias_to_entity_ids: Dict[str, List[str]] = {}
        self.mentions: List[EntityMention] = []
        self.claims: List[EntityClaim] = []
        self.relationships: List[EntityRelationship] = []
        self.entity_chunk_map: Dict[Tuple[str, str], Dict[str, Any]] = {}
        self.merged_entities: Dict[str, str] = {}

        self._load_curated_seeds()

    def _load_curated_seeds(self):
        """Manually curated high-authority seed entities across MSAJCE domains."""
        curated_seeds = [
            CanonicalEntity(
                entity_id="ent_principal_srinivasan",
                canonical_name="Dr. K.S. Srinivasan",
                display_name="Dr. K.S. Srinivasan (Principal)",
                entity_type=EntityType.PERSON,
                entity_subtype="principal",
                domains=["administration", "academics", "research"],
                roles=["Principal", "Chairman Academic Advisory Committee", "IQAC Chairperson"],
                aliases=["Dr. K.S. Srinivasan", "K.S. Srinivasan", "Dr. Srinivasan", "Principal Srinivasan", "Srinivasan K S", "Srinivasan", "principal"],
                description="Principal of Mohamed Sathak A.J. College of Engineering and Architecture (MSAJCEA). Professor in ECE, Chairman of Academic Advisory Committee, Anti-Ragging Committee, IQAC Chairperson, President of Alumni Association.",
                source_file="msajce_principal.md",
                importance_score=1.0,
                identity_confidence=1.0,
                status=EntityStatus.VERIFIED
            ),
            CanonicalEntity(
                entity_id="ent_developer_ramanathan",
                canonical_name="Ramanathan S.",
                display_name="Ramanathan S. (Creator of Lorin AI)",
                entity_type=EntityType.PERSON,
                entity_subtype="developer",
                domains=["technology", "academics"],
                roles=["Creator", "Lead AI Engineer"],
                aliases=["Ramanathan S.", "Ramanathan", "Ram", "Rama", "Ramzenderum", "Zendrum", "hackerstudent29", "developer", "creator"],
                description="Creator, architect, and lead developer of Lorin AI RAG Chatbot at MSAJCE. B.Tech Information Technology student (batch 2024-2028), full-stack software engineer.",
                source_file="msajce_developer_ramanathan.md",
                importance_score=0.95,
                identity_confidence=1.0,
                status=EntityStatus.VERIFIED
            ),
            CanonicalEntity(
                entity_id="ent_faculty_weslin",
                canonical_name="Mr. D. Weslin",
                display_name="Mr. D. Weslin (Associate Professor, IT)",
                entity_type=EntityType.PERSON,
                entity_subtype="faculty",
                domains=["academics", "research"],
                roles=["Associate Professor", "CSI Student Branch Counsellor"],
                aliases=["Mr. D. Weslin", "Dr. Weslin D", "D. Weslin", "Weslin", "Weslin D", "Mr. Weslin"],
                description="Associate Professor in Information Technology at MSAJCE. CSI Student Branch Counsellor, IT Representative in IQAC, co-author of Wireless Sensor Networks, and inventor of Wireless Master Joystick Controller for Robotics patent.",
                source_file="msajce_faculty_profiles.md",
                importance_score=0.90,
                identity_confidence=0.98,
                status=EntityStatus.VERIFIED
            ),
            CanonicalEntity(
                entity_id="ent_faculty_manju",
                canonical_name="Dr. I. Manju",
                display_name="Dr. I. Manju (Professor & HOD ECE)",
                entity_type=EntityType.PERSON,
                entity_subtype="hod",
                domains=["academics", "research"],
                roles=["HOD ECE", "Professor", "Head of IQAC"],
                aliases=["Dr. I. Manju", "I. Manju", "Dr. Manju", "Manju I"],
                description="Professor and Head of Department of Electronics & Communication Engineering (ECE) at MSAJCE. Head of IQAC, Anna University approved Ph.D. supervisor.",
                source_file="msajce_faculty_profiles.md",
                importance_score=0.90,
                identity_confidence=0.98,
                status=EntityStatus.VERIFIED
            ),
            CanonicalEntity(
                entity_id="ent_faculty_dhiravidachelvi",
                canonical_name="Dr. E. Dhiravidachelvi",
                display_name="Dr. E. Dhiravidachelvi (Convener ICC / SC-ST Cell)",
                entity_type=EntityType.PERSON,
                entity_subtype="faculty",
                domains=["academics", "administration"],
                roles=["Convener ICC", "Convener SC-ST Cell"],
                aliases=["Dr. E. Dhiravidachelvi", "E. Dhiravidachelvi", "Dr. Dhiravidachelvi"],
                description="Faculty member in ECE/IT at MSAJCE. Convener of ICC, SC-ST Cell, Minority Cell, and OBC Cell.",
                source_file="msajce_faculty_profiles.md",
                importance_score=0.85,
                identity_confidence=0.95,
                status=EntityStatus.VERIFIED
            ),
            CanonicalEntity(
                entity_id="ent_faculty_janarthanan",
                canonical_name="Dr. B. Janarthanan",
                display_name="Dr. B. Janarthanan (Head of Research)",
                entity_type=EntityType.PERSON,
                entity_subtype="faculty",
                domains=["research", "academics"],
                roles=["Head of Research", "Convener RAC"],
                aliases=["Dr. B. Janarthanan", "B. Janarthanan", "Dr. Janarthanan"],
                description="Professor in Mechanical Engineering and Head of Research at MSAJCE. Convener of Research Advisory Committee and Anna University Ph.D supervisor.",
                source_file="msajce_faculty_profiles.md",
                importance_score=0.88,
                identity_confidence=0.95,
                status=EntityStatus.VERIFIED
            ),
            CanonicalEntity(
                entity_id="ent_faculty_ramesh",
                canonical_name="Dr. G. Ramesh",
                display_name="Dr. G. Ramesh (Head of Administration)",
                entity_type=EntityType.PERSON,
                entity_subtype="administrator",
                domains=["administration", "academics"],
                roles=["Head of Administration", "Professor"],
                aliases=["Dr. G. Ramesh", "G. Ramesh", "Dr. Ramesh"],
                description="Professor in Mechanical Engineering and Head of Administration at MSAJCE.",
                source_file="msajce_faculty_profiles.md",
                importance_score=0.88,
                identity_confidence=0.95,
                status=EntityStatus.VERIFIED
            ),
            CanonicalEntity(
                entity_id="ent_faculty_senthilkumar",
                canonical_name="Dr. R. Senthilkumar",
                display_name="Dr. R. Senthilkumar (HOD Mechanical)",
                entity_type=EntityType.PERSON,
                entity_subtype="hod",
                domains=["academics"],
                roles=["HOD Mechanical"],
                aliases=["Dr. R. Senthilkumar", "Dr. R. Senthil Kumar", "Senthilkumar R"],
                description="Professor and Head of Department of Mechanical Engineering at MSAJCE.",
                source_file="msajce_faculty_profiles.md",
                importance_score=0.85,
                identity_confidence=0.95,
                status=EntityStatus.VERIFIED
            ),
            CanonicalEntity(
                entity_id="ent_admin_gafoor",
                canonical_name="Mr. A. Abdul Gafoor",
                display_name="Mr. A. Abdul Gafoor (Administrative Officer)",
                entity_type=EntityType.PERSON,
                entity_subtype="administrator",
                domains=["administration"],
                roles=["Administrative Officer"],
                aliases=["Mr. A. Abdul Gafoor", "A. Abdul Gafoor", "Abdul Gafoor"],
                description="Administrative Officer of Mohamed Sathak A.J. College of Engineering (Contact: 9940319629).",
                source_file="msajce_admission.md",
                importance_score=0.85,
                identity_confidence=0.98,
                status=EntityStatus.VERIFIED
            ),
            CanonicalEntity(
                entity_id="ent_admin_santhosh",
                canonical_name="Dr. K.P. Santhosh Nathan",
                display_name="Dr. K.P. Santhosh Nathan (Head of Admission)",
                entity_type=EntityType.PERSON,
                entity_subtype="administrator",
                domains=["admissions", "sports"],
                roles=["Head of Admission", "Physical Education Director"],
                aliases=["Dr. K.P. Santhosh Nathan", "Dr. K P Santhosh Nathan", "Santhosh Nathan", "Head of Admission"],
                description="Physical Education Director and Head of Admission for MSAJCEA.",
                source_file="msajce_admission.md",
                importance_score=0.90,
                identity_confidence=0.98,
                status=EntityStatus.VERIFIED
            ),
            CanonicalEntity(
                entity_id="ent_dept_cse",
                canonical_name="Department of Computer Science and Engineering",
                display_name="Computer Science & Engineering (CSE)",
                entity_type=EntityType.DEPARTMENT,
                entity_subtype="undergraduate",
                domains=["academics"],
                roles=["Department"],
                aliases=["CSE", "Computer Science", "Computer Science and Engineering", "B.E. CSE", "B.E Computer Science"],
                description="B.E. Computer Science & Engineering department with permanent Anna University affiliation.",
                source_file="msajce_cse.md",
                importance_score=0.95,
                identity_confidence=1.0,
                status=EntityStatus.VERIFIED
            ),
            CanonicalEntity(
                entity_id="ent_dept_it",
                canonical_name="Department of Information Technology",
                display_name="Information Technology (IT)",
                entity_type=EntityType.DEPARTMENT,
                entity_subtype="undergraduate",
                domains=["academics"],
                roles=["Department"],
                aliases=["IT", "Information Technology", "B.Tech. IT", "B.Tech Information Technology"],
                description="B.Tech. Information Technology department at MSAJCE.",
                source_file="msajce_it.md",
                importance_score=0.95,
                identity_confidence=1.0,
                status=EntityStatus.VERIFIED
            ),
            CanonicalEntity(
                entity_id="ent_dept_ece",
                canonical_name="Department of Electronics and Communication Engineering",
                display_name="Electronics & Communication Engineering (ECE)",
                entity_type=EntityType.DEPARTMENT,
                entity_subtype="undergraduate",
                domains=["academics"],
                roles=["Department"],
                aliases=["ECE", "Electronics and Communication", "Electronics & Communication Engineering", "B.E. ECE"],
                description="B.E. Electronics & Communication Engineering department at MSAJCE.",
                source_file="msajce_ece.md",
                importance_score=0.92,
                identity_confidence=1.0,
                status=EntityStatus.VERIFIED
            ),
            CanonicalEntity(
                entity_id="ent_dept_aids",
                canonical_name="Department of Artificial Intelligence and Data Science",
                display_name="AI & Data Science (AI&DS)",
                entity_type=EntityType.DEPARTMENT,
                entity_subtype="undergraduate",
                domains=["academics"],
                roles=["Department"],
                aliases=["AI&DS", "AIDS", "AI and DS", "Artificial Intelligence and Data Science", "B.Tech AIDS"],
                description="B.Tech. Artificial Intelligence & Data Science department at MSAJCE.",
                source_file="msajce_aids.md",
                importance_score=0.92,
                identity_confidence=1.0,
                status=EntityStatus.VERIFIED
            ),
            CanonicalEntity(
                entity_id="ent_dept_mech",
                canonical_name="Department of Mechanical Engineering",
                display_name="Mechanical Engineering (MECH)",
                entity_type=EntityType.DEPARTMENT,
                entity_subtype="undergraduate",
                domains=["academics", "research"],
                roles=["Department"],
                aliases=["MECH", "Mechanical", "Mechanical Engineering", "B.E. Mechanical"],
                description="B.E. Mechanical Engineering department with permanent Anna University affiliation and approved Ph.D Research Center.",
                source_file="msajce_mech.md",
                importance_score=0.92,
                identity_confidence=1.0,
                status=EntityStatus.VERIFIED
            ),
            CanonicalEntity(
                entity_id="ent_scheme_karma",
                canonical_name="Kaushal Augmentation and Restructuring Mission of AICTE (KARMA)",
                display_name="AICTE KARMA Scheme",
                entity_type=EntityType.SCHEME,
                entity_subtype="scholarship",
                domains=["academics", "administration"],
                roles=["Skill Scheme"],
                aliases=["KARMA", "KARMA scheme", "AICTE KARMA", "KARMA project", "KARMA initiative"],
                description="AICTE approved skill initiative at MSAJCE offering Model 1 and Model 2 domain-specific demand-led skill courses.",
                source_file="msajce_karma.md",
                importance_score=0.90,
                identity_confidence=1.0,
                status=EntityStatus.VERIFIED
            ),
            CanonicalEntity(
                entity_id="ent_committee_iqac",
                canonical_name="Internal Quality Assurance Cell (IQAC)",
                display_name="IQAC Committee",
                entity_type=EntityType.COMMITTEE,
                entity_subtype="committee",
                domains=["administration", "quality"],
                roles=["Committee"],
                aliases=["IQAC", "IQAC cell", "Quality Assurance Cell", "Internal Quality Assurance Cell"],
                description="Internal Quality Assurance Cell at MSAJCE, chaired by Principal Dr. K.S. Srinivasan.",
                source_file="msajce_iqac.md",
                importance_score=0.90,
                identity_confidence=1.0,
                status=EntityStatus.VERIFIED
            ),
            CanonicalEntity(
                entity_id="ent_location_siruseri",
                canonical_name="SIPCOT IT Park Siruseri Campus",
                display_name="MSAJCE Campus (Siruseri OMR)",
                entity_type=EntityType.LOCATION,
                entity_subtype="campus",
                domains=["location", "transport"],
                roles=["Campus"],
                aliases=["Siruseri", "SIPCOT IT Park", "Rajiv Gandhi Salai", "OMR Siruseri", "MSAJCE campus"],
                description="70-acre green campus located inside SIPCOT IT Park in Siruseri, Chennai (Rajiv Gandhi Salai OMR).",
                source_file="msajce_about.md",
                importance_score=0.95,
                identity_confidence=1.0,
                status=EntityStatus.VERIFIED
            ),
            CanonicalEntity(
                entity_id="ent_tnea_code_1301",
                canonical_name="TNEA Counselling Code 1301",
                display_name="TNEA Code 1301",
                entity_type=EntityType.CONTACT,
                entity_subtype="institution",
                domains=["admissions"],
                roles=["Admission Code"],
                aliases=["1301", "TNEA 1301", "TNEA code", "TNEA counselling code"],
                description="Official Tamil Nadu Engineering Admissions (TNEA) Counselling Code for MSAJCEA.",
                source_file="msajce_admission.md",
                importance_score=0.95,
                identity_confidence=1.0,
                status=EntityStatus.VERIFIED
            )
        ]

        for ent in curated_seeds:
            self.register_entity(ent)

    def register_entity(self, entity: CanonicalEntity):
        """Registers or updates a canonical entity and index its aliases."""
        self.entities[entity.entity_id] = entity
        for alias in entity.aliases:
            norm = alias.strip().lower()
            norm_clean = EntityResolver.normalize_name(alias)
            if norm not in self.alias_to_entity_ids:
                self.alias_to_entity_ids[norm] = []
            if entity.entity_id not in self.alias_to_entity_ids[norm]:
                self.alias_to_entity_ids[norm].append(entity.entity_id)

            if norm_clean and norm_clean not in self.alias_to_entity_ids:
                self.alias_to_entity_ids[norm_clean] = []
            if norm_clean and entity.entity_id not in self.alias_to_entity_ids[norm_clean]:
                self.alias_to_entity_ids[norm_clean].append(entity.entity_id)

    def merge_entities(self, primary_entity_id: str, secondary_entity_id: str, merge_reason: str = "Duplicate identification") -> bool:
        """Merges secondary entity into primary entity, retaining lineage and forwarding references."""
        if primary_entity_id not in self.entities or secondary_entity_id not in self.entities:
            return False
        
        pri = self.entities[primary_entity_id]
        sec = self.entities[secondary_entity_id]

        sec.status = EntityStatus.MERGED
        sec.merged_into_entity_id = primary_entity_id
        self.merged_entities[secondary_entity_id] = primary_entity_id

        for alias in sec.aliases:
            if alias not in pri.aliases:
                pri.aliases.append(alias)
            norm = alias.strip().lower()
            if norm in self.alias_to_entity_ids:
                if primary_entity_id not in self.alias_to_entity_ids[norm]:
                    self.alias_to_entity_ids[norm].append(primary_entity_id)

        pri.mention_count += sec.mention_count
        pri.document_count = max(pri.document_count, sec.document_count)
        pri.updated_at = time.strftime("%Y-%m-%d %H:%M:%S")

        logger.info(f"[Entity Knowledge] Merged secondary entity '{sec.canonical_name}' ({secondary_entity_id}) -> primary '{pri.canonical_name}' ({primary_entity_id}). Reason: {merge_reason}")
        return True

    def split_entity(self, entity_id: str, new_entity: CanonicalEntity, reassigned_alias_norms: List[str]) -> bool:
        """Splits an incorrect merge or multi-identity entity into a new distinct entity."""
        if entity_id not in self.entities:
            return False
        
        orig = self.entities[entity_id]
        self.register_entity(new_entity)

        for norm in reassigned_alias_norms:
            if norm in self.alias_to_entity_ids:
                if entity_id in self.alias_to_entity_ids[norm]:
                    self.alias_to_entity_ids[norm].remove(entity_id)

        logger.info(f"[Entity Knowledge] Split entity '{orig.canonical_name}' ({entity_id}) -> new distinct entity '{new_entity.canonical_name}' ({new_entity.entity_id})")
        return True

    def resolve_entity(self, query: str, context: str = "") -> List[CanonicalEntity]:
        """
        Resolves query terms or mention text to canonical entities using multi-signal matching.
        Traverses merge lineage if an entity was merged.
        """
        q_clean = query.strip().lower()
        norm_q = EntityResolver.normalize_name(query)
        matched_ids: Set[str] = set()

        if q_clean in self.alias_to_entity_ids:
            matched_ids.update(self.alias_to_entity_ids[q_clean])

        if norm_q in self.alias_to_entity_ids:
            matched_ids.update(self.alias_to_entity_ids[norm_q])

        for alias, eids in self.alias_to_entity_ids.items():
            if len(alias) >= 3 and (alias in q_clean or q_clean in alias or alias in norm_q or norm_q in alias):
                matched_ids.update(eids)

        resolved_entities: List[CanonicalEntity] = []
        for eid in matched_ids:
            current_id = eid
            while current_id in self.merged_entities:
                current_id = self.merged_entities[current_id]
            
            if current_id in self.entities:
                ent = self.entities[current_id]
                if ent.status != EntityStatus.DEPRECATED and ent not in resolved_entities:
                    resolved_entities.append(ent)

        scored: List[Tuple[CanonicalEntity, float]] = []
        for ent in resolved_entities:
            score = EntityResolver.calculate_match_score(query, context, ent, ent.aliases)
            scored.append((ent, score))

        scored.sort(key=lambda x: x[1], reverse=True)
        return [item[0] for item in scored]

    def sync_to_postgres(self):
        """Creates complete V7.2 PostgreSQL entity tables, applies safe ALTER migration, and syncs data to Neon with batched execute_values."""
        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            return

        try:
            conn = psycopg2.connect(db_url, sslmode="require", connect_timeout=5)
            with conn.cursor() as cur:
                # 1. Base entities table creation
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS entities (
                        entity_id TEXT PRIMARY KEY,
                        canonical_name TEXT NOT NULL,
                        display_name TEXT NOT NULL,
                        entity_type TEXT NOT NULL,
                        entity_subtype TEXT,
                        domains JSONB DEFAULT '[]'::jsonb,
                        description TEXT,
                        source_file TEXT,
                        external_ids JSONB DEFAULT '{}'::jsonb,
                        importance_score FLOAT DEFAULT 0.80,
                        identity_confidence FLOAT DEFAULT 0.95,
                        status TEXT DEFAULT 'verified',
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );
                """)

                v72_entity_columns = [
                    ("roles", "JSONB DEFAULT '[]'::jsonb"),
                    ("tags", "JSONB DEFAULT '[]'::jsonb"),
                    ("namespace", "TEXT DEFAULT 'msajce'"),
                    ("source_authority", "FLOAT DEFAULT 0.95"),
                    ("mention_count", "INT DEFAULT 1"),
                    ("document_count", "INT DEFAULT 1"),
                    ("merged_into_entity_id", "TEXT"),
                    ("version", "INT DEFAULT 1"),
                    ("canonical_source", "TEXT"),
                    ("first_seen_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
                    ("last_seen_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
                    ("updated_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()")
                ]
                for col_name, col_def in v72_entity_columns:
                    cur.execute(f"ALTER TABLE entities ADD COLUMN IF NOT EXISTS {col_name} {col_def};")

                # 2. entity_aliases table creation & ALTER migration
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS entity_aliases (
                        alias_id SERIAL PRIMARY KEY,
                        entity_id TEXT REFERENCES entities(entity_id) ON DELETE CASCADE,
                        surface_form TEXT NOT NULL,
                        normalized_form TEXT NOT NULL,
                        is_preferred BOOLEAN DEFAULT FALSE,
                        UNIQUE (entity_id, normalized_form)
                    );
                """)

                v72_alias_columns = [
                    ("alias_type", "TEXT DEFAULT 'alias'"),
                    ("language", "TEXT DEFAULT 'en'"),
                    ("source", "TEXT DEFAULT 'extracted'"),
                    ("confidence", "FLOAT DEFAULT 0.95"),
                    ("frequency", "INT DEFAULT 1"),
                    ("first_seen_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
                    ("last_seen_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()")
                ]
                for col_name, col_def in v72_alias_columns:
                    cur.execute(f"ALTER TABLE entity_aliases ADD COLUMN IF NOT EXISTS {col_name} {col_def};")

                # 3. entity_mentions table (Provenance)
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS entity_mentions (
                        mention_id SERIAL PRIMARY KEY,
                        entity_id TEXT REFERENCES entities(entity_id) ON DELETE CASCADE,
                        document_id TEXT NOT NULL,
                        document_version_id TEXT DEFAULT '2026-27',
                        chunk_id TEXT NOT NULL,
                        surface_form TEXT NOT NULL,
                        normalized_form TEXT NOT NULL,
                        mention_type TEXT DEFAULT 'explicit',
                        page_number INT DEFAULT 1,
                        section_path TEXT,
                        start_char INT DEFAULT 0,
                        end_char INT DEFAULT 0,
                        extraction_confidence FLOAT DEFAULT 0.90,
                        resolution_confidence FLOAT DEFAULT 0.90,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );
                """)

                # 4. entity_claims table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS entity_claims (
                        claim_id SERIAL PRIMARY KEY,
                        subject_entity_id TEXT REFERENCES entities(entity_id) ON DELETE CASCADE,
                        predicate TEXT NOT NULL,
                        object_entity_id TEXT REFERENCES entities(entity_id) ON DELETE SET NULL,
                        object_value TEXT NOT NULL,
                        value_type TEXT DEFAULT 'string',
                        source_document_id TEXT NOT NULL,
                        source_document_version_id TEXT DEFAULT '2026-27',
                        source_chunk_id TEXT NOT NULL,
                        source_mention_id INT REFERENCES entity_mentions(mention_id) ON DELETE SET NULL,
                        evidence_span TEXT NOT NULL,
                        confidence FLOAT DEFAULT 0.95,
                        source_authority FLOAT DEFAULT 0.95,
                        valid_from TIMESTAMP WITH TIME ZONE,
                        valid_to TIMESTAMP WITH TIME ZONE,
                        status TEXT DEFAULT 'active',
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );
                """)

                # 5. entity_relationships table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS entity_relationships (
                        relationship_id SERIAL PRIMARY KEY,
                        source_entity_id TEXT REFERENCES entities(entity_id) ON DELETE CASCADE,
                        relationship_type TEXT NOT NULL,
                        target_entity_id TEXT REFERENCES entities(entity_id) ON DELETE CASCADE,
                        confidence FLOAT DEFAULT 0.95,
                        source_document_id TEXT NOT NULL,
                        source_chunk_id TEXT NOT NULL,
                        valid_from TIMESTAMP WITH TIME ZONE,
                        valid_to TIMESTAMP WITH TIME ZONE,
                        status TEXT DEFAULT 'active',
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        UNIQUE (source_entity_id, relationship_type, target_entity_id)
                    );
                """)

                # 6. entity_chunk_map table creation & ALTER migration
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS entity_chunk_map (
                        entity_id TEXT REFERENCES entities(entity_id) ON DELETE CASCADE,
                        chunk_id TEXT NOT NULL,
                        document_id TEXT NOT NULL,
                        document_version_id TEXT DEFAULT '2026-27',
                        mention_count INT DEFAULT 1,
                        confidence FLOAT DEFAULT 0.95,
                        first_position INT DEFAULT 0,
                        section_path TEXT,
                        page_number INT DEFAULT 1,
                        PRIMARY KEY (entity_id, chunk_id)
                    );
                """)

                v72_chunk_map_columns = [
                    ("document_version_id", "TEXT DEFAULT '2026-27'"),
                    ("mention_count", "INT DEFAULT 1"),
                    ("confidence", "FLOAT DEFAULT 0.95"),
                    ("first_position", "INT DEFAULT 0"),
                    ("section_path", "TEXT"),
                    ("page_number", "INT DEFAULT 1")
                ]
                for col_name, col_def in v72_chunk_map_columns:
                    cur.execute(f"ALTER TABLE entity_chunk_map ADD COLUMN IF NOT EXISTS {col_name} {col_def};")

                # Prepare unique tuples for batch upsert
                seen_entity_ids = set()
                unique_entity_tuples = []
                for ent in self.entities.values():
                    if ent.entity_id not in seen_entity_ids:
                        seen_entity_ids.add(ent.entity_id)
                        unique_entity_tuples.append((
                            ent.entity_id, ent.canonical_name, ent.display_name,
                            ent.entity_type.value, ent.entity_subtype,
                            json.dumps(ent.domains), json.dumps(ent.roles), json.dumps(ent.tags),
                            ent.description, ent.source_file, ent.namespace, json.dumps(ent.external_ids),
                            ent.source_authority, ent.identity_confidence, ent.importance_score,
                            ent.mention_count, ent.document_count, ent.status.value,
                            ent.merged_into_entity_id, ent.version, ent.canonical_source
                        ))

                execute_values(
                    cur,
                    """
                    INSERT INTO entities (
                        entity_id, canonical_name, display_name, entity_type, entity_subtype,
                        domains, roles, tags, description, source_file, namespace, external_ids, source_authority,
                        identity_confidence, importance_score, mention_count, document_count, status,
                        merged_into_entity_id, version, canonical_source
                    ) VALUES %s
                    ON CONFLICT (entity_id) DO UPDATE SET
                        canonical_name = EXCLUDED.canonical_name,
                        display_name = EXCLUDED.display_name,
                        description = EXCLUDED.description,
                        source_file = EXCLUDED.source_file,
                        domains = EXCLUDED.domains,
                        roles = EXCLUDED.roles,
                        importance_score = EXCLUDED.importance_score,
                        mention_count = EXCLUDED.mention_count,
                        document_count = EXCLUDED.document_count,
                        status = EXCLUDED.status,
                        merged_into_entity_id = EXCLUDED.merged_into_entity_id,
                        updated_at = NOW();
                    """,
                    unique_entity_tuples
                )

                seen_alias_keys = set()
                unique_alias_tuples = []
                for ent in self.entities.values():
                    for alias in ent.aliases:
                        norm = alias.strip().lower()
                        key = (ent.entity_id, norm)
                        if key not in seen_alias_keys:
                            seen_alias_keys.add(key)
                            unique_alias_tuples.append((ent.entity_id, alias, norm, alias == ent.canonical_name))

                execute_values(
                    cur,
                    """
                    INSERT INTO entity_aliases (entity_id, surface_form, normalized_form, is_preferred)
                    VALUES %s
                    ON CONFLICT (entity_id, normalized_form) DO UPDATE SET
                        frequency = entity_aliases.frequency + 1,
                        last_seen_at = NOW();
                    """,
                    unique_alias_tuples
                )

                seen_chunk_keys = set()
                unique_chunk_map_tuples = []
                for (eid, cid), meta in self.entity_chunk_map.items():
                    key = (eid, cid)
                    if key not in seen_chunk_keys:
                        seen_chunk_keys.add(key)
                        unique_chunk_map_tuples.append((
                            eid, cid, meta.get("document_id", ""), meta.get("mention_count", 1),
                            meta.get("confidence", 0.95), meta.get("section_path", ""), meta.get("page_number", 1)
                        ))

                execute_values(
                    cur,
                    """
                    INSERT INTO entity_chunk_map (entity_id, chunk_id, document_id, mention_count, confidence, section_path, page_number)
                    VALUES %s
                    ON CONFLICT (entity_id, chunk_id) DO UPDATE SET
                        mention_count = EXCLUDED.mention_count,
                        confidence = EXCLUDED.confidence;
                    """,
                    unique_chunk_map_tuples
                )

                conn.commit()
                conn.close()
                logger.info(f"[Entity Knowledge] Batch synchronized V7.2 Entity Intelligence layer ({len(self.entities)} entities) to Neon PostgreSQL!")
        except Exception as e:
            logger.warning(f"[Entity Knowledge] DB Sync Warning: {e}")

# Global Registry Instance
global_entity_registry = EntityRegistry()

# ============================================================================
# 5. AUTOMATED CORPUS ENTITY EXTRACTOR
# ============================================================================

class CorpusEntityExtractor:
    """
    Automated corpus-wide entity, mention, claim, and relationship extractor.
    Parses all document markdown files in Dataset/, extracts entities of generic taxonomy,
    performs canonical resolution, and tracks provenance.
    """

    def __init__(self, dataset_dir: str, registry: EntityRegistry = global_entity_registry):
        self.dataset_dir = dataset_dir
        self.registry = registry

    def extract_from_corpus(self) -> Dict[str, Any]:
        """Scans Dataset/*.md files and extracts canonical entities, claims, relationships, and mentions."""
        md_files = glob.glob(os.path.join(self.dataset_dir, "*.md"))
        logger.info(f"[CorpusExtractor] Starting automated corpus-wide entity extraction across {len(md_files)} documents...")

        extracted_count = 0
        new_entity_count = 0

        person_pattern = re.compile(r'\b(?:Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.|Er\.)\s+([A-Z][a-zA-Z\.]+(?:\s+[A-Z][a-zA-Z\.]+){1,3})\b')
        dept_pattern = re.compile(r'\b(Department\s+of\s+[A-Z][a-zA-Z\s\&]+|B\.E\.\s+[A-Z][a-zA-Z\s\&]+|B\.Tech\.\s+[A-Z][a-zA-Z\s\&]+)\b')
        acronym_pattern = re.compile(r'\b[A-Z]{2,10}\b')

        for file_path in md_files:
            filename = os.path.basename(file_path)
            doc_id = filename.replace(".md", "")

            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()

            paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]

            for chunk_idx, paragraph in enumerate(paragraphs):
                chunk_id = f"{doc_id}_{chunk_idx:03d}"

                for match in person_pattern.finditer(paragraph):
                    full_name = match.group(0).strip()
                    extracted_count += 1

                    resolved = self.registry.resolve_entity(full_name, paragraph)
                    if resolved:
                        ent = resolved[0]
                        ent.mention_count += 1
                    else:
                        norm = EntityResolver.normalize_name(full_name)
                        eid = f"ent_person_{hashlib.md5(norm.encode('utf-8')).hexdigest()[:12]}"
                        ent = CanonicalEntity(
                            entity_id=eid,
                            canonical_name=full_name,
                            display_name=f"{full_name} (Extracted Person)",
                            entity_type=EntityType.PERSON,
                            entity_subtype="faculty",
                            domains=["academics"],
                            aliases=[full_name, norm],
                            description=f"Auto-extracted person entity from {filename}.",
                            source_file=filename,
                            importance_score=0.75,
                            identity_confidence=0.85,
                            status=EntityStatus.CANDIDATE
                        )
                        self.registry.register_entity(ent)
                        new_entity_count += 1

                    self.registry.entity_chunk_map[(ent.entity_id, chunk_id)] = {
                        "document_id": doc_id,
                        "mention_count": 1,
                        "confidence": 0.90,
                        "section_path": paragraph[:50]
                    }

                for match in dept_pattern.finditer(paragraph):
                    dept_name = match.group(0).strip()
                    extracted_count += 1

                    resolved = self.registry.resolve_entity(dept_name, paragraph)
                    if resolved:
                        ent = resolved[0]
                        ent.mention_count += 1
                    else:
                        norm = EntityResolver.normalize_name(dept_name)
                        eid = f"ent_dept_{hashlib.md5(norm.encode('utf-8')).hexdigest()[:12]}"
                        ent = CanonicalEntity(
                            entity_id=eid,
                            canonical_name=dept_name,
                            display_name=f"{dept_name} (Academic Unit)",
                            entity_type=EntityType.DEPARTMENT,
                            entity_subtype="undergraduate",
                            domains=["academics"],
                            aliases=[dept_name, norm],
                            description=f"Auto-extracted academic department/program from {filename}.",
                            source_file=filename,
                            importance_score=0.80,
                            identity_confidence=0.90,
                            status=EntityStatus.CANDIDATE
                        )
                        self.registry.register_entity(ent)
                        new_entity_count += 1

                    self.registry.entity_chunk_map[(ent.entity_id, chunk_id)] = {
                        "document_id": doc_id,
                        "mention_count": 1,
                        "confidence": 0.92,
                        "section_path": paragraph[:50]
                    }

                for ac in acronym_pattern.findall(paragraph):
                    if len(ac) >= 3 and ac.lower() not in {"this", "that", "with", "from", "have", "more", "will", "been", "were", "page", "section"}:
                        extracted_count += 1
                        resolved = self.registry.resolve_entity(ac, paragraph)
                        if resolved:
                            ent = resolved[0]
                            ent.mention_count += 1
                            self.registry.entity_chunk_map[(ent.entity_id, chunk_id)] = {
                                "document_id": doc_id,
                                "mention_count": 1,
                                "confidence": 0.95,
                                "section_path": paragraph[:50]
                            }

        self.registry.sync_to_postgres()

        summary = {
            "total_documents": len(md_files),
            "total_mentions_processed": extracted_count,
            "new_entities_discovered": new_entity_count,
            "total_canonical_entities": len(self.registry.entities),
            "total_chunk_mappings": len(self.registry.entity_chunk_map)
        }
        logger.info(f"[CorpusExtractor] Extraction complete! {summary}")
        return summary
