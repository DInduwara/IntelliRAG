from pathlib import Path

from fastapi import FastAPI, File, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from dotenv import load_dotenv
load_dotenv()

from .models import QuestionRequest, QAResponse
from .services.qa_service import answer_question
from .services.indexing_service import index_pdf_file
from .core.config import get_settings

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
