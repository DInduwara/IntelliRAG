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
      - optional sources[]
    """

    answer: str
    # keep context for now (so you don't break anything internally),
    # but make it optional so you can return "" if you want.
    context: Optional[str] = ""
    sources: Optional[List[SourceItem]] = None
