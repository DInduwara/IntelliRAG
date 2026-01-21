"""Tools available to agents in the multi-agent RAG system."""

from __future__ import annotations

from typing import Dict, List, Tuple

from langchain_core.documents import Document
from langchain_core.tools import tool

from ..retrieval.serialization import serialize_chunks_with_ids
from ..retrieval.vector_store import retrieve


def _doc_dedupe_key(doc: Document) -> str:
    """
    Create a deterministic key for a document chunk to remove duplicates.

    Why:
    - Splitters often create overlapping chunks
    - Retrieval may return repeated chunks across queries
    """
    md = doc.metadata or {}
    source = str(md.get("source", "unknown"))
    page_label = str(md.get("page_label", md.get("page", "unknown")))
    text = (doc.page_content or "").strip()

    # A simple deterministic key (good enough for dedupe)
    # If two chunks are identical in these fields, we treat them as duplicates.
    return f"{source}||{page_label}||{text}"


def _dedupe_docs(docs: List[Document]) -> List[Document]:
    """Remove exact duplicates based on _doc_dedupe_key."""
    seen = set()
    out: List[Document] = []
    for d in docs:
        key = _doc_dedupe_key(d)
        if key in seen:
            continue
        seen.add(key)
        out.append(d)
    return out


@tool(response_format="content_and_artifact")
def retrieval_tool(query: str):
    """
    Retrieve relevant document chunks with citation IDs.

    Args:
        query:
            The user's question (or sub-question).
        document_scope:
            If provided, restrict retrieval to chunks where metadata["source"] == document_scope.
            This prevents citations from older PDFs.

    Returns:
        content:
            Citation-aware context string.
        artifact:
            Citation map (chunk_id -> metadata).
    """
    fetch_k = 12
    top_n = 6

    docs = retrieve(query, k=fetch_k)

    # Remove identical/duplicate chunks (often happens across overlapping splits)
    docs = _dedupe_docs(docs)

    # Keep only top_n after dedupe (preserves original ordering from retriever)
    docs = docs[:top_n]

    context, citations = serialize_chunks_with_ids(docs)

    return context, citations
