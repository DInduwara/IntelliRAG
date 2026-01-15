"""LangGraph orchestration for the linear multi-agent QA flow."""

from functools import lru_cache
from typing import Any, Dict

from langgraph.constants import END, START
from langgraph.graph import StateGraph

from .agents import retrieval_node, summarization_node, verification_node
from .state import QAState


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


def run_qa_flow(question: str) -> Dict[str, Any]:
    graph = get_qa_graph()

    initial_state: QAState = {
        "question": question,
        "context": None,
        "citations": None,
        "draft_answer": None,
        "answer": None,
    }

    final_state = graph.invoke(initial_state)
    return final_state
