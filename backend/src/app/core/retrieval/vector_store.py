"""
Vector Store Integration Module (Multi-Tenant Edition)
"""
from __future__ import annotations

from functools import lru_cache
from typing import List, Optional, Dict, Any
from pathlib import Path

from pinecone import Pinecone
from pinecone.exceptions import PineconeApiException

from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_text_splitters import RecursiveCharacterTextSplitter

from ..config import get_settings, current_user_id

EXPECTED_EMBED_DIM = 3072

def _extract_index_dimension(pc: Pinecone, index_name: str) -> int | None:
    try:
        info = pc.describe_index(index_name)
        if hasattr(info, "dimension"):
            return int(info.dimension)
        if isinstance(info, dict) and "dimension" in info:
            return int(info["dimension"])
    except Exception:
        pass
    return None

@lru_cache(maxsize=1)
def _get_vector_store() -> PineconeVectorStore:
    settings = get_settings()
    pc = Pinecone(api_key=settings.pinecone_api_key)
    
    index_dim = _extract_index_dimension(pc, settings.pinecone_index_name)
    if index_dim is not None and index_dim != EXPECTED_EMBED_DIM:
        raise RuntimeError("Pinecone index dimension mismatch.")

    index = pc.Index(settings.pinecone_index_name)
    embeddings = OpenAIEmbeddings(
        model=settings.openai_embedding_model_name,
        api_key=settings.openai_api_key,
    )
    return PineconeVectorStore(index=index, embedding=embeddings)


def get_retriever(
    k: int | None = None,
    search_type: str = "similarity",
    fetch_k: Optional[int] = None,
    lambda_mult: Optional[float] = None,
    *,
    document_scope: str | None = None,
):
    settings = get_settings()
    if k is None:
        k = settings.retrieval_k

    vector_store = _get_vector_store()
    
    # ---------------------------------------------------------
    # FEATURE: Mandatory Multitenant Filtering
    # ---------------------------------------------------------
    user_id = current_user_id.get()
    if not user_id:
        raise RuntimeError("FATAL: Attempted vector search without an authenticated user_id.")

    # Every single search is hard-locked to this user's data
    filter_dict: Dict[str, Any] = {"user_id": user_id}

    if document_scope:
        # Reconstruct the multi-tenant file path so Pinecone metadata matches
        exact_source_path = str(Path(f"data/uploads/{user_id}/{document_scope}"))
        filter_dict["source"] = exact_source_path

    search_kwargs: Dict[str, Any] = {"k": k, "filter": filter_dict}

    if fetch_k is not None:
        search_kwargs["fetch_k"] = fetch_k
    if lambda_mult is not None:
        search_kwargs["lambda_mult"] = lambda_mult

    return vector_store.as_retriever(search_type=search_type, search_kwargs=search_kwargs)


def retrieve(
    query: str,
    k: int | None = None,
    search_type: str = "similarity",
    fetch_k: Optional[int] = None,
    lambda_mult: Optional[float] = None,
    *,
    document_scope: str | None = None,
) -> List[Document]:
    retriever = get_retriever(
        k=k,
        search_type=search_type,
        fetch_k=fetch_k,
        lambda_mult=lambda_mult,
        document_scope=document_scope,
    )
    return retriever.invoke(query)


def index_documents(docs: List[Document]) -> int:
    if not docs:
        return 0

    # ---------------------------------------------------------
    # FEATURE: Tagging Documents for Multitenancy
    # ---------------------------------------------------------
    user_id = current_user_id.get()
    if not user_id:
        raise RuntimeError("FATAL: Attempted to index documents without an authenticated user_id.")

    # Inject the user_id into the metadata BEFORE chunking. 
    # LangChain's splitter will carry this metadata down to every single chunk.
    for doc in docs:
        doc.metadata["user_id"] = user_id

    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = splitter.split_documents(docs)

    vector_store = _get_vector_store()
    try:
        vector_store.add_documents(chunks)
    except PineconeApiException as e:
        raise RuntimeError(f"Pinecone upsert failed: {e}") from e

    return len(chunks)


def delete_user_vectors() -> None:
    """
    Deletes ONLY the vectors belonging to the currently authenticated user.
    """
    settings = get_settings()
    user_id = current_user_id.get()
    if not user_id:
        raise RuntimeError("Cannot clear vectors: No active user context.")

    pc = Pinecone(api_key=settings.pinecone_api_key)
    index = pc.Index(settings.pinecone_index_name)

    try:
        # Pinecone allows destructive actions safely gated by metadata filters
        index.delete(filter={"user_id": user_id})
    except PineconeApiException as e:
        raise RuntimeError(f"Pinecone delete_user_vectors failed: {e}") from e


def delete_specific_vectors(filenames: List[str]) -> None:
    """
    Deletes specific vectors from Pinecone based on the filenames.
    """
    if not filenames:
        return
        
    settings = get_settings()
    user_id = current_user_id.get()
    
    if not user_id:
        raise RuntimeError("Cannot clear vectors: No active user context.")

    pc = Pinecone(api_key=settings.pinecone_api_key)
    index = pc.Index(settings.pinecone_index_name)

    # Reconstruct the exact source paths that were injected during indexing
    sources = [str(Path(f"data/uploads/{user_id}/{fname}")) for fname in filenames]

    try:
        # Pinecone allows filtering by multiple values using the "$in" operator
        index.delete(filter={
            "user_id": user_id,
            "source": {"$in": sources}
        })
    except PineconeApiException as e:
        raise RuntimeError(f"Pinecone targeted delete failed: {e}") from e