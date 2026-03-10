/**
 * Shared API types for the frontend.
 * Keep these aligned with FastAPI request/response models.
 */

export type CitationItem = {
  page?: number | string;
  page_label?: string | number;
  source?: string;
  snippet?: string;
  text?: string;
};

export type CitationsMap = Record<string, CitationItem>;

export type RetrievalTrace = {
  call_number: number;
  query: string;
  chunks_count: number;
  sources: string[];
};

export type QAResponse = {
  answer: string;
  context: string;
  plan?: string;
  sub_questions?: string[];
  citations?: CitationsMap;
  retrieval_traces?: RetrievalTrace[];
  raw_context?: string;
  context_rationale?: string;
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
  document_scope?: string | null;
};

// --- NEW FILE MANAGEMENT TYPES ---

export type FileItem = {
  id: number;
  filename: string;
  upload_timestamp: string;
};

export type FileListResponse = {
  files: FileItem[];
};