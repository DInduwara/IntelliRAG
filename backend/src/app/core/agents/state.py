"""LangGraph state schema for the multi-agent QA flow."""

from typing import Dict, TypedDict


class QAState(TypedDict):
    question: str
    context: str | None
    citations: Dict[str, dict] | None
    draft_answer: str | None
    answer: str | None
