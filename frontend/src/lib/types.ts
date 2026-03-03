/**
 * Shared API types for the frontend.
 * Keep these aligned with FastAPI request/response models.
 */

export type CitationItem = {
  page?: number | string;
  page_label?: string | number;
  source?: string;
  snippet?: string;

  // optional full text if backend includes it
  text?: string;
};

export type CitationsMap = Record<string, CitationItem>;

export type QAResponse = {
  answer: string;
  context: string;
  plan?: string;
  sub_questions?: string[];
  citations?: CitationsMap;
  confidence?: "high" | "medium" | "low";
  thread_id?: string
};

export type IndexPdfResponse = {
  filename?: string;
  chunks_indexed?: number;
  message?: string;
  status?: string;
};

export type QARequest = {
  question: string;
  thread_id?: string;

  /**
   * If provided, restrict retrieval to this document source name.
   * If null/undefined, backend will search across all indexed PDFs.
   */
  document_scope?: string | null;
};
