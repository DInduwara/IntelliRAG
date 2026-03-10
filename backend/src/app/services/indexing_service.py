"""
Document Indexing Service Module
"""
from pathlib import Path
# CHANGED: Swapped PyPDFLoader for the much more robust PyMuPDFLoader
from langchain_community.document_loaders import PyMuPDFLoader
from ..core.retrieval.vector_store import index_documents

def index_pdf_file(file_path: Path) -> int:
    """
    Parses a physical PDF file from disk and orchestrates ingestion.
    """
    # PyMuPDFLoader is faster and ignores 'bbox' layout errors
    loader = PyMuPDFLoader(str(file_path))
    docs = loader.load()
    return index_documents(docs)