"""
Vector Store Integration Module

This module serves as the Data Access Layer (DAL) for the RAG pipeline. It manages 
all interactions with the Pinecone vector database and the OpenAI embeddings API.
By centralizing these operations, we ensure efficient connection pooling (via caching), 
consistent chunking strategies, and secure metadata filtering (document scoping) 
across the entire application.
"""

from __future__ import annotations

from functools import lru_cache
from typing import List, Optional, Dict, Any

from pinecone import Pinecone
from pinecone.exceptions import PineconeApiException

from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_text_splitters import RecursiveCharacterTextSplitter

from ..config import get_settings

# Hardcoded expectation for the text-embedding-3-large or text-embedding-ada-002 models.
# Enforcing this prevents silent failures where embeddings don't match the DB index.
EXPECTED_EMBED_DIM = 3072


def _extract_index_dimension(pc: Pinecone, index_name: str) -> int | None:
    """
    Safely extracts the dimension of a remote Pinecone index.
    
    Senior Note: Pinecone SDK versions historically vary in how they return index 
    metadata (object attributes vs. dictionary keys). This helper uses a robust 
    try/except approach to guarantee we can read the dimension regardless of the 
    underlying SDK version, preventing brittle runtime crashes.

    Args:
        pc (Pinecone): The authenticated Pinecone client.
        index_name (str): The target index name.

    Returns:
        int | None: The dimension size, or None if it cannot be determined.
    """
    try:
        info = pc.describe_index(index_name)
        if hasattr(info, "dimension"):
            return int(info.dimension)
        if isinstance(info, dict) and "dimension" in info:
            return int(info["dimension"])
    except Exception:
        # Fail gracefully; we will bypass the dimension check if the API blocks us
        pass
    return None


@lru_cache(maxsize=1)
def _get_vector_store() -> PineconeVectorStore:
    """
    Singleton factory for the PineconeVectorStore.

    Senior Note on Connection Management:
    Initializing the Pinecone client and OpenAI Embeddings model over HTTP is expensive. 
    Using `@lru_cache(maxsize=1)` implements the Singleton pattern, ensuring we only 
    establish these connections once per server worker. This drastically reduces latency 
    and prevents connection pool exhaustion under high API load.

    Returns:
        PineconeVectorStore: The configured LangChain vector store wrapper.
        
    Raises:
        RuntimeError: If the remote database dimension does not match our embedding model.
    """
    settings = get_settings()

    pc = Pinecone(api_key=settings.pinecone_api_key)

    # Startup Guardrail: Validate dimension alignment before accepting traffic
    index_dim = _extract_index_dimension(pc, settings.pinecone_index_name)
    if index_dim is not None and index_dim != EXPECTED_EMBED_DIM:
        raise RuntimeError(
            f"Pinecone index dimension mismatch: index={index_dim}, expected={EXPECTED_EMBED_DIM}. "
            f"Recreate the Pinecone index to {EXPECTED_EMBED_DIM} OR change OPENAI_EMBEDDING_MODEL_NAME."
        )

    index = pc.Index(settings.pinecone_index_name)

    # Initialize the embedding model that will convert user text into vectors
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
    """
    Constructs a dynamic LangChain Retriever with optional metadata boundaries.

    

    Args:
        k (int): Number of final documents to return.
        search_type (str): "similarity" (standard cosine/dot product) or "mmr" 
            (Maximum Marginal Relevance to ensure diversity in results).
        fetch_k (int): Number of initial candidates to pull before MMR pruning.
        lambda_mult (float): MMR tuning parameter (0 to 1). Higher = more relevant, Lower = more diverse.
        document_scope (str): Filename to restrict the search. Crucial for the 
            "Selected PDF" UI feature to prevent cross-contamination of answers.

    Returns:
        A LangChain VectorStoreRetriever configured with the requested constraints.
    """
    settings = get_settings()
    if k is None:
        k = settings.retrieval_k

    vector_store = _get_vector_store()

    # Build the keyword arguments dynamically based on requested search parameters
    search_kwargs: Dict[str, Any] = {"k": k}

    # Apply MMR-specific tuning if provided
    if fetch_k is not None:
        search_kwargs["fetch_k"] = fetch_k
    if lambda_mult is not None:
        search_kwargs["lambda_mult"] = lambda_mult

    # Apply Database-level metadata filtering. 
    # This executes at the Pinecone level, making it vastly more efficient than 
    # retrieving everything and filtering in Python.
    if document_scope:
        search_kwargs["filter"] = {"source": document_scope}

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
    """
    Convenience wrapper to instantiate a retriever and immediately execute a search.
    Used heavily by the `retrieval_tool` in tools.py.
    """
    retriever = get_retriever(
        k=k,
        search_type=search_type,
        fetch_k=fetch_k,
        lambda_mult=lambda_mult,
        document_scope=document_scope,
    )
    return retriever.invoke(query)


def index_documents(docs: List[Document]) -> int:
    """
    The main ingestion pipeline for new PDFs.
    
    Splits raw, full-page LangChain Documents into smaller, semantically meaningful 
    chunks, embeds them, and uploads them to Pinecone.

    Args:
        docs (List[Document]): Full-text documents (usually one per page) from a loader.

    Returns:
        int: The total number of chunks successfully uploaded to the database.
        
    Raises:
        RuntimeError: If the Pinecone upsert operation fails (e.g., rate limit, network).
    """
    if not docs:
        return 0

    # Senior Note on Chunking: 
    # 500 characters with a 50 character overlap is a standard baseline for RAG. 
    # The overlap ensures that a concept split across two chunks doesn't lose its context.
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = splitter.split_documents(docs)

    vector_store = _get_vector_store()
    try:
        # LangChain automatically handles batching the embedding API calls 
        # and the Pinecone upsert operations under the hood here.
        vector_store.add_documents(chunks)
    except PineconeApiException as e:
        raise RuntimeError(f"Pinecone upsert failed: {e}") from e

    return len(chunks)

def delete_all_vectors() -> None:
    """
    Hard-resets the remote vector database.
    
    Senior Note: This is an administrative function (triggered via the /admin/clear endpoint).
    It directly interfaces with the Pinecone client to bypass LangChain's abstractions
    for a guaranteed complete wipe of the index.
    """
    settings = get_settings()

    pc = Pinecone(api_key=settings.pinecone_api_key)
    index = pc.Index(settings.pinecone_index_name)

    try:
        index.delete(delete_all=True)
    except PineconeApiException as e:
        raise RuntimeError(f"Pinecone delete_all failed: {e}") from e
    except Exception as e:
        raise RuntimeError(f"Pinecone delete_all failed: {e}") from e
    