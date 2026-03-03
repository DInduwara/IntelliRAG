"""
LangGraph State Schema Module

This module defines the shared state schema (QAState) for the multi-agent RAG pipeline.
"""

from __future__ import annotations
from typing import Dict, List, Any, NotRequired, TypedDict


class QAState(TypedDict):
    # --------------------------------------------------------------------------
    # 1. Input State
    # --------------------------------------------------------------------------
    question: str
    document_scope: NotRequired[str | None]

    # --------------------------------------------------------------------------
    # 2. Planning State
    # --------------------------------------------------------------------------
    plan: NotRequired[str | None]
    sub_questions: NotRequired[List[str]]

    # --------------------------------------------------------------------------
    # 3. Retrieval State
    # --------------------------------------------------------------------------
    context: str | None
    citations: Dict[str, dict] | None
    retrieval_traces: NotRequired[List[Dict[str, Any]]]

    # --------------------------------------------------------------------------
    # 4. Context Critic State (FEATURE 3)
    # --------------------------------------------------------------------------
    # Holds the unfiltered chunks straight from the database
    raw_context: NotRequired[str | None]
    
    # Holds the critic's explanation of which chunks it kept vs removed
    context_rationale: NotRequired[str | None]

    # --------------------------------------------------------------------------
    # 5. Generation & Verification State
    # --------------------------------------------------------------------------
    draft_answer: str | None
    answer: str | None
    confidence: NotRequired[str]