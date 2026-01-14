"""LangGraph state schema for the multi-agent QA flow."""

from typing import Any, Dict, List, TypedDict


class QAState(TypedDict, total=False):
    """State schema for the linear multi-agent QA flow."""
    question: str
    context: str | None
    draft_answer: str | None
    answer: str | None

    # New: sources extracted from retrieval tool artifacts
    sources: List[Dict[str, Any]] | None
