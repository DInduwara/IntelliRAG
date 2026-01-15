"""Utilities for serializing retrieved document chunks with stable IDs."""

from __future__ import annotations

from typing import Dict, List, Tuple
from langchain_core.documents import Document


def serialize_chunks_with_ids(docs: List[Document]) -> Tuple[str, Dict[str, dict]]:
    """
    Serialize documents into a citation-aware CONTEXT string.

    IDs format: P{page_label}-C{idx}
      - page_label comes from PDF page label if available (often 1-based)
      - idx is the position within the retrieved list

    Returns:
        context_str: formatted context with chunk IDs
        citations: chunk_id -> metadata mapping (for API/UI)
    """
    context_parts: List[str] = []
    citations: Dict[str, dict] = {}

    for idx, doc in enumerate(docs, start=1):
        metadata = doc.metadata or {}

        page = metadata.get("page", "unknown")
        page_label = metadata.get("page_label", page)
        source = metadata.get("source", "unknown")

        text = (doc.page_content or "").strip()

        # ✅ stable id (page label first, then chunk number)
        chunk_id = f"P{page_label}-C{idx}"

        # Context block shown to agents
        context_parts.append(f"[{chunk_id}] Chunk from page {page}:\n{text}")

        # Citation metadata returned to frontend
        citations[chunk_id] = {
            "page": page,
            "page_label": page_label,
            "source": source,
            "snippet": (text[:150] + "...") if len(text) > 150 else text,
            "text": text,  # optional, helpful for UI “evidence viewer”
        }

    return "\n\n".join(context_parts), citations
