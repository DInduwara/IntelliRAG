"""LangGraph state schema for the multi-agent QA flow.
- document_scope: if set, retrieval should only use a specific PDF.
"""

from __future__ import annotations
from typing import Dict, NotRequired, TypedDict


class QAState(TypedDict):
    question: str
    context: str | None
    citations: Dict[str, dict] | None
    draft_answer: str | None
    answer: str | None
    document_scope: NotRequired[str | None]
    confidence: NotRequired[str]
