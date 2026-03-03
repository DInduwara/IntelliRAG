"""
Configuration Management Module

This module serves as the single source of truth for the application's environment 
variables and runtime configuration. By utilizing Pydantic's BaseSettings, we gain 
automatic type validation and parsing.

Architectural Principle: "Fail-Fast"
If critical credentials (like API keys) are missing from the environment, Pydantic 
will raise a ValidationError immediately upon startup, preventing the server from 
booting in a broken state.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Core settings schema mapping environment variables to Python types.
    
    Pydantic automatically reads environment variables matching these attribute names 
    (case-insensitive by default). For example, 'OPENAI_API_KEY' in the .env file 
    will automatically populate the `openai_api_key` attribute.
    """
    
    # --------------------------------------------------------------------------
    # OpenAI Configuration
    # --------------------------------------------------------------------------
    # Required: The application will not start without this key.
    openai_api_key: str
    
    # Senior Note: gpt-4o-mini is chosen for its excellent balance of low latency, 
    # cost-effectiveness, and high proficiency in function calling (LangGraph tools).
    openai_model_name: str = "gpt-4o-mini"

    # IMPORTANT: use OPENAI_EMBEDDING_MODEL_NAME in .env
    # The default 'text-embedding-3-large' outputs vectors with 3072 dimensions. 
    # The Pinecone index MUST be created with this exact dimension size.
    openai_embedding_model_name: str = "text-embedding-3-large"

    # --------------------------------------------------------------------------
    # Pinecone Configuration
    # --------------------------------------------------------------------------
    # Required vectors database credentials.
    pinecone_api_key: str
    pinecone_index_name: str

    # --------------------------------------------------------------------------
    # Retrieval Configuration
    # --------------------------------------------------------------------------
    # Defines the default number of chunks to fetch per query if not overridden.
    retrieval_k: int = 4

    # --------------------------------------------------------------------------
    # Frontend / CORS
    # --------------------------------------------------------------------------
    # Used by FastAPI's CORSMiddleware to strict-allow requests only from the frontend.
    frontend_origin: str = "http://localhost:3000"

    # --------------------------------------------------------------------------
    # Admin / Maintenance
    # --------------------------------------------------------------------------
    # This will protect endpoints like "clear all documents"
    # By defaulting to None, destructive endpoints will be safely locked down 
    # unless an admin specifically configures this key.
    admin_key: str | None = None

    # Instructs Pydantic on how to load and parse the environment variables.
    model_config = SettingsConfigDict(
        env_file=".env",              # Fallback file for local development
        env_file_encoding="utf-8",    # Ensure standard text encoding
        case_sensitive=False,         # Allows 'OPENAI_API_KEY' to match 'openai_api_key'
        extra="ignore",               # Ignore unrelated OS environment variables silently
    )


# Global variable to hold the cached singleton instance of our settings.
_settings: Settings | None = None


def get_settings() -> Settings:
    """
    Dependency Injector / Singleton Getter for Application Settings.

    Senior Note: 
    Reading from disk (.env) and parsing environment variables takes I/O time. 
    By using the Singleton pattern here, we only instantiate the Settings class once 
    during the application's lifecycle. Every subsequent call simply returns the 
    cached memory reference, ensuring sub-millisecond access times.

    Returns:
        Settings: The validated configuration object.
    """
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
