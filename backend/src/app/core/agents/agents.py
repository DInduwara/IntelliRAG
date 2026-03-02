from __future__ import annotations

import re

from typing import Any, Dict, List

from langchain.agents import create_agent
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

from ..llm.factory import create_chat_model
from .prompts import (
    RETRIEVAL_SYSTEM_PROMPT,
    SUMMARIZATION_SYSTEM_PROMPT,
    VERIFICATION_SYSTEM_PROMPT,
    PLANNING_SYSTEM_PROMPT
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

planning_agent = create_agent(
    model=create_chat_model(),
    tools=[], 
    system_prompt=PLANNING_SYSTEM_PROMPT,
)

def planning_node(state: QAState) -> QAState:
    """
    NEW NODE: Strategizes before searching.
    Parses the AI's response to extract a plan and a list of sub-questions.
    """
    question = state["question"]
    result = planning_agent.invoke({"messages": [HumanMessage(content=question)]})
    raw_output = _extract_last_ai_content(result.get("messages", []))
    
    # Use Regex to slpit the "PLAN" and "list of sub question"
    plan_match = re.search(r"PLAN:(.*?)QUESTIONS:", raw_output, re.DOTALL | re.IGNORECASE)
    questions_match = re.findall(r"-\s*(.*)", raw_output)
    
    plan = plan_match.group(1).strip() if plan_match else "General search"
    sub_questions = questions_match if questions_match else [question]

    return {**state, "plan": plan, "sub_questions": sub_questions}

def retrieval_node(state: QAState) -> QAState:
    # Use sub_questions if they exist, otherwise fallback to the main question
    queries = state.get("sub_questions") or [state["question"]]
    
    all_context = []
    combined_citations = {}

    for query in queries:
        # We loop retrieval for each sub-question to ensure we cover all topics
        result = retrieval_agent.invoke({"messages": [HumanMessage(content=query)]})
        messages = result.get("messages", []) or []
        tool_msgs = [m for m in messages if isinstance(m, ToolMessage)]

        if tool_msgs:
            last_tool = tool_msgs[-1]
            all_context.append(str(last_tool.content))
            
            # Merge citations from different sub-searches into one master map
            artifact = last_tool.artifact
            if isinstance(artifact, dict):
                combined_citations.update(artifact)

    # Join all retrieved chunks with double spacing
    return {
        **state, 
        "context": "\n\n".join(all_context), 
        "citations": combined_citations
    }

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
