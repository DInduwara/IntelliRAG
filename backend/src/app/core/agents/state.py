"""LangGraph state schema for the multi-agent QA flow."""

from __future__ import annotations
from typing import Dict, NotRequired, TypedDict


class QAState(TypedDict):
    question: str
    context: str | None
    citations: Dict[str, dict] | None
    draft_answer: str | None
    answer: str | None
    confidence: NotRequired[str]
    