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
