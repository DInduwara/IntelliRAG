from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
from datetime import datetime

class QuestionRequest(BaseModel):
    question: str = Field(..., description="The user's question.")
    thread_id: Optional[str] = Field(None, description="Unique session ID for memory.")
    document_scope: Optional[str] = Field(None, description="Optional specific PDF filename to query.")

class QAResponse(BaseModel):
    answer: str
    context: str
    plan: Optional[str] = None
    sub_questions: Optional[List[str]] = None
    citations: Optional[Dict[str, Any]] = None
    
    retrieval_traces: Optional[List[Dict[str, Any]]] = None
    
    raw_context: Optional[str] = None
    context_rationale: Optional[str] = None
    
    confidence: str = "low"
    thread_id: Optional[str] = None

# --- NEW MODELS FOR FILE MANAGEMENT ---

class FileItem(BaseModel):
    id: int
    filename: str
    upload_timestamp: datetime

class FileListResponse(BaseModel):
    files: List[FileItem]