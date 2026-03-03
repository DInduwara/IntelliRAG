"""
Multi-Agent Implementation Module
"""
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
    PLANNING_SYSTEM_PROMPT,
    CONTEXT_CRITIC_SYSTEM_PROMPT # <-- Imported new prompt
)
from .state import QAState
from .tools import retrieval_tool


def _extract_last_ai_content(messages: List[object]) -> str:
    for msg in reversed(messages):
        if isinstance(msg, AIMessage):
            return str(msg.content)
    return ""

# ==============================================================================
# Agent Initialization
# ==============================================================================

retrieval_agent = create_agent(
    model=create_chat_model(),
    tools=[retrieval_tool],
    system_prompt=RETRIEVAL_SYSTEM_PROMPT,
)

# FEATURE 3: Initialize the Critic Agent
context_critic_agent = create_agent(
    model=create_chat_model(),
    tools=[], # The critic just thinks, it doesn't search
    system_prompt=CONTEXT_CRITIC_SYSTEM_PROMPT,
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

# ==============================================================================
# Graph Nodes
# ==============================================================================

def planning_node(state: QAState) -> QAState:
    question = state["question"]
    result = planning_agent.invoke({"messages": [HumanMessage(content=question)]})
    raw_output = _extract_last_ai_content(result.get("messages", []))
    
    plan_match = re.search(r"PLAN:(.*?)QUESTIONS:", raw_output, re.DOTALL | re.IGNORECASE)
    questions_match = re.findall(r"-\s*(.*)", raw_output)
    
    plan = plan_match.group(1).strip() if plan_match else "General search"
    sub_questions = questions_match if questions_match else [question]
    return {**state, "plan": plan, "sub_questions": sub_questions}


def retrieval_node(state: QAState) -> QAState:
    queries = state.get("sub_questions") or [state["question"]]
    all_context = []
    combined_citations = {}
    traces = [] 

    for i, query in enumerate(queries):
        result = retrieval_agent.invoke({"messages": [HumanMessage(content=query)]})
        messages = result.get("messages", []) or []
        tool_msgs = [m for m in messages if isinstance(m, ToolMessage)]

        if tool_msgs:
            last_tool = tool_msgs[-1]
            artifact = getattr(last_tool, "artifact", {})
            structured_block = f"=== RETRIEVAL CALL {i+1} (query: '{query}') ===\n{last_tool.content}"
            all_context.append(structured_block)
            
            if isinstance(artifact, dict):
                combined_citations.update(artifact)
                sources = list(set([meta.get("source", "unknown") for meta in artifact.values()]))
                traces.append({
                    "call_number": i + 1,
                    "query": query,
                    "chunks_count": len(artifact),
                    "sources": sources
                })

    return {
        **state, 
        "context": "\n\n".join(all_context), 
        "citations": combined_citations,
        "retrieval_traces": traces
    }

def context_critic_node(state: QAState) -> QAState:
    """
    FEATURE 3: Context Critic Node
    Evaluates raw retrieved context, filters out irrelevant chunks, and passes 
    only high-quality data forward to the summarization agent.
    """
    question = state["question"]
    raw_context = state.get("context") or ""

    # If nothing was retrieved, skip the critic to save time and tokens
    if not raw_context.strip():
        return {**state, "raw_context": raw_context, "context_rationale": "No context retrieved."}

    user_content = f"Question:\n{question}\n\nCONTEXT:\n{raw_context}"
    
    result = context_critic_agent.invoke({"messages": [HumanMessage(content=user_content)]})
    critic_output = _extract_last_ai_content(result.get("messages", []) or [])

    # Use Regex to safely extract the RATIONALE and the FILTERED_CONTEXT blocks
    rationale_match = re.search(r"RATIONALE:(.*?)FILTERED_CONTEXT:", critic_output, re.DOTALL | re.IGNORECASE)
    filtered_context_match = re.search(r"FILTERED_CONTEXT:(.*)", critic_output, re.DOTALL | re.IGNORECASE)

    rationale = rationale_match.group(1).strip() if rationale_match else "Critic evaluated chunks."
    
    # Fallback Mechanism: If the LLM failed to format the response correctly, 
    # we default to passing the raw context so the pipeline doesn't crash.
    filtered_context = filtered_context_match.group(1).strip() if filtered_context_match else raw_context

    # Ensure we don't accidentally pass an empty string if it filtered everything.
    # We still need to pass an empty state so the Answer Writer knows it has no data.
    if not filtered_context.strip():
        filtered_context = ""

    return {
        **state, 
        "raw_context": raw_context,         # Save the unfiltered data
        "context": filtered_context,        # Overwrite context with the clean data
        "context_rationale": rationale      # Save the critic's reasoning
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
