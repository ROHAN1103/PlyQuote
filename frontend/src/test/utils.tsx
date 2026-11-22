import { vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { RouterProvider } from "react-router/dom";
import { createTestRouter } from "@/app/router";

export function renderApp(initialPath: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createTestRouter([initialPath]);
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...utils, router, queryClient };
}

export const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const USER = { id: "u1", username: "admin", company: { id: "c1", name: "Acme Interiors" } };

export type Req = { method: string; path: string; query: URLSearchParams; body: any; init?: RequestInit };
export type Handler = (req: Req) => Response | undefined;

/**
 * Installs a fake backend on a fetch mock. Handlers are tried in order; the first to return a Response wins.
 * Always answers /auth/me (signed in) and /auth/csrf. Returns the list of requests made, for assertions.
 */
export function installBackend(fetchMock: ReturnType<typeof vi.fn>, ...handlers: Handler[]) {
  const calls: Req[] = [];
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    const u = new URL(url, "http://localhost");
    const raw = init?.body;
    const body = typeof raw === "string" ? JSON.parse(raw) : raw;
    const req: Req = { method: init?.method ?? "GET", path: u.pathname.replace("/api/v1", ""), query: u.searchParams, body, init };
    calls.push(req);
    if (req.method === "GET" && req.path === "/auth/me") return jsonResponse(200, USER);
    if (req.method === "GET" && req.path === "/auth/csrf") return jsonResponse(200, { csrf_token: "t.s" });
    for (const h of handlers) {
      const res = h(req);
      if (res) return res;
    }
    throw new Error(`Unexpected request: ${req.method} ${req.path}`);
  });
  return calls;
}

export const apiError = (status: number, code: string, message: string, fields: { field: string; message: string }[] = []) =>
  jsonResponse(status, { error: { code, message, fields } });
