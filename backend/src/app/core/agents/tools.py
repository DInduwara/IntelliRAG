"""
Agent Tools Module

This module defines the callable tools available to the LangChain agents within 
our multi-agent RAG system. The primary tool is the `retrieval_tool`, which interfaces 
with the vector database (Pinecone). 

Crucially, this module handles "document scoping" (allowing users to search across 
all documents or isolate a specific PDF) and "chunk deduplication" to maximize the 
context window efficiency and prevent the LLM from processing redundant information.
"""

from __future__ import annotations

from typing import List, Optional

from langchain_core.documents import Document
from langchain_core.tools import tool

from ..retrieval.serialization import serialize_chunks_with_ids
from ..retrieval.vector_store import retrieve


def _doc_dedupe_key(doc: Document) -> str:
    """
    Generates a deterministic, unique hashing key for a retrieved document chunk.

    Why this is critical for Enterprise RAG:
    1. Text Splitters often create overlapping chunks (chunk overlap) to preserve context.
    2. Multi-query retrieval (from our Planning Agent) might return the exact same 
       highly-relevant chunk for two different sub-questions.
    By deduplicating, we save token costs and prevent the Summarization LLM from 
    over-weighting repeated information.

    Args:
        doc (Document): A LangChain Document object containing page_content and metadata.

    Returns:
        str: A composite key string combining source, page label, and the actual text.
    """
    md = doc.metadata or {}
    
    # Safely extract metadata with fallbacks to avoid KeyError on poorly formatted PDFs
    source = str(md.get("source", "unknown"))
    page_label = str(md.get("page_label", md.get("page", "unknown")))
    text = (doc.page_content or "").strip()
    
    # Use a double-pipe separator to ensure clean boundaries between metadata and text
    return f"{source}||{page_label}||{text}"


def _dedupe_docs(docs: List[Document]) -> List[Document]:
    """
    Filters a list of documents to remove exact semantic duplicates.
    
    Uses an O(N) time complexity approach with a tracking set to preserve the 
    original ranking order returned by the vector store (which is sorted by relevance/score).

    Args:
        docs (List[Document]): The raw list of documents returned by the retriever.

    Returns:
        List[Document]: The deduplicated list of documents.
    """
    seen = set()
    out: List[Document] = []
    
    for d in docs:
        key = _doc_dedupe_key(d)
        if key in seen:
            continue
        seen.add(key)
        out.append(d)
        
    return out


# Senior Note: 'response_format="content_and_artifact"' is a powerful LangChain feature.
# It allows the tool to return a string (content) directly to the LLM for reasoning, 
# while simultaneously passing a structured object (artifact - our citations map) 
# invisibly to the LangGraph state for backend processing.
@tool(response_format="content_and_artifact")
def retrieval_tool(query: str, document_scope: Optional[str] = None):
    """
    Retrieves and formats highly relevant document chunks from the vector store.

    This tool is exposed to the Retrieval Agent. It translates the agent's natural 
    language query into a vector search, sanitizes the results, and formats them 
    with citation IDs required by the Summarization Agent.

    Args:
        query (str): The search query (either the main question or a decomposed sub-query).
        document_scope (Optional[str]): If provided, enforces metadata filtering at the 
            database level (e.g., {"source": {"$eq": document_scope}}). This guarantees 
            the LLM only sees data from the currently active PDF.

    Returns:
        Tuple[str, dict]: 
            - content (str): The string block of chunks prepended with IDs (e.g., "[chunk-1] Text...").
            - artifact (dict): A mapping dictionary of chunk IDs to their metadata, 
              used later by the Verification Node and the UI.
    """
    # Over-fetch strategy: Pull 12 documents from the database to ensure we have a rich 
    # pool of candidates, anticipating that some might be duplicates.
    fetch_k = 12
    # Truncation limit: Only pass the top 6 unique documents to the LLM to fit optimally 
    # within the context window and prevent "lost in the middle" syndrome.
    top_n = 6

    # Execute the vector search (Pinecone similarity search)
    docs = retrieve(query, k=fetch_k, document_scope=document_scope)

    # Sanitize the result pool
    docs = _dedupe_docs(docs)
    
    # Slice to strictly enforce our top_n token budget
    docs = docs[:top_n]

    # Convert the raw LangChain Document objects into our proprietary citation-aware format
    context, citations = serialize_chunks_with_ids(docs)
    
    # Return both the text for the LLM and the mapping dictionary for the StateGraph
    return context, citations