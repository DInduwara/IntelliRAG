"""
LLM Factory Module

This module implements the Factory Design Pattern for instantiating Large Language Models.
By centralizing LLM creation here, we decouple the multi-agent logic (in agents.py) from the 
specifics of the model provider (e.g., OpenAI). 

This architectural choice ensures consistent configuration (like model targets and API keys) 
across the entire LangGraph pipeline and makes swapping providers or mocking the LLM for 
unit testing incredibly straightforward.
"""

from langchain_openai import ChatOpenAI

from ..config import get_settings


def create_chat_model(temperature: float = 0.0) -> ChatOpenAI:
    """
    Instantiates and configures a LangChain ChatOpenAI client.

    This factory method retrieves the necessary credentials and target model name 
    from the application's environment configuration singleton. 

    Senior Note on Temperature:
    The default temperature is strictly set to 0.0. In Enterprise RAG (Retrieval-
    Augmented Generation) systems, we require high determinism and factual accuracy. 
    A temperature of 0.0 minimizes the model's "creativity," significantly reducing 
    the risk of hallucinations when extracting claims from vector chunks.

    Args:
        temperature (float): Controls the randomness/creativity of the model's output. 
            Defaults to 0.0 for maximum determinism.

    Returns:
        ChatOpenAI: A fully configured LangChain chat model instance ready to be 
            bound to tools or invoked by our specific graph nodes.
    """
    # Fetch environment-aware configuration (e.g., loaded from .env or OS env vars).
    # Using a centralized getter ensures we always use validated settings.
    settings = get_settings()
    
    # Initialize the LangChain wrapper with our validated credentials.
    return ChatOpenAI(
        model=settings.openai_model_name,
        api_key=settings.openai_api_key,
        temperature=temperature,
    )
    