import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetCsrfToken } from "@/lib/api";
import { useBuilderUi } from "@/store/quotationStore";
import {
  apiError, installBackend, jsonResponse, renderApp, type Handler, type Req,
} from "@/test/utils";
import { defaultsHandler, getQuote, item, noTemplates, previewHandler, quote, totals } from "@/test/quotationFixtures";

const fetchMock = vi.fn();
const SLOW = { timeout: 4000 };

const PLY = { id: "m1", name: "BWP Plywood", category: "plywood", brand: "Greenply", description: "", specification: "18mm", unit: "sheet",
  cost_rate: "2500.0000", selling_rate: null, is_active: true, created_at: "", updated_at: "" };
const materialsHandler: Handler = (r) => (r.method === "GET" && r.path === "/materials"
  ? jsonResponse(200, { items: [PLY], total: 1, page: 1, page_size: 20, pages: 1 }) : undefined);

/** "Labour" exists twice (an item's other costs, and the quotation's additional charges), so scope to the item's group. */
const itemCosts = () => within(screen.getByRole("group", { name: /Other costs/ }));
const lastPreview = (calls: Req[]) => [...calls].reverse().find((c) => c.path === "/calculations/preview") as Req;
const setup = (...extra: Handler[]) => installBackend(fetchMock, defaultsHandler, noTemplates, materialsHandler, previewHandler, ...extra);

async function openNewItem(method?: RegExp) {
  renderApp("/quotations/new");
  await userEvent.click(await screen.findByRole("button", { name: "Add your first item" }));
  if (method) await userEvent.click(await screen.findByRole("radio", { name: method }));
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  resetCsrfToken();
  useBuilderUi.getState().setExpanded(null);
});

// ================= measurement =================
describe("Measurement pricing", () => {
  it("takes feet and inches as people say them, sends inches, and shows the backend's quantities", async () => {
    const calls = setup();
    await openNewItem(/By measurement/);
    await userEvent.type(screen.getByLabelText("Item name"), "Wardrobe");
    await userEvent.type(screen.getByLabelText("Width"), "8'");
    await userEvent.type(screen.getByLabelText("Height"), "7' 0\"");
    await userEvent.type(screen.getByLabelText(/Rate \(₹ per sq\.ft\)/), "1200");

    expect(await screen.findByText("= 8' (96 in)")).toBeInTheDocument();
    expect(screen.getByText("= 7' (84 in)")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("item-0-amount")).toHaveTextContent("₹999.00"), SLOW);
    const result = screen.getByTestId("item-0-result");
    expect(result).toHaveTextContent("Measured quantity56 sq.ft");           // calculated, as the backend says
    expect(result).toHaveTextContent("Chargeable quantity56.5 sq.ft");       // chargeable is shown separately

    expect(lastPreview(calls).body.items).toEqual([{
      pricing_method: "measurement", item_name: "Wardrobe", description: "", quantity: "1", unit: "", unit_rate: "1200",
      measurement: { formula: "front_area", width: "96", height: "84", rounding_places: 2 },
    }]);
  });

  it.each([["66\"", "5' 6\" (66 in)"], ["5.5", "5' 6\" (66 in)"], ["5ft 6in", "5' 6\" (66 in)"], ["5' 6.5\"", "5' 6.5\" (66.5 in)"], ["8", "8' (96 in)"]])(
    "understands %s", async (typed, echo) => {
      setup();
      await openNewItem(/By measurement/);
      await userEvent.type(screen.getByLabelText("Width"), typed);
      expect(await screen.findByText(`= ${echo}`)).toBeInTheDocument();
    });

  it("explains how a bare number is read", async () => {
    setup();
    await openNewItem(/By measurement/);
    expect(screen.getByText(/A plain number means feet/)).toBeInTheDocument();
  });

  it("asks for the dimensions the chosen formula needs", async () => {
    setup();
    await openNewItem(/By measurement/);
    await userEvent.selectOptions(screen.getByLabelText("Measured by"), "side_area");
    expect(screen.getByLabelText("Depth")).toBeInTheDocument();
    expect(screen.queryByLabelText("Width")).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Measured by"), "running_feet");
    expect(screen.getByLabelText("Which length?")).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Which length?"), "height");
    expect(screen.getByLabelText("Height")).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Measured by"), "piece");
    expect(screen.queryByLabelText("Height")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Number of pieces")).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Measured by"), "manual_quantity");
    expect(screen.getByLabelText("Unit")).toBeInTheDocument();
  });

  it("does not price an incomplete item, and blocks saving with the exact problem", async () => {
    const calls = setup();
    await openNewItem(/By measurement/);
    await userEvent.type(screen.getByLabelText("Client name"), "R. Sharma");
    await userEvent.type(screen.getByLabelText("Item name"), "Wardrobe");
    await userEvent.type(screen.getByLabelText("Width"), "8'");
    await userEvent.type(screen.getByLabelText(/Rate \(₹ per sq\.ft\)/), "1200");
    await userEvent.click(screen.getByRole("button", { name: "Save draft" }));
    expect(await screen.findByText(/^Enter a length/)).toBeInTheDocument();
    expect(screen.getByLabelText("Height")).toHaveAttribute("aria-invalid", "true");
    expect(calls.some((c) => c.path === "/calculations/preview")).toBe(false);
    expect(calls.some((c) => c.method === "POST" && c.path === "/quotations")).toBe(false);
  });

  it("offers a minimum charge and rounding, and sends them", async () => {
    const calls = setup();
    await openNewItem(/By measurement/);
    await userEvent.type(screen.getByLabelText("Width"), "42\"");
    await userEvent.type(screen.getByLabelText("Height"), "12\"");
    await userEvent.type(screen.getByLabelText(/Rate/), "1200");
    await userEvent.type(screen.getByLabelText(/Minimum chargeable quantity/), "10");
    await userEvent.selectOptions(screen.getByLabelText("Round the quantity to"), "0");
    await userEvent.type(screen.getByLabelText("Item name"), "Shelf");
    await waitFor(() => expect(lastPreview(calls)?.body.items[0].measurement).toEqual(
      { formula: "front_area", width: "42", height: "12", minimum_quantity: "10", rounding_places: 0 }), SLOW);
  });
});

