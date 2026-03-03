"""
Document Serialization and Citation Module

This module serves as the critical bridge between raw vector database results 
and the LLM's context window. It is responsible for transforming raw LangChain 
Document objects into a formatted string that the LLM can read, while simultaneously 
generating stable, deterministic citation IDs. 

These IDs are essential for the system's "hallucination filter" (Verification Agent) 
and for providing clickable, verifiable evidence cards in the frontend UI.
"""

from __future__ import annotations

import hashlib
from typing import Dict, List, Tuple

from langchain_core.documents import Document


def _stable_chunk_hash(source: str, page_label: str, text: str) -> str:
    """
    Generates a deterministic, short cryptographic hash for a document chunk.
    
    Why deterministic hashing instead of random UUIDs?
    1. UI Stability: If the user asks the same question or a follow-up, retrieving 
       the same chunk should yield the exact same citation ID (e.g., [P7-Ca1b2c3d]).
    2. Caching & Debugging: Stable IDs make it drastically easier to trace exactly 
       which vector chunk was retrieved across different server logs or test runs.

    Args:
        source (str): The origin filename or URI of the document.
        page_label (str): The logical page number or label (e.g., "vii" or "42").
        text (str): The actual content of the document chunk.

    Returns:
        str: An 8-character hex string representing the SHA-1 hash of the inputs.
    """
    # Combine the defining traits of the chunk into a single string.
    # We encode to utf-8 and ignore errors to prevent crashes on malformed PDF text.
    raw = f"{source}||{page_label}||{text}".encode("utf-8", errors="ignore")
    
    # SHA-1 is used here for speed, not cryptographic security.
    # Truncating to 8 characters provides sufficient collision resistance for 
    # the context window while keeping the LLM's token count low.
    return hashlib.sha1(raw).hexdigest()[:8]


def serialize_chunks_with_ids(docs: List[Document]) -> Tuple[str, Dict[str, dict]]:
    """
    Transforms retrieved documents into a citation-aware CONTEXT string and metadata map.

    This function fulfills two massive architectural roles:
    1. It builds the exact text payload injected into the Summarization Agent's prompt.
    2. It creates the 'citations map' artifact that the Verification Agent uses to 
       prove the LLM didn't hallucinate, which is then passed to the frontend Next.js app.

    Citation ID format: P{page_label}-C{hash8} (e.g., [P12-C8f9a0b1])
      - P{page_label}: Provides human-readable context to the LLM and User.
      - C{hash8}: Ensures strict uniqueness even if multiple chunks come from the same page.

    Args:
        docs (List[Document]): The top-K deduplicated chunks from the vector database.

    Returns:
        Tuple[str, Dict[str, dict]]:
            - context_str (str): The heavily formatted string given to the LLM.
            - citations (Dict): A mapping of generated chunk_ids to their full metadata.
    """
    context_parts: List[str] = []
    citations: Dict[str, dict] = {}

    for doc in docs:
        metadata = doc.metadata or {}

        # Safely extract metadata. 'page' is usually 0-indexed by loaders, 
        # while 'page_label' is the actual printed number on the document.
        page = metadata.get("page", "unknown")
        page_label = metadata.get("page_label", page)
        source = metadata.get("source", "unknown")

        text = (doc.page_content or "").strip()

        # Generate the deterministic ID for this specific chunk
        chunk_hash = _stable_chunk_hash(str(source), str(page_label), text)
        chunk_id = f"P{page_label}-C{chunk_hash}"

        # Format the chunk exactly as the SUMMARIZATION_SYSTEM_PROMPT expects it.
        # Example: "[P4-C12345678] Chunk from page 4:\nHere is the text..."
        context_parts.append(f"[{chunk_id}] Chunk from page {page}:\n{text}")

        # Build the artifact dictionary. 
        # We store a truncated 'snippet' to keep the JSON response payload lightweight 
        # for the frontend UI, but keep the full 'text' for backend verification.
        citations[chunk_id] = {
            "page": page,
            "page_label": page_label,
            "source": source,
            "snippet": (text[:150] + "...") if len(text) > 150 else text,
            "text": text,
        }

    # Join the individual chunk strings with double newlines to clearly 
    # delineate semantic boundaries for the LLM's attention mechanism.
    return "\n\n".join(context_parts), citations