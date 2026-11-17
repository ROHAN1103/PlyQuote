import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, resetCsrfToken, setUnauthorizedHandler } from "./api";
import { jsonResponse } from "@/test/utils";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  resetCsrfToken();
  setUnauthorizedHandler(null);
});
afterEach(() => vi.unstubAllGlobals());

describe("api client", () => {
  it("does not request a CSRF token for GET", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    await api.get("/things");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/v1/things");
  });

  it("fetches a CSRF token once and sends it on unsafe requests", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url === "/api/v1/auth/csrf" ? jsonResponse(200, { csrf_token: "tok.sig" }) : jsonResponse(200, {}),
    );
    await api.post("/a", { x: 1 });
    await api.post("/b", { y: 2 });
    const csrfCalls = fetchMock.mock.calls.filter((c) => c[0] === "/api/v1/auth/csrf");
    expect(csrfCalls).toHaveLength(1);
    const post = fetchMock.mock.calls.find((c) => c[0] === "/api/v1/a")![1];
    expect(post.headers["X-CSRF-Token"]).toBe("tok.sig");
    expect(post.credentials).toBe("same-origin");
  });

  it("refreshes the token and retries once when the server rejects it", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { csrf_token: "old" }))
      .mockResolvedValueOnce(jsonResponse(403, { error: { code: "csrf_failed", message: "bad", fields: [] } }))
      .mockResolvedValueOnce(jsonResponse(200, { csrf_token: "new" }))
      .mockResolvedValueOnce(jsonResponse(200, { done: true }));
    await expect(api.post("/x")).resolves.toEqual({ done: true });
    const lastHeaders = fetchMock.mock.calls[3]![1].headers;
    expect(lastHeaders["X-CSRF-Token"]).toBe("new");
  });

  it("maps the backend error shape to ApiError", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(422, { error: { code: "validation_error", message: "Some fields are invalid.", fields: [{ field: "name", message: "Required" }] } }),
    );
    const err = (await api.get("/y").catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(422);
    expect(err.code).toBe("validation_error");
    expect(err.fields).toEqual([{ field: "name", message: "Required" }]);
  });

  it("reports network failures in plain language", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const err = (await api.get("/z").catch((e: unknown) => e)) as ApiError;
    expect(err.code).toBe("network_error");
    expect(err.message).toMatch(/can't reach the server/i);
  });

  it("calls the unauthorized handler on 401, but not for bad credentials", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: { code: "session_expired", message: "x", fields: [] } }));
    await api.get("/secure").catch(() => {});
    expect(handler).toHaveBeenCalledTimes(1);

    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: { code: "invalid_credentials", message: "x", fields: [] } }));
    await api.get("/login-ish").catch(() => {});
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
