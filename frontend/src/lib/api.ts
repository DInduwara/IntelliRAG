import { getApiBaseUrl } from "./env";
import type { IndexPdfResponse, QARequest, QAResponse } from "./types";

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBaseUrl();
  const url = `${base}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
      },
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

  const data = (await safeJson(res)) as unknown;
  return data as T;
}

export async function askQuestion(payload: QARequest): Promise<QAResponse> {
  return request<QAResponse>("/qa", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function indexPdf(file: File): Promise<IndexPdfResponse> {
  const form = new FormData();
  form.append("file", file);

  return request<IndexPdfResponse>("/index-pdf", {
    method: "POST",
    body: form,
  });
}


export async function adminClearAll(adminKey: string): Promise<{ message: string; deleted_files?: number }> {
  return request<{ message: string; deleted_files?: number }>("/admin/clear", {
    method: "DELETE",
    headers: {
      "X-ADMIN-KEY": adminKey,
    },
  });
}

