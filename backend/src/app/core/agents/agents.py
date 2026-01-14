"""Agent implementations for the multi-agent RAG flow."""

from typing import List, Any, Dict

from langchain.agents import create_agent
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
from langchain_core.documents import Document

from ..llm.factory import create_chat_model
from .prompts import (
    RETRIEVAL_SYSTEM_PROMPT,
    SUMMARIZATION_SYSTEM_PROMPT,
    VERIFICATION_SYSTEM_PROMPT,
)
from .state import QAState
from .tools import retrieval_tool


def _extract_last_ai_content(messages: List[object]) -> str:
    for msg in reversed(messages):
        if isinstance(msg, AIMessage):
            return str(msg.content)
    return ""


def _docs_to_sources(docs: List[Document]) -> List[Dict[str, Any]]:
    sources: List[Dict[str, Any]] = []
    for d in docs:
        sources.append(
            {
                "text": (d.page_content or "")[:300],
                "metadata": d.metadata or {},
            }
        )
    return sources


retrieval_agent = create_agent(
    model=create_chat_model(),
    tools=[retrieval_tool],
    system_prompt=RETRIEVAL_SYSTEM_PROMPT,
)

summarization_agent = create_agent(
    model=create_chat_model(),
    tools=[],
    system_prompt=SUMMARIZATION_SYSTEM_PROMPT,
)

verification_agent = create_agent(
    model=create_chat_model(),
    tools=[],
    system_prompt=VERIFICATION_SYSTEM_PROMPT,
)


def retrieval_node(state: QAState) -> QAState:
    question = state["question"]

    result = retrieval_agent.invoke({"messages": [HumanMessage(content=question)]})
    messages = result.get("messages", [])

    context = ""
    sources = None

    for msg in reversed(messages):
        if isinstance(msg, ToolMessage):
            context = str(msg.content)

            docs = getattr(msg, "artifact", None)
            if isinstance(docs, list) and all(isinstance(x, Document) for x in docs):
                sources = _docs_to_sources(docs)
            break

    return {
        "context": context,
        "sources": sources,
    }


def summarization_node(state: QAState) -> QAState:
    question = state["question"]
    context = state.get("context") or ""

    user_content = f"Question: {question}\n\nContext:\n{context}"

    result = summarization_agent.invoke({"messages": [HumanMessage(content=user_content)]})
    messages = result.get("messages", [])
    draft_answer = _extract_last_ai_content(messages)

    return {
        "draft_answer": draft_answer,
    }


def verification_node(state: QAState) -> QAState:
    question = state["question"]
    context = state.get("context") or ""
    draft_answer = state.get("draft_answer") or ""

    user_content = (
        f"Question: {question}\n\n"
        f"Context:\n{context}\n\n"
        f"Draft Answer:\n{draft_answer}\n\n"
        "Please verify and correct the draft answer, removing any unsupported claims."
    )

    result = verification_agent.invoke({"messages": [HumanMessage(content=user_content)]})
    messages = result.get("messages", [])
    answer = _extract_last_ai_content(messages)

    return {
        "answer": answer,
    }
