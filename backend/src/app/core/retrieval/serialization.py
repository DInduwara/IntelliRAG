"""Utilities for serializing retrieved document chunks with stable IDs."""

from __future__ import annotations

import hashlib
from typing import Dict, List, Tuple

from langchain_core.documents import Document


def _stable_chunk_hash(source: str, page_label: str, text: str) -> str:
    """
    Deterministic short hash for a chunk.
    Keeps IDs stable across runs as long as (source, page_label, text) are the same.
    """
    raw = f"{source}||{page_label}||{text}".encode("utf-8", errors="ignore")
    return hashlib.sha1(raw).hexdigest()[:8]  # 8 chars is enough for IDs


def serialize_chunks_with_ids(docs: List[Document]) -> Tuple[str, Dict[str, dict]]:
    """
    Serialize documents into a citation-aware CONTEXT string.

    ID format: P{page_label}-C{hash8}
      - page_label comes from PDF page label if available (often 1-based)
      - hash8 is deterministic per chunk content

    Returns:
        context_str: formatted context with chunk IDs
        citations: chunk_id -> metadata mapping (for API/UI)
    """
    context_parts: List[str] = []
    citations: Dict[str, dict] = {}

    for doc in docs:
        metadata = doc.metadata or {}

        page = metadata.get("page", "unknown")
        page_label = metadata.get("page_label", page)
        source = metadata.get("source", "unknown")

        text = (doc.page_content or "").strip()

        chunk_hash = _stable_chunk_hash(str(source), str(page_label), text)
        chunk_id = f"P{page_label}-C{chunk_hash}"

        context_parts.append(f"[{chunk_id}] Chunk from page {page}:\n{text}")

        citations[chunk_id] = {
            "page": page,
            "page_label": page_label,
            "source": source,
            "snippet": (text[:150] + "...") if len(text) > 150 else text,
            "text": text,
        }

    return "\n\n".join(context_parts), citations
