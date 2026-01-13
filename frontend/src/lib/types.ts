export type SourceItem = {
  text?: string;
  metadata?: Record<string, unknown>;
};

export type QAResponse = {
  answer: string;
  // backend currently returns context (not sources) — keep optional
  context?: string;
  sources?: SourceItem[];
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
