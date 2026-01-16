/**
 * Shared API types for the frontend.
 * Keep these aligned with FastAPI response models.
 */

export type CitationItem = {
  page?: number | string;
  page_label?: string | number;
  source?: string;
  snippet?: string;
};

export type CitationsMap = Record<string, CitationItem>;

export type QAResponse = {
  answer: string;
  context: string;
  citations?: CitationsMap;

  /**
   * Confidence signal returned by the backend.
   * Intended meaning:
   * - high: multiple valid citations exist in final answer
   * - medium: one valid citation exists in final answer
   * - low: no valid citations exist in final answer
   */
  confidence?: "high" | "medium" | "low";
};

export type IndexPdfResponse = {
  filename?: string;
  chunks_indexed?: number;
  message?: string;
  status?: string;
};

export type QARequest = {
  question: string;
};
