"""
Main API Entry Point Module

This module defines the FastAPI application and its routing logic. It serves as the
primary interface for the frontend, handling HTTP requests for document indexing,
multi-agent QA, and administrative maintenance.

Architectural highlights:
- Middleware: Configures CORS for secure frontend-backend communication.
- Exception Handling: Global handlers for OpenAI rate limits and generic internal errors.
- Security: Header-based administrative protection for destructive operations.
"""

from pathlib import Path
import shutil

from fastapi import (
    FastAPI,
    File,
    HTTPException,
    Request,
    UploadFile,
    status,
    Header,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from dotenv import load_dotenv
load_dotenv()

from .models import QuestionRequest, QAResponse
from .services.qa_service import answer_question
from .services.indexing_service import index_pdf_file
from .core.config import get_settings
from .core.retrieval.vector_store import delete_all_vectors

# Senior Note: Conditional import of OpenAI RateLimitError ensures the app remains 
# functional even if the library structure changes, allowing for graceful degradation.
try:
    from openai import RateLimitError as OpenAIRateLimitError  # type: ignore
except Exception:
    OpenAIRateLimitError = None  # type: ignore


app = FastAPI(
    title="Class 12 Multi-Agent RAG Demo",
    description="Demo API for asking questions + indexing PDFs.",
    version="0.1.0",
)


@app.on_event("startup")
async def validate_config() -> None:
    """
    Startup hook to validate that all critical environment variables are loaded.
    This prevents the service from running in a 'zombie' state where requests 
    would inevitably fail due to missing credentials.
    """
    s = get_settings()

    missing = []
    if not s.openai_api_key:
        missing.append("OPENAI_API_KEY")
    if not s.pinecone_api_key:
        missing.append("PINECONE_API_KEY")
    if not s.pinecone_index_name:
        missing.append("PINECONE_INDEX_NAME")

    if missing:
        raise RuntimeError(f"Missing required env vars: {', '.join(missing)}")


# CORS configuration ensures that only the authorized frontend origin can
# interact with this API, preventing Cross-Site Request Forgery (CSRF).
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Global exception interceptor to standardize error responses.
    Specifically handles OpenAI quota issues to provide actionable feedback to the user.
    """
    if isinstance(exc, HTTPException):
        raise exc

    if OpenAIRateLimitError is not None and isinstance(exc, OpenAIRateLimitError):
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": "OpenAI quota/rate-limit: check your API key billing/quota, then retry."},
        )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": str(exc)},
    )


def _require_admin_key(x_admin_key: str | None) -> None:
    """
    Security gatekeeper for administrative endpoints.
    Validates the X-Admin-Key header against the server-side ADMIN_KEY.
    """
    s = get_settings()

    if not getattr(s, "admin_key", None):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ADMIN_KEY is not set on server. Add ADMIN_KEY env var and redeploy.",
        )

    if not x_admin_key or x_admin_key.strip() != s.admin_key.strip():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin key.")


# -----------------------------
# Routes
# -----------------------------

@app.post("/qa", response_model=QAResponse, status_code=status.HTTP_200_OK)
async def qa_endpoint(payload: QuestionRequest) -> QAResponse:
    """
    Main Question-Answering endpoint.
    Orchestrates the multi-agent flow via the service layer.
    """
    question = payload.question.strip()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="`question` must be a non-empty string.",
        )
        
    # Thread ID is vital for LangGraph's checkpointer to maintain conversational memory.
    thread_id = payload.thread_id or "default-session"

    # Execute the core RAG logic.
    result = answer_question(
        question=question, 
        thread_id=thread_id, 
        document_scope=payload.document_scope
    )

    # Post-processing extraction for API response compatibility.
    citations = result.get("citations") or None
    confidence = result.get("confidence", "low")
    plan = result.get("plan")
    sub_questions = result.get("sub_questions")
    retrieval_traces = result.get("retrieval_traces")

    return QAResponse(
        answer=result.get("answer", "") or "",
        context=result.get("context", "") or "",
        plan=plan,
        sub_questions=sub_questions,
        citations=citations,
        retrieval_traces=retrieval_traces,
        confidence=confidence,
        thread_id=thread_id
    )


@app.post("/index-pdf", status_code=status.HTTP_200_OK)
async def index_pdf(file: UploadFile = File(...)) -> dict:
    """
    Document ingestion endpoint.
    Handles PDF uploads, local persistence for reference, and vector indexing.
    """
    if file.content_type not in ("application/pdf",):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported.",
        )

    # Ensure local directory exists for file traceability.
    upload_dir = Path("data/uploads")
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_path = upload_dir / file.filename
    contents = await file.read()
    file_path.write_bytes(contents)

    try:
        # Trigger the indexing pipeline (load -> split -> embed -> upsert).
        chunks_indexed = index_pdf_file(file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Indexing failed: {str(e)}")

    return {
        "filename": file.filename,
        "chunks_indexed": chunks_indexed,
        "message": "PDF indexed successfully.",
    }


@app.delete("/admin/clear", status_code=status.HTTP_200_OK)
async def admin_clear_all(x_admin_key: str | None = Header(default=None)) -> dict:
    """
    Administrative cleanup endpoint.
    Purges all local files and resets the remote Pinecone vector index.
    """
    _require_admin_key(x_admin_key)

    upload_dir = Path("data/uploads")
    deleted_files = 0

    # Purge local file system.
    if upload_dir.exists() and upload_dir.is_dir():
        for p in upload_dir.glob("*"):
            try:
                if p.is_file():
                    p.unlink()
                    deleted_files += 1
                elif p.is_dir():
                    shutil.rmtree(p, ignore_errors=True)
            except Exception:
                # Senior Note: Silent catch here as non-critical file cleanup 
                # should not halt the overall purge process.
                pass

    # Purge remote vector database.
    delete_all_vectors()

    return {
        "message": "Cleared uploads + Pinecone vectors successfully.",
        "deleted_files": deleted_files,
    }
    