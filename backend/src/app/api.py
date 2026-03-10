"""
Main API Entry Point Module (Secure & Multi-Tenant)
"""
from pathlib import Path
import shutil
import jwt
from jwt import PyJWKClient
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, HTTPException, Request, UploadFile, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse

from dotenv import load_dotenv
load_dotenv()

from .models import QuestionRequest, QAResponse, FileListResponse
from .services.qa_service import answer_question
from .services.indexing_service import index_pdf_file
from .core.config import get_settings, current_user_id
from .core.retrieval.vector_store import delete_user_vectors

# IMPORT THE NEW DB HELPER
from .core.db import init_db, save_file_metadata, get_user_files, delete_user_file_metadata

try:
    from openai import RateLimitError as OpenAIRateLimitError  
except Exception:
    OpenAIRateLimitError = None  

# Run startup events (like creating our Neon tables)
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="IntelliRAG Multi-Tenant API", version="1.0.0", lifespan=lifespan)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

def verify_clerk_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    Middleware: Intercepts the JWT token, verifies the cryptographic signature against
    Clerk's public keys, and extracts the user ID.
    """
    token = credentials.credentials
    s = get_settings()
    
    try:
        unverified_claims = jwt.decode(token, options={"verify_signature": False})
        issuer = unverified_claims.get("iss")
        
        if s.clerk_issuer_url and issuer != s.clerk_issuer_url:
            raise ValueError("Token issuer mismatch. Unauthorized instance.")

        jwks_client = PyJWKClient(f"{issuer}/.well-known/jwks.json")
        signing_key = jwks_client.get_signing_key_from_jwt(token)
  
        
        data = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=issuer,
            options={"verify_aud": False}
        )
        
        user_id = data.get("sub")
        if not user_id:
            raise ValueError("Token missing user identity.")
            
        return user_id
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail=f"Invalid authentication token: {str(e)}"
        )

# -----------------------------
# Routes
# -----------------------------

@app.post("/qa", response_model=QAResponse, status_code=status.HTTP_200_OK)
async def qa_endpoint(payload: QuestionRequest, user_id: str = Depends(verify_clerk_token)) -> QAResponse:
    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question required.")
        
    current_user_id.set(user_id)
    thread_id = payload.thread_id or f"session-{user_id}"

    result = answer_question(
        question=question, 
        thread_id=thread_id, 
        document_scope=payload.document_scope
    )

    return QAResponse(
        answer=result.get("answer", ""),
        context=result.get("context", ""),
        plan=result.get("plan"),
        sub_questions=result.get("sub_questions"),
        citations=result.get("citations"),
        retrieval_traces=result.get("retrieval_traces"),
        raw_context=result.get("raw_context"),
        context_rationale=result.get("context_rationale"),
        confidence=result.get("confidence", "low"),
        thread_id=thread_id
    )

@app.post("/index-pdf", status_code=status.HTTP_200_OK)
async def index_pdf(file: UploadFile = File(...), user_id: str = Depends(verify_clerk_token)) -> dict:
    if file.content_type not in ("application/pdf",):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    current_user_id.set(user_id)

    upload_dir = Path(f"data/uploads/{user_id}")
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_path = upload_dir / file.filename
    contents = await file.read()
    file_path.write_bytes(contents)

    try:
        chunks_indexed = index_pdf_file(file_path)
        # FEATURE: Save file metadata to Neon DB upon successful ingestion
        save_file_metadata(user_id, file.filename, str(file_path))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Indexing failed: {str(e)}")

    return {
        "filename": file.filename,
        "chunks_indexed": chunks_indexed,
        "message": "PDF isolated, indexed, and secured successfully.",
    }

# --- NEW GET FILES ENDPOINT ---
@app.get("/my-files", response_model=FileListResponse, status_code=status.HTTP_200_OK)
async def list_my_files(user_id: str = Depends(verify_clerk_token)):
    """Fetches a list of files that belong only to the authenticated user."""
    files = get_user_files(user_id)
    return {"files": files}

@app.delete("/admin/clear", status_code=status.HTTP_200_OK)
async def admin_clear_all(user_id: str = Depends(verify_clerk_token)) -> dict:
    current_user_id.set(user_id)
    upload_dir = Path(f"data/uploads/{user_id}")
    deleted_files = 0

    if upload_dir.exists() and upload_dir.is_dir():
        for p in upload_dir.glob("*"):
            if p.is_file():
                p.unlink(missing_ok=True)
                deleted_files += 1
        shutil.rmtree(upload_dir, ignore_errors=True)

    delete_user_vectors()
    
    # Clean up the SQL Database entries as well
    delete_user_file_metadata(user_id)

    return {
        "message": "Your private documents and vector index have been cleared.",
        "deleted_files": deleted_files,
    }
    