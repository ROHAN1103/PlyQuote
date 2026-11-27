import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetCsrfToken } from "@/lib/api";
import { useBuilderUi } from "@/store/quotationStore";
import { apiError, installBackend, jsonResponse, renderApp, type Handler, type Req } from "@/test/utils";
import {
  defaultsHandler, getQuote, item, noTemplates, previewHandler, quote, summary, totals,
} from "@/test/quotationFixtures";
import type { QuotationSummary } from "./types";

const fetchMock = vi.fn();
const SLOW = { timeout: 4000 };

const page = (items: QuotationSummary[], total = items.length) => ({ items, total, page: 1, page_size: 20, pages: total ? 1 : 0 });
const list = (items: QuotationSummary[]): Handler => (r) => (r.method === "GET" && r.path === "/quotations" ? jsonResponse(200, page(items)) : undefined);

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  resetCsrfToken();
  useBuilderUi.getState().setExpanded(null);
});

// ================= list =================
describe("Quotations list", () => {
  it("shows quotations with formatted amounts, dates and status; only drafts can be deleted", async () => {
    installBackend(fetchMock, list([
      summary(),
      summary({ id: "q2", quotation_number: "QT-2026-0002", client_name: "S. Iyer", status: "sent", effective_status: "expired", grand_total: "1234567.50", revision: 2 }),
    ]));
    renderApp("/quotations");
    expect(await screen.findByRole("link", { name: "QT-2026-0001" })).toHaveAttribute("href", "/quotations/q1");
    expect(screen.getByText("₹92,200.00")).toBeInTheDocument();
    expect(screen.getByText("₹12,34,567.50")).toBeInTheDocument();
    expect(screen.getAllByText("18 Nov 2026").length).toBe(2);
    const table = within(screen.getByRole("table"));   // "Draft" and "Expired" are also filter options
    expect(table.getByText("Draft")).toBeInTheDocument();
    expect(table.getByText("Expired")).toBeInTheDocument();
    expect(screen.getByText("R2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete QT-2026-0001" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete QT-2026-0002" })).not.toBeInTheDocument();
  });

  it("searches and filters through the API", async () => {
    const calls = installBackend(fetchMock, list([summary()]));
    renderApp("/quotations");
    await screen.findByText("R. Sharma");
    await userEvent.type(screen.getByLabelText("Search quotations"), "iyer");
    await waitFor(() => expect(calls.some((c) => c.query.get("q") === "iyer")).toBe(true), SLOW);
    await userEvent.selectOptions(screen.getByLabelText("Status"), "expired");
    await waitFor(() => expect(calls.some((c) => c.query.get("status") === "expired" && c.query.get("q") === "iyer")).toBe(true), SLOW);
  });

  it("has distinct empty states for no quotations and no matches", async () => {
    installBackend(fetchMock, list([]));
    renderApp("/quotations");
    expect(await screen.findByText("No quotations yet")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Search quotations"), "zzz");
    expect(await screen.findByText("No quotations match", undefined, SLOW)).toBeInTheDocument();
  });

  it("confirms before deleting a draft", async () => {
    const calls = installBackend(fetchMock, list([summary()]), (r) => (r.method === "DELETE" && r.path === "/quotations/q1" ? new Response(null, { status: 204 }) : undefined));
    renderApp("/quotations");
    await userEvent.click(await screen.findByRole("button", { name: "Delete QT-2026-0001" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(/won't be reused/);
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete draft" }));
    await waitFor(() => expect(calls.some((c) => c.method === "DELETE" && c.path === "/quotations/q1")).toBe(true));
  });
});

// ================= builder: new quotation =================
describe("Quotation builder: new", () => {
  it("starts empty, prefilled from company defaults", async () => {
    installBackend(fetchMock, defaultsHandler, noTemplates);
    renderApp("/quotations/new");
    expect(await screen.findByRole("heading", { name: "New quotation" })).toBeInTheDocument();
    expect(screen.getByLabelText("Quotation date")).toHaveValue("2026-11-18");
    expect(screen.getByLabelText("Valid until")).toHaveValue("2026-12-18");
    expect(screen.getByLabelText(/Payment terms/)).toHaveValue("50% advance");
    expect(screen.getByLabelText(/Terms and conditions/)).toHaveValue("Standard T&C");
    expect(screen.getByText("assigned when you first save")).toBeInTheDocument();
    expect(screen.getByText("No furniture items yet")).toBeInTheDocument();
    expect(screen.getByTestId("grand-total")).toHaveTextContent("₹0.00");
  });

  it("shows amounts and totals calculated by the backend, never by the browser", async () => {
    const calls = installBackend(fetchMock, defaultsHandler, noTemplates, previewHandler);
    renderApp("/quotations/new");
    await userEvent.click(await screen.findByRole("button", { name: "Add your first item" }));
    await userEvent.type(await screen.findByLabelText("Item name"), "Study table");
    await userEvent.clear(screen.getByLabelText("Quantity"));
    await userEvent.type(screen.getByLabelText("Quantity"), "2");
    await userEvent.type(screen.getByLabelText(/Rate \(₹ per unit\)/), "1500.50");

    // 2 x 1500.50 = 3001.00 in the browser; the fake backend says 999.00 / 1,23,456.00, and that is what must be shown.
    await waitFor(() => expect(screen.getByTestId("item-0-amount")).toHaveTextContent("₹999.00"), SLOW);
    await waitFor(() => expect(screen.getByTestId("grand-total")).toHaveTextContent("₹1,23,456.00"), SLOW);

    const req = [...calls].reverse().find((c) => c.path === "/calculations/preview") as Req;
    expect(req.body.items).toEqual([{ pricing_method: "manual", item_name: "Study table", description: "", quantity: "2", unit: "pc", unit_rate: "1500.50" }]);
    expect(req.body.settings.gst).toEqual({ enabled: false, rate: null, prices_include_tax: false });
  });

  it("offers all three pricing methods", async () => {
    installBackend(fetchMock, defaultsHandler, noTemplates, previewHandler);
    renderApp("/quotations/new");
    await userEvent.click(await screen.findByRole("button", { name: "Add your first item" }));
    expect(await screen.findByRole("radio", { name: /Manual/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /By measurement/ })).toBeEnabled();
    expect(screen.getByRole("radio", { name: /By materials/ })).toBeEnabled();
    expect(screen.queryByText("Coming soon")).not.toBeInTheDocument();
  });

  it("saves a new quotation, sending only what was entered (no totals), then opens it", async () => {
    const saved = quote({ items: [item()], totals: totals({ subtotal: "67200.00", grand_total: "67200.00" }) });
    const calls = installBackend(fetchMock, defaultsHandler, noTemplates, previewHandler, getQuote(saved),
      (r) => (r.method === "POST" && r.path === "/quotations" ? jsonResponse(201, saved) : undefined));
    renderApp("/quotations/new");
    await userEvent.type(await screen.findByLabelText("Client name"), "R. Sharma");
    await userEvent.type(screen.getByLabelText(/Project name/), "Sharma Residence");
    await userEvent.click(screen.getByRole("button", { name: "Add your first item" }));
    await userEvent.type(await screen.findByLabelText("Item name"), "Wardrobe");
    await userEvent.type(screen.getByLabelText(/Rate \(₹ per unit\)/), "67200");
    await userEvent.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() => expect(calls.some((c) => c.method === "POST" && c.path === "/quotations")).toBe(true));
    const post = calls.find((c) => c.method === "POST" && c.path === "/quotations")!;
    expect(post.body).toEqual({
      project_name: "Sharma Residence", project_location: "", client: { name: "R. Sharma", phone: "", email: null, address: "" },
      quotation_date: "2026-11-18", valid_until: "2026-12-18", notes: "", payment_terms: "50% advance", terms_and_conditions: "Standard T&C",
      items: [{ pricing_method: "manual", item_name: "Wardrobe", description: "", quantity: "1", unit: "pc", unit_rate: "67200" }],
      settings: { charges: { labour: "0", transportation: "0", installation: "0", miscellaneous: "0" }, discount: { type: "none", value: "0" },
                  gst: { enabled: false, rate: null, prices_include_tax: false }, round_to_rupee: false },
    });
    expect(await screen.findByRole("heading", { name: "QT-2026-0001" })).toBeInTheDocument();
  });

  it("will not save an incomplete form, and opens the item that needs attention", async () => {
    const calls = installBackend(fetchMock, defaultsHandler, noTemplates, previewHandler);
    renderApp("/quotations/new");
    await userEvent.type(await screen.findByLabelText("Client name"), "R. Sharma");
    await userEvent.click(screen.getByRole("button", { name: "Add your first item" }));
    await userEvent.click(screen.getByRole("button", { name: "Save draft" }));
    expect(await screen.findByText("Enter an item name.")).toBeInTheDocument();
    expect(screen.getByText("Enter a rate like 1200 or 80.50.")).toBeInTheDocument();
    expect(screen.getByText("Needs attention")).toBeInTheDocument();
    expect(calls.some((c) => c.method === "POST" && c.path === "/quotations")).toBe(false);
  });

  it("requires a client name", async () => {
    const calls = installBackend(fetchMock, defaultsHandler, noTemplates);
    renderApp("/quotations/new");
    await userEvent.click(await screen.findByRole("button", { name: "Save draft" }));
    expect(await screen.findByText("Enter the client's name.")).toBeInTheDocument();
    expect(calls.some((c) => c.method === "POST")).toBe(false);
  });
});

// ================= builder: existing quotation =================
describe("Quotation builder: editing", () => {
  const open = (q = quote(), ...extra: Handler[]) => installBackend(fetchMock, getQuote(q), noTemplates, previewHandler, ...extra);

  it("loads a saved quotation with friendly numbers", async () => {
    open();
    renderApp("/quotations/q1");
    expect(await screen.findByRole("heading", { name: "QT-2026-0001" })).toBeInTheDocument();
    expect(screen.getByLabelText("Client name")).toHaveValue("R. Sharma");
    expect(screen.getByText("Wardrobe")).toBeInTheDocument();
    expect(screen.getByText("1 pc × ₹67,200.00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();   // nothing changed yet
  });

  it("shows a clear message when the quotation does not exist", async () => {
    installBackend(fetchMock, (r) => (r.path === "/quotations/missing" ? apiError(404, "quotation_not_found", "Quotation not found.") : undefined));
    renderApp("/quotations/missing");
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't find that quotation/i);
    expect(screen.getByRole("link", { name: "Back to quotations" })).toBeInTheDocument();
  });

  it("duplicates, reorders and removes items, then saves with ids, order and the row version", async () => {
    const calls = open(quote(), (r) => (r.method === "PUT" && r.path === "/quotations/q1" ? jsonResponse(200, quote({ row_version: 4 })) : undefined));
    renderApp("/quotations/q1");
    await screen.findByText("Wardrobe");

    await userEvent.click(screen.getByRole("button", { name: "Duplicate Wardrobe" }));
    expect(await screen.findByDisplayValue("Wardrobe (copy)")).toBeInTheDocument();           // opens the copy for editing
    await userEvent.click(screen.getByRole("button", { name: "Move TV Unit up" }));            // TV Unit above the copy
    await userEvent.click(screen.getByRole("button", { name: "Remove Wardrobe" }));            // remove the original (confirm first)
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Remove item" }));
    await userEvent.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() => expect(calls.some((c) => c.method === "PUT")).toBe(true));
    const put = calls.find((c) => c.method === "PUT")!.body;
    expect(put.row_version).toBe(3);
    expect(put.items.map((i: { item_name: string }) => i.item_name)).toEqual(["TV Unit", "Wardrobe (copy)"]);
    expect(put.items[0].id).toBe("i2");                    // existing item keeps its identity
    expect("id" in put.items[1]).toBe(false);              // the copy is new
  });

  it("moves items down as well as up, and disables moves at the ends", async () => {
    open();
    renderApp("/quotations/q1");
    await screen.findByText("Wardrobe");
    expect(screen.getByRole("button", { name: "Move Wardrobe up" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move TV Unit down" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Move Wardrobe down" }));
    const names = screen.getAllByRole("listitem").map((li) => li.textContent ?? "");
    expect(names[0]).toContain("TV Unit");
    expect(names[1]).toContain("Wardrobe");
  });

  it("removes an untouched blank item without asking", async () => {
    open(quote({ items: [] }));
    renderApp("/quotations/q1");
    await userEvent.click(await screen.findByRole("button", { name: "Add your first item" }));
    await userEvent.click(await screen.findByRole("button", { name: "Remove Untitled item" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("No furniture items yet")).toBeInTheDocument();
  });

  it("refuses a save made on an out-of-date copy and offers the latest version", async () => {
    let latest = quote({ row_version: 5, project_name: "Changed elsewhere" });
    let served = quote();
    installBackend(fetchMock, (r) => (r.method === "GET" && r.path === "/quotations/q1" ? jsonResponse(200, served) : undefined), noTemplates, previewHandler,
      (r) => (r.method === "PUT" ? apiError(409, "stale_quotation", "This quotation was changed somewhere else.") : undefined));
    renderApp("/quotations/q1");
    const project = await screen.findByLabelText(/Project name/);
    await userEvent.clear(project);
    await userEvent.type(project, "My edit");
    await userEvent.click(screen.getByRole("button", { name: "Save draft" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/changed somewhere else/);

    served = latest;
    await userEvent.click(screen.getByRole("button", { name: "Load the latest version" }));
    await waitFor(() => expect(screen.getByLabelText(/Project name/)).toHaveValue("Changed elsewhere"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    latest = served;
  });

  it("puts a server-side field error next to the field it belongs to", async () => {
    open(quote(), (r) => (r.method === "PUT" ? apiError(422, "validation_error", "Some fields are invalid.", [{ field: "client.email", message: "value is not a valid email address" }]) : undefined));
    renderApp("/quotations/q1");
    const phone = await screen.findByLabelText(/Phone/);
    await userEvent.type(phone, "123");
    await userEvent.click(screen.getByRole("button", { name: "Save draft" }));
    expect(await screen.findByText("value is not a valid email address")).toBeInTheDocument();
  });

  it("shows a calculation problem from the server instead of failing silently", async () => {
    open(quote(), (r) => (r.method === "PUT" ? apiError(422, "calculation_error", "The 'measurement' pricing method is not available yet.", [{ field: "items.0", message: "The 'measurement' pricing method is not available yet." }]) : undefined));
    renderApp("/quotations/q1");
    await userEvent.type(await screen.findByLabelText(/Phone/), "1");
    await userEvent.click(screen.getByRole("button", { name: "Save draft" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/not available yet/);
  });

  it("is read-only once a quotation is no longer a draft", async () => {
    open(quote({ status: "finalized", effective_status: "finalized" }));
    renderApp("/quotations/q1");
    expect(await screen.findByText(/can't be edited/i)).toHaveTextContent(/finalized/);
    expect(screen.getByLabelText("Client name")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add item" })).toBeDisabled();
  });

  it("asks before leaving with unsaved changes, and lets the user stay or go", async () => {
    installBackend(fetchMock, getQuote(quote()), noTemplates, previewHandler, list([]));
    const { router } = renderApp("/quotations/q1");
    await userEvent.type(await screen.findByLabelText(/Phone/), "9");
    await userEvent.click(screen.getByRole("link", { name: /All quotations/ }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(/unsaved changes/i);
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(router.state.location.pathname).toBe("/quotations/q1");

    await userEvent.click(screen.getByRole("link", { name: /All quotations/ }));
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Leave without saving" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/quotations"));
  });

  it("does not interrupt navigation when nothing has changed", async () => {
    installBackend(fetchMock, getQuote(quote()), noTemplates, previewHandler, list([]));
    const { router } = renderApp("/quotations/q1");
    await userEvent.click(await screen.findByRole("link", { name: /All quotations/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/quotations"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

// ================= templates in the builder =================
describe("Add from template", () => {
  it("adds an item prefilled from a template", async () => {
    const template = { id: "t1", name: "TV Unit", description: "Wall mounted", default_pricing_method: "manual", is_active: true, created_at: "", updated_at: "",
      default_config: { unit: "set", quantity: "2.0000", unit_rate: "25000.0000" } };
    installBackend(fetchMock, defaultsHandler, (r) => (r.path === "/furniture-templates" ? jsonResponse(200, [template]) : undefined), previewHandler);
    renderApp("/quotations/new");
    await userEvent.selectOptions(await screen.findByLabelText("Add from template"), "TV Unit");
    expect(await screen.findByLabelText("Item name")).toHaveValue("TV Unit");
    expect(screen.getByLabelText(/Description/)).toHaveValue("Wall mounted");
    expect(screen.getByLabelText("Quantity")).toHaveValue("2");
    expect(screen.getByLabelText("Unit")).toHaveValue("set");
    expect(screen.getByLabelText(/Rate \(₹ per unit\)/)).toHaveValue("25000");
  });

  it("hides the template picker when there are no templates", async () => {
    installBackend(fetchMock, defaultsHandler, noTemplates);
    renderApp("/quotations/new");
    await screen.findByRole("heading", { name: "New quotation" });
    expect(screen.queryByLabelText("Add from template")).not.toBeInTheDocument();
  });
});