// ================= switching methods =================
describe("Switching pricing method", () => {
  const includes = () => screen.getByRole("checkbox", { name: /already includes my profit|already include my profit/ });

  it("moves the profit default with the method: selling rates for manual and measurement, cost for materials", async () => {
    setup();
    await openNewItem();
    expect(includes()).toBeChecked();                                      // manual: the typed rate IS the selling rate
    await userEvent.click(screen.getByRole("radio", { name: /By materials/ }));
    expect(includes()).not.toBeChecked();                                  // material: built up from cost, profit is added
    expect(screen.getByLabelText("Add profit as")).toBeInTheDocument();    // ...so the profit controls are open
    await userEvent.click(screen.getByRole("radio", { name: /By measurement/ }));
    expect(includes()).toBeChecked();
    await userEvent.click(screen.getByRole("radio", { name: /Manual/ }));
    expect(includes()).toBeChecked();
  });

  it("does not undo a choice the user made on purpose", async () => {
    setup();
    await openNewItem();
    await userEvent.click(includes());                                      // manual, rate is a COST rate: not the default
    expect(includes()).not.toBeChecked();
    await userEvent.click(screen.getByRole("radio", { name: /By measurement/ }));
    expect(includes()).not.toBeChecked();
  });

  it("keeps what was typed when switching", async () => {
    setup();
    await openNewItem();
    await userEvent.type(screen.getByLabelText("Item name"), "Kitchen");
    await userEvent.click(screen.getByRole("radio", { name: /By materials/ }));
    expect(screen.getByLabelText("Item name")).toHaveValue("Kitchen");
  });
});

