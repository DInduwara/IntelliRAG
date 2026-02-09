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


# -----------------------------
# Helpers
# -----------------------------
def _require_admin_key(x_admin_key: str | None) -> None:
    """
    Protect destructive admin endpoints.
    Reads ADMIN_KEY from Settings (core/config.py).
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
    question = payload.question.strip()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="`question` must be a non-empty string.",
        )

    # document_scope is optional (None = global search)
    result = answer_question(question, document_scope=payload.document_scope)

    citations = result.get("citations") or None
    confidence = result.get("confidence", "low")

    return QAResponse(
        answer=result.get("answer", "") or "",
        context=result.get("context", "") or "",
        citations=citations,
        confidence=confidence,
    )


@app.post("/index-pdf", status_code=status.HTTP_200_OK)
async def index_pdf(file: UploadFile = File(...)) -> dict:
    if file.content_type not in ("application/pdf",):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported.",
        )

    upload_dir = Path("data/uploads")
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_path = upload_dir / file.filename
    contents = await file.read()
    file_path.write_bytes(contents)

    try:
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
    Clears:
    1) Local uploaded PDFs: data/uploads/*
    2) Pinecone vectors: delete_all=True

    Protected by request header:
      X-ADMIN-KEY: <ADMIN_KEY>
    """
    _require_admin_key(x_admin_key)

    # 1) Delete local uploaded PDFs
    upload_dir = Path("data/uploads")
    deleted_files = 0

    if upload_dir.exists() and upload_dir.is_dir():
        for p in upload_dir.glob("*"):
            try:
                if p.is_file():
                    p.unlink()
                    deleted_files += 1
                elif p.is_dir():
                    shutil.rmtree(p, ignore_errors=True)
            except Exception:
                # ignore errors during cleanup
                pass

    # 2) Delete ALL vectors in Pinecone
    delete_all_vectors()

    return {
        "message": "Cleared uploads + Pinecone vectors successfully.",
        "deleted_files": deleted_files,
    }
