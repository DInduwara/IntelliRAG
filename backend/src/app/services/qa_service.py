"""Service layer for handling QA requests."""

from typing import Dict, Any
from ..core.agents.graph import run_qa_flow


def answer_question(question: str) -> Dict[str, Any]:
    return run_qa_flow(question)