// ================= profit =================
describe("Profit controls", () => {
  it("explain markup versus margin and only appear once profit is wanted", async () => {
    setup();
    await openNewItem();
    expect(screen.queryByLabelText("Add profit as")).not.toBeInTheDocument();   // the rate already includes profit: nothing to add
    await userEvent.click(screen.getByRole("checkbox", { name: /already includes my profit/ }));
    await userEvent.selectOptions(screen.getByLabelText("Add profit as"), "markup");
    expect(screen.getByLabelText("Markup (%)")).toBeInTheDocument();
    expect(screen.getByText(/20% markup on ₹1,000 sells for ₹1,200.*20% margin sells for ₹1,250/)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Add profit as"), "margin");
    expect(screen.getByLabelText("Margin (%)")).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Add profit as"), "fixed");
    expect(screen.getByLabelText("Profit amount (₹)")).toBeInTheDocument();
  });

  it("rejects a 100% margin before it reaches the server", async () => {
    const calls = setup();
    await openNewItem();
    await userEvent.type(screen.getByLabelText("Client name"), "R. Sharma");
    await userEvent.type(screen.getByLabelText("Item name"), "X");
    await userEvent.type(screen.getByLabelText(/Rate/), "100");
    await userEvent.click(screen.getByRole("checkbox", { name: /already includes my profit/ }));
    await userEvent.selectOptions(screen.getByLabelText("Add profit as"), "margin");
    await userEvent.type(screen.getByLabelText("Margin (%)"), "100");
    await userEvent.click(screen.getByRole("button", { name: "Save draft" }));
    expect(await screen.findByText("Margin must be below 100%.")).toBeInTheDocument();
    expect(calls.some((c) => c.method === "POST" && c.path === "/quotations")).toBe(false);
  });
});

// ================= materials =================
describe("Material pricing", () => {
  async function addPly() {
    await userEvent.type(screen.getByLabelText("Search the catalogue"), "ply");
    const results = await screen.findByRole("list", { name: "Catalogue results" }, SLOW);
    await userEvent.click(await within(results).findByRole("button", { name: /BWP Plywood/ }, SLOW));   // results arrive asynchronously
  }

  it("adds a material from the catalogue with its name, unit and current rate", async () => {
    setup();
    await openNewItem(/By materials/);
    await addPly();
    expect(screen.getByLabelText("Material")).toHaveValue("BWP Plywood 18mm");
    expect(screen.getByLabelText("Unit")).toHaveValue("sheet");
    expect(screen.getByLabelText("Quantity")).toHaveValue("1");
    expect(screen.getByLabelText("Rate (₹)")).toHaveValue("2500");
    expect(screen.queryByRole("list", { name: "Catalogue results" })).not.toBeInTheDocument();   // picker clears itself
  });

  it("offers only what the search finds and suggests a custom line when nothing matches", async () => {
    installBackend(fetchMock, defaultsHandler, noTemplates, previewHandler,
      (r) => (r.path === "/materials" ? jsonResponse(200, { items: [], total: 0, page: 1, page_size: 20, pages: 0 }) : undefined));
    await openNewItem(/By materials/);
    await userEvent.type(screen.getByLabelText("Search the catalogue"), "zzz");
    expect(await screen.findByText(/Nothing in your catalogue matches/, undefined, SLOW)).toBeInTheDocument();
  });

  it("prices the lines on the backend and sends material ids, snapshots, costs and profit as a fraction", async () => {
    const saved = quote({ items: [item({ id: "k1", pricing_method: "material", item_name: "Kitchen" })] });
    const calls = setup(getQuote(saved), (r) => (r.method === "POST" && r.path === "/quotations" ? jsonResponse(201, saved) : undefined));
    await openNewItem(/By materials/);
    await userEvent.type(screen.getByLabelText("Client name"), "R. Sharma");
    await userEvent.type(screen.getByLabelText("Item name"), "Kitchen");
    await addPly();
    await userEvent.clear(screen.getByLabelText("Quantity"));
    await userEvent.type(screen.getByLabelText("Quantity"), "5");
    await userEvent.type(itemCosts().getByLabelText("Labour"), "5000");
    await userEvent.selectOptions(screen.getByLabelText("Add profit as"), "markup");
    await userEvent.type(screen.getByLabelText("Markup (%)"), "20");

    await waitFor(() => expect(screen.getByTestId("item-0-line-0-amount")).toHaveTextContent("₹111.00"), SLOW);   // the backend's, not 5 x 2500
    expect(screen.getByTestId("item-0-amount")).toHaveTextContent("₹999.00");
    const r = screen.getByTestId("item-0-result");
    expect(r).toHaveTextContent("Materials₹500.00");
    expect(r).toHaveTextContent("Profit₹1,100.00");

    const expected = {
      pricing_method: "material", item_name: "Kitchen", description: "",
      materials: [{ material_id: "m1", name: "BWP Plywood 18mm", description: "Greenply", unit: "sheet", quantity: "5", rate: "2500" }],
      extra_costs: { labour: "5000", transportation: "0", installation: "0", other: "0" },
      profit_rule: { type: "markup", value: "0.2" },
    };
    await waitFor(() => expect(lastPreview(calls).body.items[0]).toEqual(expected), SLOW);
    await userEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expect(calls.some((c) => c.method === "POST" && c.path === "/quotations")).toBe(true));
    expect(calls.find((c) => c.method === "POST" && c.path === "/quotations")!.body.items[0]).toEqual(expected);
  });

  it("supports custom lines, and removing a line", async () => {
    const calls = setup();
    await openNewItem(/By materials/);
    await userEvent.click(screen.getByRole("button", { name: "Add a custom line" }));
    await userEvent.type(screen.getByLabelText("Material"), "Special veneer");
    await userEvent.type(screen.getByLabelText("Unit"), "sheet");
    await userEvent.clear(screen.getByLabelText("Quantity"));
    await userEvent.type(screen.getByLabelText("Quantity"), "2");
    await userEvent.type(screen.getByLabelText("Rate (₹)"), "750.50");
    await userEvent.type(screen.getByLabelText("Item name"), "Panel");
    await waitFor(() => expect(lastPreview(calls)?.body.items[0].materials).toEqual(
      [{ name: "Special veneer", description: "", unit: "sheet", quantity: "2", rate: "750.50" }]), SLOW);
    await userEvent.click(screen.getByRole("button", { name: "Remove material 1" }));
    expect(screen.queryByLabelText("Material")).not.toBeInTheDocument();
  });

  it("will not save an item with nothing in it, and flags the bad line", async () => {
    const calls = setup();
    await openNewItem(/By materials/);
    await userEvent.type(screen.getByLabelText("Client name"), "R. Sharma");
    await userEvent.type(screen.getByLabelText("Item name"), "Kitchen");
    await userEvent.click(screen.getByRole("button", { name: "Save draft" }));
    expect(await screen.findByText("Add at least one material or cost.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Add a custom line" }));
    await userEvent.click(screen.getByRole("button", { name: "Save draft" }));
    expect(await screen.findByText("Enter a material name.")).toBeInTheDocument();
    expect(screen.getByText("Enter a unit.")).toBeInTheDocument();
    expect(screen.getByText("Enter a rate like 2500 or 80.50.")).toBeInTheDocument();
    expect(calls.some((c) => c.method === "POST" && c.path === "/quotations")).toBe(false);
  });

  it("a labour-only item is fine", async () => {
    const calls = setup();
    await openNewItem(/By materials/);
    await userEvent.type(screen.getByLabelText("Item name"), "Fitting");
    await userEvent.type(itemCosts().getByLabelText("Labour"), "1500");
    await waitFor(() => expect(lastPreview(calls)?.body.items[0]).toMatchObject({ pricing_method: "material", materials: [], extra_costs: { labour: "1500" } }), SLOW);
  });
});

