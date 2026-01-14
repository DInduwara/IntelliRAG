from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class QuestionRequest(BaseModel):
    """Request body for the `/qa` endpoint."""
    question: str


class SourceItem(BaseModel):
    text: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class QAResponse(BaseModel):
    """Response body for the `/qa` endpoint.

    Frontend expects:
      - answer
      - context
      - optional sources[]
    """
    answer: str
    context: str
    sources: Optional[List[SourceItem]] = None
