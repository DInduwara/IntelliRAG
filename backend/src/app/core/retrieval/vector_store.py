"""Vector store wrapper for Pinecone integration with LangChain."""

from __future__ import annotations

from functools import lru_cache
from typing import List, Optional

from pinecone import Pinecone
from pinecone.exceptions import PineconeApiException

from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_text_splitters import RecursiveCharacterTextSplitter

from ..config import get_settings

EXPECTED_EMBED_DIM = 3072


def _extract_index_dimension(pc: Pinecone, index_name: str) -> int | None:
    """
    Pinecone SDK versions differ slightly.
    Try multiple ways to get dimension. Return None if not found.
    """
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
        raise RuntimeError(
            f"Pinecone index dimension mismatch: index={index_dim}, expected={EXPECTED_EMBED_DIM}. "
            f"Recreate the Pinecone index to {EXPECTED_EMBED_DIM} OR change OPENAI_EMBEDDING_MODEL_NAME."
        )

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
):
    """
    search_type:
      - "similarity" (default)
      - "mmr" (diversity-aware; can reduce repetitive chunks)

    fetch_k and lambda_mult apply mainly to MMR.
    """
    settings = get_settings()
    if k is None:
        k = settings.retrieval_k

    vector_store = _get_vector_store()

    search_kwargs = {"k": k}
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
) -> List[Document]:
    retriever = get_retriever(k=k, search_type=search_type, fetch_k=fetch_k, lambda_mult=lambda_mult)
    return retriever.invoke(query)


def index_documents(docs: List[Document]) -> int:
    """Index a list of Document objects into Pinecone."""
    if not docs:
        return 0

    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = splitter.split_documents(docs)

    vector_store = _get_vector_store()
    try:
        vector_store.add_documents(chunks)
    except PineconeApiException as e:
        raise RuntimeError(f"Pinecone upsert failed: {e}") from e

    return len(chunks)
