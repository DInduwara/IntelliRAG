"""
Document Indexing Service Module
"""
from pathlib import Path
from langchain_community.document_loaders import PyPDFLoader
from ..core.retrieval.vector_store import index_documents

def index_pdf_file(file_path: Path) -> int:
    """
    Parses a physical PDF file from disk and orchestrates ingestion.
    
    Architecture Note: Because we use ContextVars, we do not need to pass 
    the `user_id` through this function. The downstream `index_documents` 
    function will automatically pull the user_id from the active HTTP request!
    """
    loader = PyPDFLoader(str(file_path))
    docs = loader.load()
    return index_documents(docs)