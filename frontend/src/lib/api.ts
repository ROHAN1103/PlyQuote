/**
 * Thin fetch wrapper for the FastAPI backend.
 * - Same-origin requests with cookies (session cookie is HTTP-only, set by the server).
 * - CSRF: fetches a signed token once, sends it as X-CSRF-Token on every unsafe request,
 *   and transparently refreshes it once if the server rejects it.
 * - Normalises the backend's {error:{code,message,fields[]}} shape into ApiError.
 */
export type FieldError = { field: string; message: string };

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: FieldError[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const BASE = "/api/v1";
const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

let csrfToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

/** Registered once by the app so an expired session sends the user back to sign-in. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export function resetCsrfToken() {
  csrfToken = null;
}

async function ensureCsrf(force = false): Promise<string> {
  if (csrfToken && !force) return csrfToken;
  const res = await fetch(`${BASE}/auth/csrf`, { credentials: "same-origin" });
  if (!res.ok) throw new ApiError(res.status, "csrf_unavailable", "Could not start a secure session.");
  csrfToken = ((await res.json()) as { csrf_token: string }).csrf_token;
  return csrfToken;
}

async function toApiError(res: Response): Promise<ApiError> {
  try {
    const body = await res.json();
    const e = body?.error;
    if (e) return new ApiError(res.status, e.code ?? "error", e.message ?? "Request failed.", e.fields ?? []);
  } catch {
    /* fall through */
  }
  return new ApiError(res.status, "http_error", `Request failed (${res.status}).`);
}

async function request<T>(method: string, path: string, body?: unknown, isRetry = false): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (!SAFE.has(method)) headers["X-CSRF-Token"] = await ensureCsrf();

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      credentials: "same-origin",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "network_error", "Can't reach the server. Check your connection and try again.");
  }

  if (res.ok) return (res.status === 204 ? undefined : await res.json()) as T;

  const error = await toApiError(res);
  if (error.code === "csrf_failed" && !isRetry) {
    await ensureCsrf(true);
    return request<T>(method, path, body, true);
  }
  if (error.status === 401 && error.code !== "invalid_credentials") onUnauthorized?.();
  throw error;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body ?? {}),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
