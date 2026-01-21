"""Service layer for handling QA requests.

This layer acts as a stable interface between API and LangGraph pipeline.
"""

from typing import Dict, Any
from ..core.agents.graph import run_qa_flow


def answer_question(question: str, document_scope: str | None = None) -> Dict[str, Any]:
    """
    Execute the QA flow.

    Args:
        question: User question.
        document_scope: Optional PDF filename to restrict retrieval.

    Returns:
        Dict with answer, context, citations, confidence...
    """
    return run_qa_flow(question, document_scope=document_scope)
