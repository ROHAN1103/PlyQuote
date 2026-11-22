import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetCsrfToken } from "@/lib/api";
import { apiError, installBackend, jsonResponse, renderApp, type Handler } from "@/test/utils";
import type { Material } from "./types";

const fetchMock = vi.fn();

const mat = (over: Partial<Material> = {}): Material => ({
  id: "m1", name: "BWP Plywood", category: "plywood", brand: "Greenply", description: "", specification: "18mm", unit: "sheet",
  cost_rate: "2500.0000", selling_rate: null, is_active: true, created_at: "2026-11-17T00:00:00Z", updated_at: "2026-11-17T00:00:00Z", ...over,
});
const page = (items: Material[], total = items.length) => ({ items, total, page: 1, page_size: 20, pages: total ? 1 : 0 });
const list = (items: Material[], total?: number): Handler => (r) =>
  r.method === "GET" && r.path === "/materials" ? jsonResponse(200, page(items, total)) : undefined;

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  resetCsrfToken();
});

describe("Materials page", () => {
  it("lists materials with formatted rates and flags unset rates", async () => {
    installBackend(fetchMock, list([mat(), mat({ id: "m2", name: "Hinge", category: "hardware", unit: "pc", specification: "", brand: "", cost_rate: "0.0000" })]));
    renderApp("/materials");
    expect(await screen.findByText("BWP Plywood")).toBeInTheDocument();
    expect(screen.getByText("Greenply · 18mm")).toBeInTheDocument();
    expect(screen.getByText("₹2,500.00")).toBeInTheDocument();
    expect(screen.getByText("Rate not set")).toBeInTheDocument();
    expect(screen.getByText("Showing 1–2 of 2")).toBeInTheDocument();
  });

  it("shows a helpful empty state, and a different one when filters match nothing", async () => {
    const calls = installBackend(fetchMock, list([]));
    renderApp("/materials");
    expect(await screen.findByText("No materials yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add your first material/i })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Search materials"), "zzz");
    expect(await screen.findByText("No materials match")).toBeInTheDocument();
    expect(calls.some((c) => c.query.get("q") === "zzz")).toBe(true);
  });

  it("requests only active materials by default, and applies category and status filters", async () => {
    const calls = installBackend(fetchMock, list([mat()]));
    renderApp("/materials");
    await screen.findByText("BWP Plywood");
    expect(calls.find((c) => c.path === "/materials")!.query.get("is_active")).toBe("true");

    await userEvent.selectOptions(screen.getByLabelText("Category"), "hardware");
    await waitFor(() => expect(calls.some((c) => c.query.get("category") === "hardware")).toBe(true));

    await userEvent.selectOptions(screen.getByLabelText("Status"), "all");
    await waitFor(() => expect(calls.some((c) => c.path === "/materials" && c.query.get("category") === "hardware" && !c.query.has("is_active"))).toBe(true));
  });

  it("shows an error with a retry when loading fails", async () => {
    installBackend(fetchMock, (r) => (r.path === "/materials" ? apiError(500, "internal_error", "Something went wrong on our side.") : undefined));
    renderApp("/materials");
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong on our side.");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("validates the form before sending anything", async () => {
    const calls = installBackend(fetchMock, list([mat()]));
    renderApp("/materials");
    await userEvent.click(await screen.findByRole("button", { name: /add material/i }));
    await userEvent.click(await screen.findByRole("button", { name: "Add material", hidden: false }));
    expect(await screen.findByText("Enter a name.")).toBeInTheDocument();
    expect(screen.getByText("Enter a unit, e.g. sheet or pc.")).toBeInTheDocument();
    expect(screen.getByText(/Enter an amount like/)).toBeInTheDocument();
    expect(calls.some((c) => c.method === "POST" && c.path === "/materials")).toBe(false);
  });

  it("creates a material, sending rates as exact strings and an empty selling rate as null", async () => {
    const calls = installBackend(fetchMock, list([mat()]), (r) =>
      r.method === "POST" && r.path === "/materials" ? jsonResponse(201, mat({ id: "new" })) : undefined);
    renderApp("/materials");
    await userEvent.click(await screen.findByRole("button", { name: /add material/i }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.selectOptions(within(dialog).getByLabelText("Category"), "laminate");
    await userEvent.type(within(dialog).getByLabelText("Name"), "Matte Laminate");
    await userEvent.type(within(dialog).getByLabelText("Unit"), "sheet");
    await userEvent.type(within(dialog).getByLabelText("Cost rate (₹)"), "900.50");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add material" }));

    await waitFor(() => expect(calls.some((c) => c.method === "POST")).toBe(true));
    const post = calls.find((c) => c.method === "POST" && c.path === "/materials")!;
    expect(post.body).toEqual({ category: "laminate", name: "Matte Laminate", brand: "", specification: "", unit: "sheet",
      cost_rate: "900.50", selling_rate: null, description: "", is_active: true });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("explains a duplicate material and keeps the dialog open", async () => {
    installBackend(fetchMock, list([mat()]), (r) =>
      r.method === "POST" ? apiError(409, "duplicate_material", "A material with the same name, brand and specification already exists in this category.") : undefined);
    renderApp("/materials");
    await userEvent.click(await screen.findByRole("button", { name: /add material/i }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Name"), "BWP Plywood");
    await userEvent.type(within(dialog).getByLabelText("Unit"), "sheet");
    await userEvent.type(within(dialog).getByLabelText("Cost rate (₹)"), "2500");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add material" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(/already exists/i);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("edits a material, pre-filling trimmed rates and sending the update", async () => {
    const calls = installBackend(fetchMock, list([mat({ selling_rate: "3000.0000" })]), (r) =>
      r.method === "PUT" && r.path === "/materials/m1" ? jsonResponse(200, mat()) : undefined);
    renderApp("/materials");
    await userEvent.click(await screen.findByRole("button", { name: "Edit BWP Plywood" }));
    const dialog = await screen.findByRole("dialog");
    const cost = within(dialog).getByLabelText("Cost rate (₹)") as HTMLInputElement;
    expect(cost.value).toBe("2500");
    expect((within(dialog).getByLabelText(/Selling rate/) as HTMLInputElement).value).toBe("3000");
    await userEvent.clear(cost);
    await userEvent.type(cost, "2750");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(calls.some((c) => c.method === "PUT")).toBe(true));
    expect(calls.find((c) => c.method === "PUT")!.body).toMatchObject({ cost_rate: "2750", selling_rate: "3000", is_active: true });
  });

  it("asks for confirmation before deactivating", async () => {
    const calls = installBackend(fetchMock, list([mat()]), (r) =>
      r.method === "DELETE" && r.path === "/materials/m1" ? jsonResponse(200, mat({ is_active: false })) : undefined);
    renderApp("/materials");
    await userEvent.click(await screen.findByRole("button", { name: "Deactivate BWP Plywood" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(/existing quotations keep their prices/i);
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
    await userEvent.click(within(dialog).getByRole("button", { name: "Deactivate" }));
    await waitFor(() => expect(calls.some((c) => c.method === "DELETE" && c.path === "/materials/m1")).toBe(true));
  });

  it("reactivates an inactive material by sending the full record with is_active true", async () => {
    const calls = installBackend(fetchMock, list([mat({ is_active: false })]), (r) =>
      r.method === "PUT" ? jsonResponse(200, mat()) : undefined);
    renderApp("/materials");
    await userEvent.click(await screen.findByRole("button", { name: "Reactivate BWP Plywood" }));
    await waitFor(() => expect(calls.some((c) => c.method === "PUT")).toBe(true));
    expect(calls.find((c) => c.method === "PUT")!.body).toMatchObject({ name: "BWP Plywood", is_active: true, cost_rate: "2500" });
  });
});
