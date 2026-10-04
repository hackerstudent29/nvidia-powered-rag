"""
LORIN V7 — UNIVERSAL INTERACTION MODEL & DISCOURSE ACT INTERPRETER
===================================================================
Generic, domain-independent representation of user interaction intent, discourse acts,
interaction modes, detail preferences, and unknown term handling policy.
"""

import os
import re
import json
import time
import httpx
from enum import Enum
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field

class DiscourseAct(str, Enum):
    ASK = "ask"
    REQUEST = "request"
    SELECT = "select"
    COMPARE = "compare"
    FILTER = "filter"
    EXPLAIN = "explain"
    EXPAND = "expand"
    SUMMARIZE = "summarize"
    CORRECT = "correct"
    CLARIFY = "clarify"
    CONFIRM = "confirm"
    REJECT = "reject"
    CONTINUE = "continue"
    SWITCH_TOPIC = "switch_topic"
    RESTORE_TOPIC = "restore_topic"
    ATTRIBUTE_REQUEST = "attribute_request"
    GREET = "greet"
    THANK = "thank"
    FAREWELL = "farewell"
    UNKNOWN = "unknown"

class InteractionMode(str, Enum):
    KNOWLEDGE_REQUEST = "knowledge_request"
    FOLLOW_UP = "follow_up"
    STATE_REFERENCE = "state_reference"
    SOCIAL_CONVERSATION = "social_conversation"
    NAVIGATION = "navigation"
    CLARIFICATION = "clarification"
    CORRECTION = "correction"
    COMPARISON = "comparison"
    FILTERING = "filtering"
    UNKNOWN_PROBE = "unknown_probe"

class DetailPreference(str, Enum):
    MINIMAL = "minimal"        # e.g. "Who is the Principal?" -> "Dr. K.S. Srinivasan, Principal of MSAJCE."
    CONCISE = "concise"        # Short paragraph (1-2 sentences)
    STANDARD = "standard"      # Default complete answer
    DETAILED = "detailed"      # Comprehensive multi-paragraph / profile
    EXHAUSTIVE = "exhaustive"  # Complete document / table breakdown

class UnknownPolicy(str, Enum):
    DEFINITELY_SUPPORTED = "definitely_supported"
    DEFINITELY_UNSUPPORTED = "definitely_unsupported"
    UNKNOWN_REQUIRES_PROBING = "unknown_requires_probing"

@dataclass
class UniversalInteractionModel:
    discourse_act: DiscourseAct
    interaction_mode: InteractionMode
    detail_preference: DetailPreference = DetailPreference.STANDARD
    unknown_policy: UnknownPolicy = UnknownPolicy.DEFINITELY_SUPPORTED
    semantic_topic: str = "general"
    unknown_terms: List[str] = field(default_factory=list)
    raw_utterance: str = ""
    confidence: float = 0.95

def parse_detail_preference(utterance: str) -> DetailPreference:
    """Infers detail preference from natural language without hardcoding entity names."""
    u_low = utterance.lower()
    
    # Check MINIMAL / CONCISE indicators ("who is", "what is the name", "just tell", "briefly", "short")
    if re.search(r'\b(?:who\s+is|name\s+of|just|briefly|in\s+short|short\s+answer|only\s+the\s+name)\b', u_low) and len(u_low.split()) <= 7:
        return DetailPreference.MINIMAL
    if re.search(r'\b(?:brief|quick|summary|overview)\b', u_low):
        return DetailPreference.CONCISE
    if re.search(r'\b(?:detail|detailed|full|complete|everything|all|profile|biography|syllabus|structure)\b', u_low):
        return DetailPreference.DETAILED
    if re.search(r'\b(?:exhaustive|thorough|complete\s+breakdown|all\s+details)\b', u_low):
        return DetailPreference.EXHAUSTIVE
    return DetailPreference.STANDARD

