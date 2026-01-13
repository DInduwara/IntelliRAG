export function getApiBaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL;

  return url?.trim() ? url.trim() : "http://127.0.0.1:8000";
}
