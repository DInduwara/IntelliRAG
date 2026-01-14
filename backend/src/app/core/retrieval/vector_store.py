"""Vector store wrapper for Pinecone integration with LangChain."""

from functools import lru_cache
from typing import List, Any

from pinecone import Pinecone
from pinecone.exceptions import PineconeApiException

from langchain_core.documents import Document
from langchain_pinecone import PineconeVectorStore
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from ..config import get_settings

#  locked to text-embedding-3-large
EXPECTED_EMBED_DIM = 3072


def _extract_index_dimension(pc: Pinecone, index_name: str) -> int | None:
    """
    Pinecone SDK versions differ a bit.
    Try multiple ways to get dimension, return None if not found.
    """
    try:
        info = pc.describe_index(index_name)
        # could be object with .dimension or dict with ["dimension"]
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

    #  dimension guard (fast fail)
    index_dim = _extract_index_dimension(pc, settings.pinecone_index_name)
    if index_dim is not None and index_dim != EXPECTED_EMBED_DIM:
        raise RuntimeError(
            f"Pinecone index dimension mismatch: index={index_dim}, expected={EXPECTED_EMBED_DIM}. "
            f"You must recreate Pinecone index to {EXPECTED_EMBED_DIM} OR change OPENAI_EMBEDDING_MODEL_NAME."
        )

    index = pc.Index(settings.pinecone_index_name)

    embeddings = OpenAIEmbeddings(
        model=settings.openai_embedding_model_name,
        api_key=settings.openai_api_key,
    )

    return PineconeVectorStore(index=index, embedding=embeddings)


def get_retriever(k: int | None = None):
    settings = get_settings()
    if k is None:
        k = settings.retrieval_k
    vector_store = _get_vector_store()
    return vector_store.as_retriever(search_kwargs={"k": k})


def retrieve(query: str, k: int | None = None) -> List[Document]:
    retriever = get_retriever(k=k)
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
        # make Pinecone errors clearer (esp dimension mismatch)
        raise RuntimeError(f"Pinecone upsert failed: {e}") from e

    return len(chunks)
