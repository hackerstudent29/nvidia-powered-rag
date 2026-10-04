"""
LORIN V7 — ENTITY KNOWLEDGE LAYER & CANONICAL RESOLUTION ENGINE
================================================================
Implements an enterprise Entity Knowledge Layer sitting between ingestion,
retrieval, and conversation state. Features PostgreSQL relational schema
support (entities, entity_aliases, entity_mentions, entity_chunk_map),
canonical resolution, alias normalization, and provenance tracking.
"""

import os
import re
import json
import time
import logging
from enum import Enum
from typing import Dict, List, Optional, Any, Set, Tuple
from dataclasses import dataclass, field

logger = logging.getLogger("lorin_ai.entity_knowledge")

class EntityType(str, Enum):
    PERSON = "person"
    ORGANIZATION = "organization"
    LOCATION = "location"
    DEPARTMENT = "department"
    COURSE = "course"
    PROGRAM = "program"
    FACILITY = "facility"
    HOSTEL = "hostel"
    ROUTE = "route"
    POLICY = "policy"
    SCHEME = "scheme"
    EVENT = "event"
    COMMITTEE = "committee"
    CONTACT = "contact"

class EntitySubtype(str, Enum):
    PRINCIPAL = "principal"
    FACULTY = "faculty"
    HOD = "hod"
    DEVELOPER = "developer"
    ADMINISTRATOR = "administrator"
    COMMITTEE = "committee"
    INSTITUTION = "institution"
    UNDERGRADUATE = "undergraduate"
    POSTGRADUATE = "postgraduate"
    SCHOLARSHIP = "scholarship"
    BUS_STOP = "bus_stop"
    FIRE_STATION = "fire_station"
    HOSPITAL = "hospital"
    POLICE_STATION = "police_station"

@dataclass
class CanonicalEntity:
    entity_id: str
    canonical_name: str
    display_name: str
    entity_type: EntityType
    entity_subtype: str
    domains: List[str]
    aliases: List[str]
    description: str
    source_file: str
    external_ids: Dict[str, Any] = field(default_factory=dict)
    importance_score: float = 0.80
    identity_confidence: float = 0.95
    source_authority: float = 0.95
    status: str = "verified"