def detect_social_interaction(utterance: str) -> Optional[DiscourseAct]:
    """Detects generic social conversational acts (greetings, thanks, farewell) sub-5ms."""
    u_clean = utterance.strip().lower()
    u_norm = re.sub(r'[^a-z0-9\s]', '', u_clean).strip()

    # Greetings
    if re.match(r'^(?:hi+|he+y+|hello+|helo+|hola|namaste|vanakkam|salam|assalamu\s+alaikum|sup|yo|howdy|good\s+morning|good\s+afternoon|good\s+evening|gm|ga|ge)(?:\s+(?:there|lorin|bot|assistant|sir|all|ai|friend))?[\s!.,?]*$', u_norm):
        return DiscourseAct.GREET
    
    # Thanks / Gratitude
    if re.search(r'\b(?:thank\s+you|thanks|thx|ty|thank\s+u|much\s+appreciated|great\s+thanks)\b', u_norm):
        return DiscourseAct.THANK

    # Farewell
    if re.search(r'\b(?:bye|goodbye|see\s+you|cya|take\s+care|have\s+a\s+good\s+day)\b', u_norm):
        return DiscourseAct.FAREWELL

    return None

def analyze_universal_interaction(
    utterance: str,
    state: Optional[Any] = None
) -> UniversalInteractionModel:
    """
    Main entrypoint: Converts user utterance + ConversationState into UniversalInteractionModel.
    """
    u_clean = utterance.strip()
    
    # 1. Social Fast-Path Check (Greetings, Thanks, Farewell)
    social_act = detect_social_interaction(u_clean)
    if social_act:
        return UniversalInteractionModel(
            discourse_act=social_act,
            interaction_mode=InteractionMode.SOCIAL_CONVERSATION,
            detail_preference=DetailPreference.MINIMAL,
            unknown_policy=UnknownPolicy.DEFINITELY_SUPPORTED,
            raw_utterance=u_clean,
            confidence=1.0
        )

    # 2. Detail Preference Deduction
    detail_pref = parse_detail_preference(u_clean)

    # 3. Discourse Act & Interaction Mode Deduction
    u_low = u_clean.lower()
    discourse_act = DiscourseAct.ASK
    mode = InteractionMode.KNOWLEDGE_REQUEST

    if state and getattr(state, "turn_count", 0) > 0:
        mode = InteractionMode.FOLLOW_UP

    if re.search(r'\b(?:compare|versus|vs|difference|both)\b', u_low):
        discourse_act = DiscourseAct.COMPARE
        mode = InteractionMode.COMPARISON
    elif re.search(r'\b(?:filter|only|keep|exclude|where)\b', u_low) and len(u_low.split()) <= 6:
        discourse_act = DiscourseAct.FILTER
        mode = InteractionMode.FILTERING
    elif re.search(r'\b(?:first|second|3rd|last|top|one\s+at)\b', u_low):
        discourse_act = DiscourseAct.SELECT
        mode = InteractionMode.STATE_REFERENCE
    elif re.search(r'\b(?:go\s+back|return\s+to|switch\s+to)\b', u_low):
        discourse_act = DiscourseAct.RESTORE_TOPIC
        mode = InteractionMode.NAVIGATION
    elif re.search(r'\b(?:what|where|who|when|how|which)\b', u_low):
        discourse_act = DiscourseAct.ASK

    # 4. Unknown Term & Policy Probe
    unknown_terms = re.findall(r'\b[A-Z]{2,8}\b', u_clean)
    policy = UnknownPolicy.DEFINITELY_SUPPORTED
    if unknown_terms:
        policy = UnknownPolicy.UNKNOWN_REQUIRES_PROBING

    return UniversalInteractionModel(
        discourse_act=discourse_act,
        interaction_mode=mode,
        detail_preference=detail_pref,
        unknown_policy=policy,
        unknown_terms=unknown_terms,
        raw_utterance=u_clean,
        confidence=0.9
    )
