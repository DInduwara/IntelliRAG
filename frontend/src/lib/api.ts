import { getApiBaseUrl } from "./env";
import type { IndexPdfResponse, QARequest, QAResponse, FileListResponse } from "./types";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function pickMessage(errBody: unknown): string | null {
  if (!isRecord(errBody)) return null;
  const detail = errBody.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((d) => (isRecord(d) && typeof d.msg === "string" ? d.msg : null))
      .filter((x): x is string => Boolean(x));
    if (msgs.length) return msgs.join(", ");
  }
  const message = errBody.message;
  if (typeof message === "string") return message;
  return null;
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function request<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  const base = getApiBaseUrl();
  const url = `${base}${path}`;

  const headers: Record<string, string> = { 
    ...((init?.headers as Record<string, string>) || {}) 
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch {
    throw new Error(
      `Cannot reach backend at ${base}. Make sure FastAPI is running and CORS is enabled.`
    );
  }

  if (!res.ok) {
    const body = await safeJson(res);
    const msg = pickMessage(body) ?? `Request failed (${res.status})`;
    throw new Error(msg);
  }

  const data = await safeJson(res);
  return data as T;
}

export async function askQuestion(payload: QARequest, token?: string): Promise<QAResponse> {
  return request<QAResponse>("/qa", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }, token);
}

export async function indexPdf(file: File, token?: string): Promise<IndexPdfResponse> {
  const form = new FormData();
  form.append("file", file);

  return request<IndexPdfResponse>("/index-pdf", {
    method: "POST",
    body: form,
  }, token);
}

export async function deleteMyFiles(filenames: string[], token?: string): Promise<{ message: string; deleted_count: number }> {
  return request<{ message: string; deleted_count: number }>("/my-files", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filenames }),
  }, token);
}

// --- NEW API CALL FOR FETCHING USER FILES ---
export async function getMyFiles(token?: string): Promise<FileListResponse> {
  return request<FileListResponse>("/my-files", {
    method: "GET",
  }, token);
}