class EntityRegistry:
    """Canonical Entity Knowledge Registry & Resolution Engine."""

    def __init__(self):
        self.entities: Dict[str, CanonicalEntity] = {}
        self.alias_to_entity_ids: Dict[str, List[str]] = {}
        self._load_curated_entities()

    def _load_curated_entities(self):
        """Manually curated canonical entities across MSAJCE institutional domains."""
        curated_list = [
            # 1. Principal & Leadership
            CanonicalEntity(
                entity_id="ent_principal_srinivasan",
                canonical_name="Dr. K.S. Srinivasan",
                display_name="Dr. K.S. Srinivasan (Principal)",
                entity_type=EntityType.PERSON,
                entity_subtype="principal",
                domains=["administration", "academics", "research"],
                aliases=["Dr. K.S. Srinivasan", "K.S. Srinivasan", "Dr. Srinivasan", "Principal Srinivasan", "Srinivasan K S", "principal"],
                description="Principal of Mohamed Sathak A.J. College of Engineering and Architecture (MSAJCEA). Professor in ECE, Chairman of Academic Advisory Committee, Anti-Ragging Committee, IQAC Chairperson, President of Alumni Association, and author of 13 books.",
                source_file="msajce_principal.md",
                importance_score=1.0,
                identity_confidence=1.0
            ),
            # 2. Creator & Lead Engineer
            CanonicalEntity(
                entity_id="ent_developer_ramanathan",
                canonical_name="Ramanathan S.",
                display_name="Ramanathan S. (Creator of Lorin AI)",
                entity_type=EntityType.PERSON,
                entity_subtype="developer",
                domains=["technology", "academics"],
                aliases=["Ramanathan S.", "Ramanathan", "Ram", "Rama", "Ramzenderum", "Zendrum", "hackerstudent29", "developer", "creator"],
                description="Creator, architect, and lead developer of Lorin AI RAG Chatbot at MSAJCE. B.Tech Information Technology student (batch 2024-2028), full-stack software engineer, and developer of Listen Zenify, ZenDrum Booking, and Zen Hostel.",
                source_file="msajce_developer_ramanathan.md",
                importance_score=0.95,
                identity_confidence=1.0
            ),
            # 3. Faculty Members
            CanonicalEntity(
                entity_id="ent_faculty_weslin",
                canonical_name="Mr. D. Weslin",
                display_name="Mr. D. Weslin (Associate Professor, IT)",
                entity_type=EntityType.PERSON,
                entity_subtype="faculty",
                domains=["academics", "research"],
                aliases=["Mr. D. Weslin", "Dr. Weslin D", "D. Weslin", "Weslin", "Weslin D", "Mr. Weslin"],
                description="Associate Professor in Information Technology at MSAJCE. CSI Student Branch Counsellor, IT Representative in IQAC, co-author of Wireless Sensor Networks, and inventor of Wireless Master Joystick Controller for Robotics patent.",
                source_file="msajce_faculty_profiles.md",
                importance_score=0.90,
                identity_confidence=0.98
            ),
            CanonicalEntity(
                entity_id="ent_faculty_manju",
                canonical_name="Dr. I. Manju",
                display_name="Dr. I. Manju (Professor & HOD ECE)",
                entity_type=EntityType.PERSON,
                entity_subtype="hod",
                domains=["academics", "research"],
                aliases=["Dr. I. Manju", "I. Manju", "Dr. Manju", "Manju I"],
                description="Professor and Head of Department of Electronics & Communication Engineering (ECE) at MSAJCE. Head of IQAC, Anna University approved Ph.D. supervisor in VLSI & Video Processing.",
                source_file="msajce_faculty_profiles.md",
                importance_score=0.90,
                identity_confidence=0.98
            ),
            CanonicalEntity(
                entity_id="ent_faculty_dhiravidachelvi",
                canonical_name="Dr. E. Dhiravidachelvi",
                display_name="Dr. E. Dhiravidachelvi (Convener ICC / SC-ST Cell)",
                entity_type=EntityType.PERSON,
                entity_subtype="faculty",
                domains=["academics", "administration"],
                aliases=["Dr. E. Dhiravidachelvi", "E. Dhiravidachelvi", "Dr. Dhiravidachelvi"],
                description="Faculty member in ECE/IT at MSAJCE. Convener of ICC, SC-ST Cell, Minority Cell, and OBC Cell. Author of patents in IoT disaster management and crowd analysis.",
                source_file="msajce_faculty_profiles.md",
                importance_score=0.85,
                identity_confidence=0.95
            ),
            CanonicalEntity(
                entity_id="ent_faculty_janarthanan",
                canonical_name="Dr. B. Janarthanan",
                display_name="Dr. B. Janarthanan (Head of Research)",
                entity_type=EntityType.PERSON,
                entity_subtype="faculty",
                domains=["research", "academics"],
                aliases=["Dr. B. Janarthanan", "B. Janarthanan", "Dr. Janarthanan"],
                description="Professor in Mechanical Engineering and Head of Research at MSAJCE. Convener of Research Advisory Committee and Anna University Ph.D supervisor.",
                source_file="msajce_faculty_profiles.md",
                importance_score=0.88,
                identity_confidence=0.95
            ),
            CanonicalEntity(
                entity_id="ent_faculty_ramesh",
                canonical_name="Dr. G. Ramesh",
                display_name="Dr. G. Ramesh (Head of Administration)",
                entity_type=EntityType.PERSON,
                entity_subtype="administrator",
                domains=["administration", "academics"],
                aliases=["Dr. G. Ramesh", "G. Ramesh", "Dr. Ramesh"],
                description="Professor in Mechanical Engineering and Head of Administration at MSAJCE. Anna University Ph.D supervisor in natural fibers and composite materials.",
                source_file="msajce_faculty_profiles.md",
                importance_score=0.88,
                identity_confidence=0.95
            ),
            CanonicalEntity(
                entity_id="ent_faculty_senthilkumar",
                canonical_name="Dr. R. Senthilkumar",
                display_name="Dr. R. Senthilkumar (HOD Mechanical)",
                entity_type=EntityType.PERSON,
                entity_subtype="hod",
                domains=["academics"],
                aliases=["Dr. R. Senthilkumar", "Dr. R. Senthil Kumar", "Senthilkumar R"],
                description="Professor and Head of Department of Mechanical Engineering at MSAJCE.",
                source_file="msajce_faculty_profiles.md",
                importance_score=0.85,
                identity_confidence=0.95
            ),
            CanonicalEntity(
                entity_id="ent_faculty_kannan",
                canonical_name="Dr. S. Kannan",
                display_name="Dr. S. Kannan (Professor, IT)",
                entity_type=EntityType.PERSON,
                entity_subtype="faculty",
                domains=["academics"],
                aliases=["Dr. S. Kannan", "Dr. Kannan S", "Kannan S"],
                description="Professor in Information Technology at MSAJCE.",
                source_file="msajce_it.md",
                importance_score=0.85,
                identity_confidence=0.95
            ),
            CanonicalEntity(
                entity_id="ent_admin_gafoor",
                canonical_name="Mr. A. Abdul Gafoor",
                display_name="Mr. A. Abdul Gafoor (Administrative Officer)",
                entity_type=EntityType.PERSON,
                entity_subtype="administrator",
                domains=["administration"],
                aliases=["Mr. A. Abdul Gafoor", "A. Abdul Gafoor", "Abdul Gafoor"],
                description="Administrative Officer of Mohamed Sathak A.J. College of Engineering (Contact: 9940319629, abdulgafoor@msajce-edu.in).",
                source_file="msajce_admission.md",
                importance_score=0.85,
                identity_confidence=0.98
            ),
            CanonicalEntity(
                entity_id="ent_admin_santhosh",
                canonical_name="Dr. K.P. Santhosh Nathan",
                display_name="Dr. K.P. Santhosh Nathan (Head of Admission)",
                entity_type=EntityType.PERSON,
                entity_subtype="administrator",
                domains=["admissions", "sports"],
                aliases=["Dr. K.P. Santhosh Nathan", "Dr. K P Santhosh Nathan", "Santhosh Nathan", "Head of Admission"],
                description="Physical Education Director and Head of Admission for MSAJCEA (Contact: 9840886992, ped.santhosh@msajce-edu.in).",
                source_file="msajce_admission.md",
                importance_score=0.90,
                identity_confidence=0.98
            ),
            CanonicalEntity(
                entity_id="ent_faculty_vamsi",
                canonical_name="Dr. A. Vamsi Naga Mohan",
                display_name="Dr. A. Vamsi Naga Mohan (Other-State Admission Coordinator)",
                entity_type=EntityType.PERSON,
                entity_subtype="faculty",
                domains=["admissions", "academics"],
                aliases=["Dr. A. Vamsi Naga Mohan", "Dr. Vamsi Naga Mohan A", "Dr. Vamsi", "Vamsi Naga Mohan"],
                description="Assistant Professor and Coordinator of Admission for Students from Other States at MSAJCEA (Contact: 9043358674 / 9502687344).",
                source_file="msajce_admission.md",
                importance_score=0.88,
                identity_confidence=0.98
            ),

            # 4. Departments & Academic Units
            CanonicalEntity(
                entity_id="ent_dept_cse",
                canonical_name="Department of Computer Science and Engineering",
                display_name="Computer Science & Engineering (CSE)",
                entity_type=EntityType.DEPARTMENT,
                entity_subtype="undergraduate",
                domains=["academics"],
                aliases=["CSE", "Computer Science", "Computer Science and Engineering", "B.E. CSE", "B.E Computer Science"],
                description="B.E. Computer Science & Engineering department with permanent Anna University affiliation. Total sanctioned intake of 60 seats (30 Govt, 30 Management).",
                source_file="msajce_cse.md",
                importance_score=0.95,
                identity_confidence=1.0
            ),
            CanonicalEntity(
                entity_id="ent_dept_it",
                canonical_name="Department of Information Technology",
                display_name="Information Technology (IT)",
                entity_type=EntityType.DEPARTMENT,
                entity_subtype="undergraduate",
                domains=["academics"],
                aliases=["IT", "Information Technology", "B.Tech. IT", "B.Tech Information Technology"],
                description="B.Tech. Information Technology department at MSAJCE. Total sanctioned intake of 60 seats (30 Govt, 30 Management).",
                source_file="msajce_it.md",
                importance_score=0.95,
                identity_confidence=1.0
            ),
            CanonicalEntity(
                entity_id="ent_dept_ece",
                canonical_name="Department of Electronics and Communication Engineering",
                display_name="Electronics & Communication Engineering (ECE)",
                entity_type=EntityType.DEPARTMENT,
                entity_subtype="undergraduate",
                domains=["academics"],
                aliases=["ECE", "Electronics and Communication", "Electronics & Communication Engineering", "B.E. ECE"],
                description="B.E. Electronics & Communication Engineering department at MSAJCE. Sanctioned intake of 60 seats.",
                source_file="msajce_ece.md",
                importance_score=0.92,
                identity_confidence=1.0
            ),
            CanonicalEntity(
                entity_id="ent_dept_aids",
                canonical_name="Department of Artificial Intelligence and Data Science",
                display_name="AI & Data Science (AI&DS)",
                entity_type=EntityType.DEPARTMENT,
                entity_subtype="undergraduate",
                domains=["academics"],
                aliases=["AI&DS", "AIDS", "AI and DS", "Artificial Intelligence and Data Science", "B.Tech AIDS"],
                description="B.Tech. Artificial Intelligence & Data Science department at MSAJCE with 60 seats intake.",
                source_file="msajce_aids.md",
                importance_score=0.92,
                identity_confidence=1.0
            ),
            CanonicalEntity(
                entity_id="ent_dept_mech",
                canonical_name="Department of Mechanical Engineering",
                display_name="Mechanical Engineering (MECH)",
                entity_type=EntityType.DEPARTMENT,
                entity_subtype="undergraduate",
                domains=["academics", "research"],
                aliases=["MECH", "Mechanical", "Mechanical Engineering", "B.E. Mechanical"],
                description="B.E. Mechanical Engineering department with permanent Anna University affiliation and approved Ph.D Research Center. Intake of 30 seats.",
                source_file="msajce_mech.md",
                importance_score=0.92,
                identity_confidence=1.0
            ),

            # 5. Schemes, Policies & Initiatives
            CanonicalEntity(
                entity_id="ent_scheme_karma",
                canonical_name="Kaushal Augmentation and Restructuring Mission of AICTE (KARMA)",
                display_name="AICTE KARMA Scheme",
                entity_type=EntityType.SCHEME,
                entity_subtype="scholarship",
                domains=["academics", "administration"],
                aliases=["KARMA", "KARMA scheme", "AICTE KARMA", "KARMA project", "KARMA initiative"],
                description="AICTE approved skill initiative at MSAJCE offering Model 1 and Model 2 domain-specific demand-led skill courses (AI/ML Developer, 3D Printing, Embedded Systems, RAC Technician, Autodesk Revit).",
                source_file="msajce_karma.md",
                importance_score=0.90,
                identity_confidence=1.0
            ),
            CanonicalEntity(
                entity_id="ent_committee_iqac",
                canonical_name="Internal Quality Assurance Cell (IQAC)",
                display_name="IQAC Committee",
                entity_type=EntityType.COMMITTEE,
                entity_subtype="committee",
                domains=["administration", "quality"],
                aliases=["IQAC", "IQAC cell", "Quality Assurance Cell", "Internal Quality Assurance Cell"],
                description="Internal Quality Assurance Cell at MSAJCE, chaired by Principal Dr. K.S. Srinivasan and headed by Dr. I. Manju.",
                source_file="msajce_iqac.md",
                importance_score=0.90,
                identity_confidence=1.0
            ),

            # 6. Campus Locations & Codes
            CanonicalEntity(
                entity_id="ent_location_siruseri",
                canonical_name="SIPCOT IT Park Siruseri Campus",
                display_name="MSAJCE Campus (Siruseri OMR)",
                entity_type=EntityType.LOCATION,
                entity_subtype="campus",
                domains=["location", "transport"],
                aliases=["Siruseri", "SIPCOT IT Park", "Rajiv Gandhi Salai", "OMR Siruseri", "MSAJCE campus"],
                description="70-acre green campus located inside SIPCOT IT Park in Siruseri, Chennai (Rajiv Gandhi Salai OMR), surrounded by TCS, CTS, Intellect, and Aspire.",
                source_file="msajce_about.md",
                importance_score=0.95,
                identity_confidence=1.0
            ),
            CanonicalEntity(
                entity_id="ent_tnea_code_1301",
                canonical_name="TNEA Counselling Code 1301",
                display_name="TNEA Code 1301",
                entity_type=EntityType.CONTACT,
                entity_subtype="institution",
                domains=["admissions"],
                aliases=["1301", "TNEA 1301", "TNEA code", "TNEA counselling code"],
                description="Official Tamil Nadu Engineering Admissions (TNEA) Counselling Code for Mohamed Sathak A.J. College of Engineering and Architecture.",
                source_file="msajce_admission.md",
                importance_score=0.95,
                identity_confidence=1.0
            )
        ]

        for ent in curated_list:
            self.entities[ent.entity_id] = ent
            for alias in ent.aliases:
                norm = alias.strip().lower()
                if norm not in self.alias_to_entity_ids:
                    self.alias_to_entity_ids[norm] = []
                if ent.entity_id not in self.alias_to_entity_ids[norm]:
                    self.alias_to_entity_ids[norm].append(ent.entity_id)

    def resolve_entity(self, query: str) -> List[CanonicalEntity]:
        """Resolves user query terms to matching canonical entities."""
        q_clean = query.strip().lower()
        matched_ids: Set[str] = set()

        if q_clean in self.alias_to_entity_ids:
            matched_ids.update(self.alias_to_entity_ids[q_clean])

        for alias, eids in self.alias_to_entity_ids.items():
            if len(alias) >= 3 and alias in q_clean:
                matched_ids.update(eids)

        resolved = [self.entities[eid] for eid in matched_ids if eid in self.entities]
        resolved.sort(key=lambda x: x.importance_score, reverse=True)
        return resolved

    def sync_to_postgres(self):
        """Creates PostgreSQL entity tables and synchronizes canonical entities."""
        try:
            from backend.app.services.database import DBContext
            with DBContext() as conn:
                if conn:
                    with conn.cursor() as cur:
                        cur.execute("""
                            CREATE TABLE IF NOT EXISTS entities (
                                entity_id TEXT PRIMARY KEY,
                                canonical_name TEXT NOT NULL,
                                display_name TEXT NOT NULL,
                                entity_type TEXT NOT NULL,
                                entity_subtype TEXT,
                                domains JSONB,
                                description TEXT,
                                source_file TEXT,
                                external_ids JSONB,
                                importance_score FLOAT DEFAULT 0.8,
                                identity_confidence FLOAT DEFAULT 0.95,
                                status TEXT DEFAULT 'verified',
                                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                            );
                        """)
                        cur.execute("""
                            CREATE TABLE IF NOT EXISTS entity_aliases (
                                alias_id SERIAL PRIMARY KEY,
                                entity_id TEXT REFERENCES entities(entity_id) ON DELETE CASCADE,
                                surface_form TEXT NOT NULL,
                                normalized_form TEXT NOT NULL,
                                alias_type TEXT DEFAULT 'alias',
                                is_preferred BOOLEAN DEFAULT FALSE,
                                UNIQUE (entity_id, normalized_form)
                            );
                        """)
                        cur.execute("""
                            CREATE TABLE IF NOT EXISTS entity_chunk_map (
                                entity_id TEXT REFERENCES entities(entity_id) ON DELETE CASCADE,
                                chunk_id TEXT NOT NULL,
                                document_id TEXT,
                                mention_count INT DEFAULT 1,
                                PRIMARY KEY (entity_id, chunk_id)
                            );
                        """)
                        
                        for ent in self.entities.values():
                            cur.execute("""
                                INSERT INTO entities (entity_id, canonical_name, display_name, entity_type, entity_subtype, domains, description, source_file, external_ids, importance_score, identity_confidence, status)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                                ON CONFLICT (entity_id) DO UPDATE SET
                                    canonical_name = EXCLUDED.canonical_name,
                                    display_name = EXCLUDED.display_name,
                                    description = EXCLUDED.description,
                                    source_file = EXCLUDED.source_file,
                                    importance_score = EXCLUDED.importance_score;
                            """, (
                                ent.entity_id, ent.canonical_name, ent.display_name,
                                ent.entity_type.value, ent.entity_subtype,
                                json.dumps(ent.domains), ent.description, ent.source_file,
                                json.dumps(ent.external_ids), ent.importance_score, ent.identity_confidence, ent.status
                            ))

                            for alias in ent.aliases:
                                norm = alias.strip().lower()
                                cur.execute("""
                                    INSERT INTO entity_aliases (entity_id, surface_form, normalized_form, is_preferred)
                                    VALUES (%s, %s, %s, %s)
                                    ON CONFLICT (entity_id, normalized_form) DO NOTHING;
                                """, (ent.entity_id, alias, norm, alias == ent.canonical_name))

                        conn.commit()
                        logger.info(f"[Entity Knowledge] Synchronized {len(self.entities)} canonical entities to Neon PostgreSQL!")
        except Exception as e:
            logger.warning(f"[Entity Knowledge] DB Sync Warning: {e}")

global_entity_registry = EntityRegistry()

