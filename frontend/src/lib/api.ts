export type QARequest = {
  question: string;
};

export type QAResponse = {
  answer: string;
  sources?: Array<{
    text?: string;
    metadata?: Record<string, unknown>;
  }>;
};

export type IndexPdfResponse = {
  message?: string;
  status?: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export async function askQuestion(
  payload: QARequest
): Promise<QAResponse> {
  const res = await fetch(`${API_BASE_URL}/qa`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to get answer");
  }

  return res.json();
}

export async function indexPdf(file: File): Promise<IndexPdfResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/index-pdf`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to index PDF");
  }

  return res.json();
}
