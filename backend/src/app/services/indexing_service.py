"""
Document Indexing Service Module

This module represents the Service Layer for data ingestion. It acts as the bridge 
between the API layer (which handles HTTP file uploads) and the core retrieval 
infrastructure (which handles text splitting, embeddings, and vector storage).

By isolating the document loading logic here, we ensure that the API endpoint 
doesn't need to know *how* to parse a PDF, and the vector store doesn't need to 
know *where* the text came from.
"""

from pathlib import Path

from langchain_community.document_loaders import PyPDFLoader

from ..core.retrieval.vector_store import index_documents


def index_pdf_file(file_path: Path) -> int:
    """
    Parses a physical PDF file from disk and orchestrates its ingestion into the vector database.

    Senior Note on PyPDFLoader:
    We specifically use LangChain's PyPDFLoader because it automatically extracts 
    page numbers and attaches them to the `metadata` of each Document object. 
    Our entire citation architecture (e.g., generating IDs like [P12-C8f9a0b1]) 
    strictly relies on this metadata existing. If we ever swap loaders (e.g., to PyMuPDF), 
    we must ensure the new loader preserves this 'page' metadata contract.

    Args:
        file_path (Path): The absolute or relative path to the saved PDF file on disk.

    Returns:
        int: The total number of chunks successfully embedded and upserted into Pinecone.
    """
    # Initialize the loader with the string representation of the Path object
    loader = PyPDFLoader(str(file_path))
    
    # .load() reads the entire PDF into memory, creating one LangChain Document per page.
    # Each Document contains 'page_content' (the text) and 'metadata' (source filename, page number).
    docs = loader.load()
    
    # Delegate the heavy lifting (chunking, embedding, database network calls) 
    # to the dedicated vector store module.
    return index_documents(docs)
