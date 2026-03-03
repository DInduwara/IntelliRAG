"""
LangGraph State Schema Module

This module defines the shared state schema (QAState) for the multi-agent RAG pipeline.
In LangGraph architecture, state acts as the central memory object passed between every 
node in the DAG (Directed Acyclic Graph). Every specialized agent (node) reads from 
and writes to this state, enabling complex, multi-step data orchestration.
"""

from __future__ import annotations
from typing import Dict, List, Any, NotRequired, TypedDict


class QAState(TypedDict):
    """
    Type definition for the pipeline's operational state.
    
    Using a TypedDict ensures type safety and enforces strict data contracts between 
    the different nodes (Planning, Retrieval, Summarization, Verification) in the graph.
    Keys marked as NotRequired indicate optional lifecycle properties.
    """
    
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
    
    # Traces to log multi-query retrieval operations for UI transparency
    retrieval_traces: NotRequired[List[Dict[str, Any]]]

    # --------------------------------------------------------------------------
    # 4. Generation & Verification State
    # --------------------------------------------------------------------------
    draft_answer: str | None
    answer: str | None
    confidence: NotRequired[str]