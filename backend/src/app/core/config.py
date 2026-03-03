"""
Configuration Management Module
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from contextvars import ContextVar

# FEATURE: Multitenancy Request Context
# ContextVars allow us to safely store the user_id for the duration of an HTTP request 
# without having to rewrite every single Python function signature to accept a user_id parameter.
current_user_id: ContextVar[str] = ContextVar("current_user_id", default="")

class Settings(BaseSettings):
    openai_api_key: str
    openai_model_name: str = "gpt-4o-mini"
    openai_embedding_model_name: str = "text-embedding-3-large"
    
    pinecone_api_key: str
    pinecone_index_name: str
    
    # NEW: Used to verify that the Auth Token actually came from your Clerk application
    clerk_issuer_url: str | None = None
    database_url: str
    
    retrieval_k: int = 4
    frontend_origin: str = "http://localhost:3000"
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
