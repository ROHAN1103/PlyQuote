import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetCsrfToken } from "@/lib/api";
import { jsonResponse, renderApp, USER } from "@/test/utils";

const fetchMock = vi.fn();

/** Tiny fake backend keyed by "METHOD path". */
function backend(routes: Record<string, () => Response>) {
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? "GET"} ${url.replace("/api/v1", "")}`;
    const handler = routes[key];
    if (!handler) throw new Error(`Unexpected request: ${key}`);
    return handler();
  });
}

const signedOut = { "GET /auth/me": () => jsonResponse(401, { error: { code: "not_authenticated", message: "Please sign in.", fields: [] } }) };
const csrf = { "GET /auth/csrf": () => jsonResponse(200, { csrf_token: "t.s" }) };

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  resetCsrfToken();
});

describe("route guard", () => {
  it("redirects a signed-out visitor to the sign-in page", async () => {
    backend(signedOut);
    const { router } = renderApp("/materials");
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/login");
  });

  it("shows the app shell to a signed-in user", async () => {
    backend({ "GET /auth/me": () => jsonResponse(200, USER) });
    renderApp("/materials");
    expect(await screen.findByRole("heading", { name: "Materials" })).toBeInTheDocument();
    expect(screen.getByText("Acme Interiors")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Furniture templates" })).toBeInTheDocument();
  });
});

describe("sign-in form", () => {
  it("validates required fields before calling the server", async () => {
    backend(signedOut);
    renderApp("/login");
    await userEvent.click(await screen.findByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter your username.")).toBeInTheDocument();
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((c) => String(c[0]).endsWith("/auth/login"))).toBe(false);
  });

  it("shows the server's message for wrong credentials and stays on the page", async () => {
    backend({
      ...signedOut,
      ...csrf,
      "POST /auth/login": () => jsonResponse(401, { error: { code: "invalid_credentials", message: "Incorrect username or password.", fields: [] } }),
    });
    const { router } = renderApp("/login");
    await userEvent.type(await screen.findByLabelText("Username"), "admin");
    await userEvent.type(screen.getByLabelText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect username or password.");
    expect(router.state.location.pathname).toBe("/login");
  });

  it("signs in and lands on the page the user originally asked for", async () => {
    let signedIn = false;
    backend({
      "GET /auth/me": () => (signedIn ? jsonResponse(200, USER) : jsonResponse(401, { error: { code: "not_authenticated", message: "x", fields: [] } })),
      ...csrf,
      "POST /auth/login": () => {
        signedIn = true;
        return jsonResponse(200, USER);
      },
    });
    const { router } = renderApp("/quotations");
    await userEvent.type(await screen.findByLabelText("Username"), "admin");
    await userEvent.type(screen.getByLabelText("Password"), "correct-horse-battery");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/quotations"));
    expect(await screen.findByRole("heading", { name: "Quotations" })).toBeInTheDocument();
    const loginCall = fetchMock.mock.calls.find((c) => String(c[0]).endsWith("/auth/login"))!;
    expect(JSON.parse(loginCall[1].body)).toEqual({ username: "admin", password: "correct-horse-battery" });
    expect(loginCall[1].headers["X-CSRF-Token"]).toBe("t.s");
  });
});

describe("sign out", () => {
  it("returns to the sign-in page", async () => {
    let signedIn = true;
    backend({
      "GET /auth/me": () => (signedIn ? jsonResponse(200, USER) : jsonResponse(401, { error: { code: "not_authenticated", message: "x", fields: [] } })),
      ...csrf,
      "POST /auth/logout": () => {
        signedIn = false;
        return jsonResponse(200, { message: "Signed out." });
      },
    });
    const { router } = renderApp("/");
    await userEvent.click(await screen.findByRole("button", { name: /sign out/i }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
  });
});