// ================= charges, discount, GST =================
describe("Charges, discount and tax", () => {
  it("feed the preview and the summary, with exact decimals", async () => {
    const calls = setup();
    await openNewItem();
    await userEvent.type(screen.getByLabelText("Item name"), "TV Unit");
    await userEvent.type(screen.getByLabelText(/Rate \(₹ per unit\)/), "25000");
    await userEvent.type(screen.getByLabelText("Transportation"), "2000");
    await userEvent.selectOptions(screen.getByLabelText("Type"), "percent");
    await userEvent.type(screen.getByLabelText("Discount (%)"), "7.25");
    await userEvent.click(screen.getByLabelText("Charge GST on this quotation"));
    await userEvent.type(screen.getByLabelText("GST rate (%)"), "18");

    await waitFor(() => expect(lastPreview(calls)?.body.settings).toEqual({
      charges: { labour: "0", transportation: "2000", installation: "0", miscellaneous: "0" },
      discount: { type: "percent", value: "0.0725" }, gst: { enabled: true, rate: "0.18", prices_include_tax: false }, round_to_rupee: false,
    }), SLOW);
    await waitFor(() => expect(screen.getByTestId("grand-total")).toHaveTextContent("₹1,23,456.00"), SLOW);
    const summary = within(screen.getByRole("region", { name: "Quotation summary" }));
    expect(summary.getByText("GST 18%")).toBeInTheDocument();
    expect(summary.getByText("Taxable amount")).toBeInTheDocument();
    expect(summary.getByText("₹20,877.05")).toBeInTheDocument();
  });

  it("labels GST as included when prices include it", async () => {
    setup();
    await openNewItem();
    await userEvent.click(screen.getByLabelText("Charge GST on this quotation"));
    await userEvent.type(screen.getByLabelText("GST rate (%)"), "18");
    await userEvent.click(screen.getByLabelText(/already include GST/));
    expect(within(screen.getByRole("region", { name: "Quotation summary" })).getByText("GST 18% (included)")).toBeInTheDocument();
  });

  it("starts from the company's GST settings", async () => {
    installBackend(fetchMock, (r) => (r.path === "/quotations/defaults"
      ? jsonResponse(200, { quotation_date: "2026-11-18", valid_until: "2026-12-18", payment_terms: "", terms_and_conditions: "",
          settings: { charges: { labour: "0.00", transportation: "0.00", installation: "0.00", miscellaneous: "0.00" }, discount: { type: "none", value: "0.0000" },
                      gst: { enabled: true, rate: "0.1800", prices_include_tax: true }, round_to_rupee: false } }) : undefined), noTemplates);
    renderApp("/quotations/new");
    expect(await screen.findByLabelText("Charge GST on this quotation")).toBeChecked();
    expect(screen.getByLabelText("GST rate (%)")).toHaveValue("18");
    expect(screen.getByLabelText(/already include GST/)).toBeChecked();
  });

  it("blocks saving GST with no rate and says why the total is incomplete", async () => {
    const calls = setup();
    await openNewItem();
    await userEvent.type(screen.getByLabelText("Client name"), "R. Sharma");
    await userEvent.click(screen.getByLabelText("Charge GST on this quotation"));
    await userEvent.click(screen.getByRole("button", { name: "Save draft" }));
    expect(await screen.findByText("Enter the GST rate as a percentage, e.g. 18.")).toBeInTheDocument();
    expect(screen.getByText(/need fixing before they count/)).toBeInTheDocument();
    expect(calls.some((c) => c.method === "POST" && c.path === "/quotations")).toBe(false);
  });

  it("validates the discount", async () => {
    setup();
    await openNewItem();
    await userEvent.type(screen.getByLabelText("Client name"), "R. Sharma");
    await userEvent.selectOptions(screen.getByLabelText("Type"), "percent");
    await userEvent.type(screen.getByLabelText("Discount (%)"), "150");
    await userEvent.click(screen.getByRole("button", { name: "Save draft" }));
    expect(await screen.findByText("Enter a percentage between 0 and 100.")).toBeInTheDocument();
  });

  it("shows your internal costs, labelled as not for the client", async () => {
    setup();
    await openNewItem();
    await userEvent.type(screen.getByLabelText("Item name"), "TV");
    await userEvent.type(screen.getByLabelText(/Rate/), "100");
    await waitFor(() => expect(screen.getByTestId("grand-total")).toHaveTextContent("₹1,23,456.00"), SLOW);
    const costs = screen.getByText("Your costs (internal)").closest("details")!;
    expect(costs).toHaveTextContent("Material cost₹777.00");
    expect(costs).toHaveTextContent("Profit on items₹4,648.00");
    expect(costs).toHaveTextContent("Never shown on the quotation you send.");
  });
});

