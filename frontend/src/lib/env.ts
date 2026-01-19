export function getApiBaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL;

  return url?.trim() ? url.trim() : "intelirag-esbubgbadjfgcrbb.southeastasia-01.azurewebsites.net";
}
