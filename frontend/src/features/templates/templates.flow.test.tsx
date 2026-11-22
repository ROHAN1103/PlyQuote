import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetCsrfToken } from "@/lib/api";
import { apiError, installBackend, jsonResponse, renderApp, type Handler } from "@/test/utils";
import type { FurnitureTemplate } from "./types";

const fetchMock = vi.fn();

const tpl = (over: Partial<FurnitureTemplate> = {}): FurnitureTemplate => ({
  id: "t1", name: "TV Unit", description: "Wall mounted", default_pricing_method: "manual", is_active: true, created_at: "", updated_at: "",
  default_config: { unit: "pc", quantity: "1.0000", unit_rate: "25000.0000" }, ...over,
});
const list = (items: FurnitureTemplate[]): Handler => (r) => (r.method === "GET" && r.path === "/furniture-templates" ? jsonResponse(200, items) : undefined);

beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); resetCsrfToken(); });

describe("Furniture templates page", () => {
  it("lists templates with their starting values", async () => {
    installBackend(fetchMock, list([tpl()]));
    renderApp("/templates");
    expect(await screen.findByText("TV Unit")).toBeInTheDocument();
    expect(screen.getByText("Wall mounted")).toBeInTheDocument();
    expect(screen.getByText("1 pc × ₹25,000.00")).toBeInTheDocument();
  });

  it("shows an empty state that invites the first template", async () => {
    installBackend(fetchMock, list([]));
    renderApp("/templates");
    expect(await screen.findByText("No templates yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add your first template/i })).toBeInTheDocument();
  });

  it("validates before sending", async () => {
    const calls = installBackend(fetchMock, list([]));
    renderApp("/templates");
    await userEvent.click(await screen.findByRole("button", { name: /add your first template/i }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Quantity"), "0");   // "1" + "0" = "10": clear first for a real test
    await userEvent.clear(within(dialog).getByLabelText("Quantity"));
    await userEvent.type(within(dialog).getByLabelText("Quantity"), "0");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add template" }));
    expect(await within(dialog).findByText("Enter a name.")).toBeInTheDocument();
    expect(within(dialog).getByText("Quantity must be more than zero.")).toBeInTheDocument();
    expect(calls.some((c) => c.method === "POST")).toBe(false);
  });

  it("creates a template, sending rates as exact strings", async () => {
    const calls = installBackend(fetchMock, list([]), (r) => (r.method === "POST" ? jsonResponse(201, tpl()) : undefined));
    renderApp("/templates");
    await userEvent.click(await screen.findByRole("button", { name: /add your first template/i }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Name"), "TV Unit");
    await userEvent.clear(within(dialog).getByLabelText(/Rate/));
    await userEvent.type(within(dialog).getByLabelText(/Rate/), "25000.50");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add template" }));
    await waitFor(() => expect(calls.some((c) => c.method === "POST")).toBe(true));
    expect(calls.find((c) => c.method === "POST")!.body).toEqual({
      name: "TV Unit", description: "", default_pricing_method: "manual", default_config: { unit: "pc", quantity: "1", unit_rate: "25000.50" },
    });
  });

  it("shows a duplicate-name error on the name field", async () => {
    installBackend(fetchMock, list([tpl()]), (r) =>
      r.method === "POST" ? apiError(409, "duplicate_template", "A template with this name already exists.") : undefined);
    renderApp("/templates");
    await userEvent.click(await screen.findByRole("button", { name: "Add template" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Name"), "tv unit");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add template" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(/already exists/i);
  });

  it("edits a template with trimmed numbers pre-filled", async () => {
    const calls = installBackend(fetchMock, list([tpl()]), (r) => (r.method === "PUT" ? jsonResponse(200, tpl()) : undefined));
    renderApp("/templates");
    await userEvent.click(await screen.findByRole("button", { name: "Edit TV Unit" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("Quantity")).toHaveValue("1");
    expect(within(dialog).getByLabelText(/Rate/)).toHaveValue("25000");
    await userEvent.clear(within(dialog).getByLabelText(/Rate/));
    await userEvent.type(within(dialog).getByLabelText(/Rate/), "32000");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(calls.some((c) => c.method === "PUT" && c.path === "/furniture-templates/t1")).toBe(true));
    expect(calls.find((c) => c.method === "PUT")!.body.default_config.unit_rate).toBe("32000");
  });

  it("asks before removing a template", async () => {
    const calls = installBackend(fetchMock, list([tpl()]), (r) => (r.method === "DELETE" ? jsonResponse(200, tpl({ is_active: false })) : undefined));
    renderApp("/templates");
    await userEvent.click(await screen.findByRole("button", { name: "Remove TV Unit" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(/not affected/);
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
    await userEvent.click(within(dialog).getByRole("button", { name: "Remove template" }));
    await waitFor(() => expect(calls.some((c) => c.method === "DELETE" && c.path === "/furniture-templates/t1")).toBe(true));
  });
});
