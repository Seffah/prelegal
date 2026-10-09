/** An error from the API, with a message that can be shown to the user. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type Options = { method?: string; body?: unknown; token?: string | null };

/** Calls the FastAPI backend and returns its JSON, or throws an ApiError. */
export async function api<T>(path: string, { method = "GET", body, token }: Options = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // FastAPI puts a readable message in `detail`, except for validation errors (a list).
    const detail = typeof data?.detail === "string" ? data.detail : "Something went wrong. Please try again.";
    throw new ApiError(detail, res.status);
  }
  return data as T;
}
