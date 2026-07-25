const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:3000";

interface ApiEnvelope<T> { data: T }

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem("bakimnerde_token");
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = await response.json() as ApiEnvelope<T> & { error?: { message?: string } };
  if (!response.ok) throw new Error(body.error?.message ?? "İşlem tamamlanamadı.");
  return body.data;
}
