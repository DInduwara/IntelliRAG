from __future__ import annotations

from functools import lru_cache
from typing import Any
import re

from langgraph.constants import END, START
from langgraph.graph import StateGraph

from .agents import retrieval_node, summarization_node, verification_node
from .state import QAState


_CITATION_RE = re.compile(r"\[([^\[\]\n]{1,40})\]")


def _extract_citation_ids(text: str) -> list[str]:
    return _CITATION_RE.findall(text or "")


def _dedupe_and_limit_per_sentence(answer: str, max_per_sentence: int = 2) -> str:
    answer = (answer or "").strip()
    if not answer:
        return answer

    sentences = re.split(r"(?<=[.!?])\s+", answer)
    cleaned: list[str] = []

    for s in sentences:
        ids = _extract_citation_ids(s)
        if not ids:
            cleaned.append(s)
            continue

        unique: list[str] = []
        for cid in ids:
            if cid not in unique:
                unique.append(cid)
            if len(unique) >= max_per_sentence:
                break

        s_no = _CITATION_RE.sub("", s).rstrip()
        s_fixed = (s_no + " " + "".join(f"[{cid}]" for cid in unique)).strip()
        cleaned.append(s_fixed)

    return " ".join(cleaned).strip()


def _remove_unknown_citations(answer: str, allowed_ids: set[str]) -> str:
    if not answer:
        return answer

    def repl(m: re.Match[str]) -> str:
        cid = m.group(1)
        return f"[{cid}]" if cid in allowed_ids else ""

    cleaned = _CITATION_RE.sub(repl, answer)
    cleaned = re.sub(r"\s{2,}", " ", cleaned).strip()
    return cleaned


def _compute_confidence(answer: str, allowed_ids: set[str]) -> str:
    ids = [cid for cid in _extract_citation_ids(answer) if cid in allowed_ids]
    unique = set(ids)

    if len(unique) >= 2:
        return "high"
    if len(unique) == 1:
        return "medium"
    return "low"


def create_qa_graph() -> Any:
    builder = StateGraph(QAState)

    builder.add_node("retrieval", retrieval_node)
    builder.add_node("summarization", summarization_node)
    builder.add_node("verification", verification_node)

    builder.add_edge(START, "retrieval")
    builder.add_edge("retrieval", "summarization")
    builder.add_edge("summarization", "verification")
    builder.add_edge("verification", END)

    return builder.compile()


@lru_cache(maxsize=1)
def get_qa_graph() -> Any:
    return create_qa_graph()


def run_qa_flow(question: str, document_scope: str | None = None) -> QAState:
    """
    Run LangGraph QA flow with optional document scoping.

    Args:
        question:
            User question.
        document_scope:
            If provided, retrieval is restricted to this specific PDF source.
    """
    graph = get_qa_graph()

    initial_state: QAState = {
        "question": question,
        "context": None,
        "citations": None,
        "draft_answer": None,
        "answer": None,
        "confidence": "low",
        "document_scope": document_scope,
    }

    final_state: QAState = graph.invoke(initial_state)

    citations_map = final_state.get("citations") or {}
    allowed_ids = set(citations_map.keys())

    answer = (final_state.get("answer") or "").strip()

    if allowed_ids:
        answer = _remove_unknown_citations(answer, allowed_ids)
        answer = _dedupe_and_limit_per_sentence(answer, max_per_sentence=2)

    confidence = _compute_confidence(answer, allowed_ids)

    final_state["answer"] = answer
    final_state["confidence"] = confidence
    return final_state
