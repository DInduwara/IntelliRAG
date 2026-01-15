from __future__ import annotations

from typing import Any, Dict, List

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

    messages = result.get("messages", []) or []
    tool_msgs = [m for m in messages if isinstance(m, ToolMessage)]

    if tool_msgs:
        last_tool = tool_msgs[-1]
        context = str(last_tool.content)

        artifact = last_tool.artifact

        # retrieval_tool returns (context, citations) -> artifact IS the citations dict
        if isinstance(artifact, dict):
            citations = artifact
        else:
            citations = {}

    return {**state, "context": context, "citations": citations}


def summarization_node(state: QAState) -> QAState:
    question = state["question"]
    context = state.get("context") or ""

    user_content = (
        f"Question:\n{question}\n\n"
        f"CONTEXT:\n{context}\n"
    )

    result = summarization_agent.invoke({"messages": [HumanMessage(content=user_content)]})
    draft_answer = _extract_last_ai_content(result.get("messages", []) or [])

    return {**state, "draft_answer": draft_answer}


def verification_node(state: QAState) -> QAState:
    question = state["question"]
    context = state.get("context") or ""
    draft_answer = state.get("draft_answer") or ""

    user_content = f"""
Question:
{question}

CONTEXT:
{context}

Draft Answer:
{draft_answer}
""".strip()

    result = verification_agent.invoke({"messages": [HumanMessage(content=user_content)]})
    answer = _extract_last_ai_content(result.get("messages", []) or [])

    return {**state, "answer": answer}