// ================= editing saved quotations =================
describe("Editing saved quotations", () => {
  const measuredItem = () => item({
    id: "w1", pricing_method: "measurement", item_name: "Wardrobe", quantity: "2.0000", unit: "sq.ft", unit_rate: "1200.0000",
    calculated_quantity: "112.0000", chargeable_quantity: "112.0000", total: "134400.00",
    measurement: { formula: "front_area", width: "96.000", height: "84.000", depth: null, length: null, running_dimension: "width", minimum_quantity: "10.0000", rounding_places: 2 },
  });
  const materialItem = () => item({
    id: "k1", pricing_method: "material", item_name: "Kitchen", quantity: null, unit: "set", unit_rate: "27888.0000", total: "27888.00",
    material_cost: "18240.00", labour_cost: "5000.00", profit: "4648.00", rate_includes_profit: false, line_amounts: [],
    materials: [{ id: "l1", material_id: "m1", name: "BWP Plywood 18mm", description: "Greenply", unit: "sheet", quantity: "5.0000", rate: "2500.0000", amount: "12500.00" }],
    extra_costs: { labour: "5000.00", transportation: "0.00", installation: "0.00", other: "0.00" }, profit_rule: { type: "markup", value: "0.2000" },
  });
  const open = (items: ReturnType<typeof item>[], ...extra: Handler[]) =>
    installBackend(fetchMock, getQuote(quote({ items, totals: totals({ grand_total: "162288.00" }) })), noTemplates, materialsHandler, previewHandler, ...extra);

  it("shows a saved measurement the way it was typed, and a saved material item with its lines", async () => {
    open([measuredItem(), materialItem()]);
    renderApp("/quotations/q1");
    await userEvent.click(await screen.findByRole("button", { name: /Wardrobe/, expanded: false }));
    expect(screen.getByLabelText("Width")).toHaveValue("8'");
    expect(screen.getByLabelText("Height")).toHaveValue("7'");
    expect(screen.getByLabelText("Number of pieces")).toHaveValue("2");
    expect(screen.getByLabelText(/Minimum chargeable quantity/)).toHaveValue("10");
    expect(screen.getByLabelText("Round the quantity to")).toHaveValue("2");

    await userEvent.click(screen.getByRole("button", { name: /Kitchen/, expanded: false }));
    expect(screen.getByLabelText("Material")).toHaveValue("BWP Plywood 18mm");
    expect(screen.getByLabelText("Rate (₹)")).toHaveValue("2500");
    expect(itemCosts().getByLabelText("Labour")).toHaveValue("5000");
    expect(screen.getByLabelText("Markup (%)")).toHaveValue("20");
    expect(screen.getByRole("checkbox", { name: /already include my profit/ })).not.toBeChecked();
  });

  it("re-saves a measurement item unchanged: same inches, same line ids", async () => {
    const calls = open([measuredItem(), materialItem()], (r) => (r.method === "PUT" ? jsonResponse(200, quote()) : undefined));
    renderApp("/quotations/q1");
    await userEvent.type(await screen.findByLabelText(/Phone/), "9");
    await userEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expect(calls.some((c) => c.method === "PUT")).toBe(true));
    const [w, k] = calls.find((c) => c.method === "PUT")!.body.items;
    expect(w).toMatchObject({ id: "w1", pricing_method: "measurement", quantity: "2", measurement: { formula: "front_area", width: "96", height: "84", minimum_quantity: "10", rounding_places: 2 } });
    expect(k).toMatchObject({ id: "k1", materials: [{ id: "l1", material_id: "m1", rate: "2500", quantity: "5" }], profit_rule: { type: "markup", value: "0.2" } });
    expect("rate_includes_profit" in k).toBe(false);          // the default for materials: not sent
  });

  it("opens the item the server objects to and marks the exact field", async () => {
    open([measuredItem()], (r) => (r.method === "PUT"
      ? apiError(422, "calculation_error", "Enter the height.", [{ field: "items.0.measurement.height", message: "Enter the height." }]) : undefined));
    renderApp("/quotations/q1");
    await userEvent.type(await screen.findByLabelText(/Phone/), "9");
    await userEvent.click(screen.getByRole("button", { name: "Save draft" }));
    const height = await screen.findByLabelText("Height", undefined, SLOW);        // the collapsed item opened by itself
    expect(height).toHaveAttribute("aria-invalid", "true");
    expect(document.getElementById("item-0-height-error")).toHaveTextContent("Enter the height.");
  });

  it("maps a server-side settings error onto the GST field", async () => {
    open([item()], (r) => (r.method === "PUT"
      ? apiError(422, "calculation_error", "Enter a GST rate, or turn GST off.", [{ field: "settings.gst.rate", message: "Enter a GST rate, or turn GST off." }]) : undefined));
    renderApp("/quotations/q1");
    await userEvent.type(await screen.findByLabelText(/Phone/), "9");
    await userEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expect(screen.getAllByText("Enter a GST rate, or turn GST off.").length).toBeGreaterThan(0), SLOW);
  });
});
