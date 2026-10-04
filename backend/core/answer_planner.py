"""
LORIN V7 — ANSWER PLANNER & RESPONSE CONTRACT VALIDATOR
======================================================
Generic, domain-independent AnswerPlan construction and scope contract validator.
Controls detail level (MINIMAL, CONCISE, STANDARD, DETAILED) and scope boundaries
independently of retrieved document size.
"""

import re
import json
import time
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field

from backend.core.universal_interaction import UniversalInteractionModel, DetailPreference, DiscourseAct
from backend.core.conversation_state import EntityRef

logger = logging.getLogger("lorin_ai.answer_planner")

@dataclass
class AnswerPlan:
    plan_id: str
    response_mode: str                 # e.g., "text", "list", "table", "comparison", "social_reply"
    detail_level: DetailPreference     # MINIMAL | CONCISE | STANDARD | DETAILED | EXHAUSTIVE
    target_entities: List[EntityRef] = field(default_factory=list)
    requested_attributes: List[str] = field(default_factory=list)
    must_include: List[str] = field(default_factory=list)
    should_exclude: List[str] = field(default_factory=list)
    max_sentences: int = 10
    allow_unrequested_history: bool = True

def build_answer_plan(
    interaction: UniversalInteractionModel,
    target_entities: List[EntityRef],
    requested_attributes: List[str]
) -> AnswerPlan:
    """Builds a universal AnswerPlan based on interaction model and target entities."""
    
    # 1. Social Reply Path
    if interaction.discourse_act in [DiscourseAct.GREET, DiscourseAct.THANK, DiscourseAct.FAREWELL]:
        return AnswerPlan(
            plan_id=f"ap_social_{int(time.time()*1000)}",
            response_mode="social_reply",
            detail_level=DetailPreference.MINIMAL,
            target_entities=[],
            requested_attributes=[],
            max_sentences=2,
            allow_unrequested_history=False
        )

    # 2. Detail Level & Sentence Cap
    detail_level = interaction.detail_preference
    max_sentences = 10
    allow_history = True

    if detail_level == DetailPreference.MINIMAL:
        max_sentences = 2
        allow_history = False
    elif detail_level == DetailPreference.CONCISE:
        max_sentences = 4
        allow_history = False
    elif detail_level == DetailPreference.DETAILED:
        max_sentences = 20

    # 3. Scope Boundaries & Must-Includes
    must_inc = list(requested_attributes)
    for ent in target_entities:
        if ent.canonical_name:
            must_inc.append(ent.canonical_name)

    return AnswerPlan(
        plan_id=f"ap_{int(time.time()*1000)}",
        response_mode="text" if interaction.discourse_act != DiscourseAct.COMPARE else "comparison",
        detail_level=detail_level,
        target_entities=target_entities,
        requested_attributes=requested_attributes,
        must_include=must_inc,
        max_sentences=max_sentences,
        allow_unrequested_history=allow_history
    )


class ResponseContractValidator:
    """Enforces AnswerPlan scope contract over generated LLM response."""

    def validate_and_trim_scope(
        self,
        response_text: str,
        answer_plan: AnswerPlan
    ) -> str:
        """
        Trims response text if it exceeds requested detail level (e.g. MINIMAL name inquiry
        should not dump 4 paragraphs of patents/biography).
        """
        if not response_text or answer_plan.detail_level not in [DetailPreference.MINIMAL, DetailPreference.CONCISE]:
            return response_text

        # Protect abbreviations (Dr., Prof., K.S., Ph.D., B.Tech, etc.) from splitting
        protected = re.sub(r'\b(Dr|Prof|Mr|Mrs|Ms|Ph\.D|B\.Tech|M\.Tech|B\.E|M\.E|B\.Arch|M\.Arch|[A-Z])\.', r'\1__DOT__', response_text.strip())
        raw_sentences = re.split(r'(?<=[.!?])\s+', protected)
        sentences = [s.replace('__DOT__', '.') for s in raw_sentences if s.strip()]

        if len(sentences) > answer_plan.max_sentences:
            trimmed = " ".join(sentences[:answer_plan.max_sentences])
            logger.info(f"[AnswerPlan] Trimmed response from {len(sentences)} to {answer_plan.max_sentences} sentences for MINIMAL detail level.")
            return trimmed

        return response_text

global_response_validator = ResponseContractValidator()
