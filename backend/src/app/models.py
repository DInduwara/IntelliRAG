from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class QuestionRequest(BaseModel):
    """Request body for the `/qa` endpoint."""
    question: str
    document_scope: Optional[str] = None


class QAResponse(BaseModel):
    """Response body for the `/qa` endpoint.

    Frontend expects:
      - answer
      - context
      - optional sources[]
    """
    answer: str
    context: str
    plan: Optional[str] = None
    sub_questions: Optional[List[str]] = None
    citations: Optional[Dict[str, dict]] = None
    confidence: str = "low"
