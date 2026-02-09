"""
Configuration management for the multi-agent RAG system.

Loads and validates environment variables for OpenAI models, Pinecone settings,
and retrieval parameters using Pydantic Settings.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # OpenAI Configuration
    openai_api_key: str
    openai_model_name: str = "gpt-4o-mini"

    # IMPORTANT: use OPENAI_EMBEDDING_MODEL_NAME in .env
    openai_embedding_model_name: str = "text-embedding-3-large"

    # Pinecone Configuration
    pinecone_api_key: str
    pinecone_index_name: str

    # Retrieval Configuration
    retrieval_k: int = 4

    # Frontend / CORS
    frontend_origin: str = "http://localhost:3000"

    # Admin / Maintenance
    # This will protect endpoints like "clear all documents"
    admin_key: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
