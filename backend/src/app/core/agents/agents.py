from typing import List, Dict, Any

from langchain.agents import create_agent
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

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

    context = ""
    citations: Dict[str, Any] = {}

    for msg in reversed(result.get("messages", [])):
        if isinstance(msg, ToolMessage):
            context = str(msg.content)
            citations = msg.artifact or {}
            break

    return {
        **state,
        "context": context,
        "citations": citations,
    }


def summarization_node(state: QAState) -> QAState:
    question = state["question"]
    context = state.get("context", "")

    user_content = (
        f"Question:\n{question}\n\n"
        f"Context (use citations exactly as provided):\n{context}\n"
    )

    result = summarization_agent.invoke({"messages": [HumanMessage(content=user_content)]})
    draft_answer = _extract_last_ai_content(result.get("messages", []))

    return {
        **state,
        "draft_answer": draft_answer,
    }


def verification_node(state: QAState) -> QAState:
    question = state["question"]
    context = state.get("context", "")
    draft_answer = state.get("draft_answer", "")

    user_content = f"""
Question:
{question}

Context:
{context}

Draft Answer (with citations):
{draft_answer}

Rules:
- Preserve valid citations like [C1], [C2]
- Remove citations if the claim is removed
- Do NOT invent new citations
"""

    result = verification_agent.invoke({"messages": [HumanMessage(content=user_content)]})
    answer = _extract_last_ai_content(result.get("messages", []))

    return {
        **state,
        "answer": answer,
    }
