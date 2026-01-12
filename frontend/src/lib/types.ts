export type SourceItem = {
  text?: string;
  metadata?: Record<string, unknown>;
};

export type QAResponse = {
  answer: string;
  sources?: SourceItem[];
};

export type IndexPdfResponse = {
  message?: string;
  status?: string;
};

export type QARequest = {
  question: string;
};
