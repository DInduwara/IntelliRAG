from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class QuestionRequest(BaseModel):
    """Request body for the `/qa` endpoint."""
    question: str


class QAResponse(BaseModel):
    """Response body for the `/qa` endpoint.

    Frontend expects:
      - answer
      - context
      - optional sources[]
    """
    answer: str
    context: str
    citations: Optional[Dict[str, dict]] = None
