import { describe, expect, it } from "vitest";
import {
  emptyForm, itemIsComplete, newItem, quotationFormSchema, serverFieldToFormField, settingsAreComplete, toFormValues, toItemPayload,
  toPayload, type ItemFormValues, type QuotationFormValues,
} from "./quotationSchema";
import type { Quotation, QuotationItem, SettingsData } from "../types";

const SETTINGS: SettingsData = {
  charges: { labour: "0.00", transportation: "0.00", installation: "0.00", miscellaneous: "0.00" },
  discount: { type: "none", value: "0.0000" }, gst: { enabled: false, rate: null, prices_include_tax: false }, round_to_rupee: false,
};
const defaults = { quotation_date: "2026-11-18", valid_until: "2026-12-18", payment_terms: "50% advance", terms_and_conditions: "T&C", settings: SETTINGS };
const manual = (over: Partial<ItemFormValues> = {}) => newItem({ item_name: "Wardrobe", unit_rate: "67200", ...over });
const measured = (over: Partial<ItemFormValues> = {}) => newItem({ pricing_method: "measurement", item_name: "Wardrobe", unit_rate: "1200", width: "8'", height: "7'", ...over });
const material = (over: Partial<ItemFormValues> = {}) => newItem({
  pricing_method: "material", item_name: "Kitchen",
  materials: [{ material_id: "", name: "Plywood", description: "", unit: "sheet", quantity: "5", rate: "2500" }], ...over,
});
const valid = (over: Partial<QuotationFormValues> = {}): QuotationFormValues => ({ ...emptyForm(defaults), client_name: "R. Sharma", items: [manual()], ...over });

const problems = (v: object) => {
  const r = quotationFormSchema.safeParse(v);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
};
const itemProblems = (i: ItemFormValues) => problems(valid({ items: [i] })).map((p) => p.replace(/^items\.0\./, ""));

describe("quotation header and settings validation", () => {
  it("accepts a complete quotation, or a draft with no items", () => {
    expect(problems(valid())).toEqual([]);
    expect(problems(valid({ items: [] }))).toEqual([]);
  });
  it("requires a client name and nothing else in the header", () => {
    expect(problems(valid({ client_name: " " }))).toEqual(["client_name: Enter the client's name."]);
  });
  it("puts a bad validity date on valid_until", () => {
    expect(problems(valid({ valid_until: "2026-11-01" }))).toEqual(["valid_until: The validity date can't be before the quotation date."]);
  });
  it.each([["client_email", "nope", "valid email"], ["client_phone", "call me", "digits"]])("validates %s", (f, v, text) =>
    expect(problems(valid({ [f]: v }))[0]).toContain(text));

  it("validates charges, discount and GST", () => {
    expect(problems(valid({ charge_labour: "abc" }))[0]).toContain("charge_labour");
    expect(problems(valid({ discount_type: "percent", discount_value: "150" }))[0]).toContain("between 0 and 100");
    expect(problems(valid({ discount_type: "percent", discount_value: "" }))[0]).toContain("discount_value");
    expect(problems(valid({ discount_type: "fixed", discount_value: "x" }))[0]).toContain("discount amount");
    expect(problems(valid({ gst_enabled: true, gst_rate_percent: "" }))).toEqual(["gst_rate_percent: Enter the GST rate as a percentage, e.g. 18."]);
    expect(problems(valid({ gst_enabled: true, gst_rate_percent: "18" }))).toEqual([]);
    expect(problems(valid({ gst_enabled: false, gst_rate_percent: "" }))).toEqual([]);
    expect(problems(valid({ discount_type: "fixed", discount_value: "2500", charge_labour: "1,000" }))[0]).toContain("charge_labour");
  });
  it("tells the preview whether the settings are usable", () => {
    expect(settingsAreComplete(valid())).toBe(true);
    expect(settingsAreComplete(valid({ gst_enabled: true, gst_rate_percent: "" }))).toBe(false);
  });
});

describe("manual items", () => {
  it.each(["0", "-1", "abc", "1.23456", ""])("rejects quantity %j", (q) => expect(itemProblems(manual({ quantity: q })).some((p) => p.startsWith("quantity"))).toBe(true));
  it("needs a unit and a rate", () => {
    const p = itemProblems(manual({ unit: " ", unit_rate: "" }));
    expect(p.some((x) => x.startsWith("unit:"))).toBe(true);
    expect(p.some((x) => x.startsWith("unit_rate"))).toBe(true);
  });
  it("accepts a zero rate", () => expect(itemProblems(manual({ unit_rate: "0" }))).toEqual([]));
});

describe("measurement items", () => {
  it("accepts feet, inches and decimal feet in any dimension", () => {
    for (const [w, h] of [["8'", "7'"], ["96\"", "84\""], ["8", "7"], ["8' 0\"", "6' 6.5\""], ["8ft", "84in"]]) {
      expect(itemProblems(measured({ width: w, height: h })), `${w} x ${h}`).toEqual([]);
    }
  });
  it("names the missing dimension and explains what is accepted", () => {
    const p = itemProblems(measured({ height: "" }));
    expect(p).toHaveLength(1);
    expect(p[0]).toMatch(/^height: Enter a length/);
    expect(itemProblems(measured({ width: "abc" }))[0]).toMatch(/^width: Use a form like/);
    expect(itemProblems(measured({ width: "0" }))[0]).toMatch(/more than zero/);
  });
  it("only requires the dimensions the formula uses", () => {
    expect(itemProblems(measured({ formula: "side_area", width: "", height: "7'", depth: "2'" }))).toEqual([]);
    expect(itemProblems(measured({ formula: "side_area", width: "", height: "7'", depth: "" }))[0]).toMatch(/^depth/);
    expect(itemProblems(measured({ formula: "running_feet", running_dimension: "length", length: "9'", width: "", height: "" }))).toEqual([]);
    expect(itemProblems(measured({ formula: "running_feet", running_dimension: "length", length: "" }))[0]).toMatch(/^length/);
    expect(itemProblems(measured({ formula: "piece", width: "", height: "" }))).toEqual([]);
  });
  it("manual quantity needs a unit; other formulas derive theirs", () => {
    expect(itemProblems(measured({ formula: "manual_quantity", unit: "" }))[0]).toMatch(/^unit/);
    expect(itemProblems(measured({ formula: "manual_quantity", unit: "ft" }))).toEqual([]);
    expect(itemProblems(measured({ unit: "" }))).toEqual([]);
  });
  it("validates the minimum charge and rounding", () => {
    expect(itemProblems(measured({ minimum_quantity: "x" }))[0]).toMatch(/^minimum_quantity/);
    expect(itemProblems(measured({ minimum_quantity: "10" }))).toEqual([]);
    expect(itemProblems(measured({ rounding_places: "5" }))[0]).toMatch(/^rounding_places/);
  });
});

describe("material items", () => {
  it("accepts materials with costs", () => expect(itemProblems(material({ labour: "5000" }))).toEqual([]));
  it("needs at least one material or cost", () => {
    expect(itemProblems(material({ materials: [] }))).toEqual(["materials: Add at least one material or cost."]);
    expect(itemProblems(material({ materials: [], labour: "1500" }))).toEqual([]);
  });
  it("points at the wrong line and field", () => {
    const p = itemProblems(material({ materials: [
      { material_id: "", name: "OK", description: "", unit: "pc", quantity: "1", rate: "1" },
      { material_id: "", name: "", description: "", unit: "", quantity: "0", rate: "x" },
    ] }));
    expect(p.map((x) => x.split(":")[0]).sort()).toEqual(["materials.1.name", "materials.1.quantity", "materials.1.rate", "materials.1.unit"]);
  });
  it("validates other costs", () => expect(itemProblems(material({ labour: "1,000" }))[0]).toMatch(/^labour/));
});

describe("profit", () => {
  it("is ignored while the rate already includes profit", () => {
    expect(itemProblems(manual({ rate_includes_profit: true, profit_type: "markup", profit_value: "garbage" }))).toEqual([]);
  });
  it("is validated when it applies", () => {
    expect(itemProblems(manual({ rate_includes_profit: false, profit_type: "markup", profit_value: "" }))[0]).toMatch(/^profit_value/);
    expect(itemProblems(manual({ rate_includes_profit: false, profit_type: "markup", profit_value: "20" }))).toEqual([]);
    expect(itemProblems(manual({ rate_includes_profit: false, profit_type: "margin", profit_value: "100" }))[0]).toMatch(/below 100%/);
    expect(itemProblems(manual({ rate_includes_profit: false, profit_type: "margin", profit_value: "99.99" }))).toEqual([]);
    expect(itemProblems(manual({ rate_includes_profit: false, profit_type: "fixed", profit_value: "5000" }))).toEqual([]);
    expect(itemProblems(manual({ rate_includes_profit: false, profit_type: "fixed", profit_value: "x" }))[0]).toMatch(/^profit_value/);
  });
});

describe("item payloads", () => {
  it("a plain manual item sends exactly what it always did", () => {
    expect(toItemPayload(manual())).toEqual({ pricing_method: "manual", item_name: "Wardrobe", description: "", quantity: "1", unit: "pc", unit_rate: "67200" });
  });
  it("measurement items send inches, only the dimensions the formula needs, and no unit", () => {
    expect(toItemPayload(measured({ depth: "2'", length: "99'" }))).toEqual({
      pricing_method: "measurement", item_name: "Wardrobe", description: "", quantity: "1", unit: "", unit_rate: "1200",
      measurement: { formula: "front_area", width: "96", height: "84", rounding_places: 2 },
    });
    const run = toItemPayload(measured({ formula: "running_feet", running_dimension: "height", height: "6' 6.5\"", minimum_quantity: "10", rounding_places: "0" }));
    expect(run.measurement).toEqual({ formula: "running_feet", height: "78.5", running_dimension: "height", minimum_quantity: "10", rounding_places: 0 });
    expect(toItemPayload(measured({ formula: "manual_quantity", unit: "ft" })).unit).toBe("ft");
    expect(toItemPayload(measured({ formula: "piece" })).measurement).toEqual({ formula: "piece", rounding_places: 2 });
  });
  it("material items send lines and costs (blank costs as 0)", () => {
    const p = toItemPayload(material({ labour: "5000", other: "250.50" }));
    expect(p.materials).toEqual([{ name: "Plywood", description: "", unit: "sheet", quantity: "5", rate: "2500" }]);
    expect(p.extra_costs).toEqual({ labour: "5000", transportation: "0", installation: "0", other: "250.50" });
    expect(p.quantity).toBeUndefined();
    const linked = toItemPayload(material({ materials: [{ id: "L1", material_id: "M1", name: "Ply", description: "Greenply", unit: "sheet", quantity: "1", rate: "1" }] }));
    expect(linked.materials![0]).toMatchObject({ id: "L1", material_id: "M1" });
  });
  it("sends profit as a fraction for markup and margin, as rupees for fixed, and only when it applies", () => {
    expect(toItemPayload(material({ profit_type: "markup", profit_value: "20" })).profit_rule).toEqual({ type: "markup", value: "0.2" });
    expect(toItemPayload(material({ profit_type: "margin", profit_value: "12.5" })).profit_rule).toEqual({ type: "margin", value: "0.125" });
    expect(toItemPayload(material({ profit_type: "fixed", profit_value: "5000" })).profit_rule).toEqual({ type: "fixed", value: "5000" });
    expect(toItemPayload(material({ profit_type: "none" })).profit_rule).toBeUndefined();
    expect(toItemPayload(manual({ profit_type: "markup", profit_value: "20" })).profit_rule).toBeUndefined();   // includes profit: never added twice
  });
  it("sends rate_includes_profit only when it differs from the method's default", () => {
    expect(toItemPayload(manual()).rate_includes_profit).toBeUndefined();
    expect(toItemPayload(material()).rate_includes_profit).toBeUndefined();
    expect(toItemPayload(manual({ rate_includes_profit: false })).rate_includes_profit).toBe(false);
    expect(toItemPayload(material({ rate_includes_profit: true })).rate_includes_profit).toBe(true);
  });
  it("omits the id of new items and keeps existing ones", () => {
    expect("id" in toItemPayload(manual())).toBe(false);
    expect(toItemPayload(manual({ id: "abc" })).id).toBe("abc");
  });
});

describe("quotation payload and settings", () => {
  it("never sends totals, and builds settings with exact decimals", () => {
    const p = toPayload(valid({ charge_transportation: "2000", discount_type: "percent", discount_value: "7.25", gst_enabled: true, gst_rate_percent: "18", prices_include_tax: true, round_to_rupee: true }));
    expect(p.settings).toEqual({
      charges: { labour: "0", transportation: "2000", installation: "0", miscellaneous: "0" },
      discount: { type: "percent", value: "0.0725" }, gst: { enabled: true, rate: "0.18", prices_include_tax: true }, round_to_rupee: true,
    });
    expect("totals" in p || "grand_total" in p).toBe(false);
    expect(p.client).toEqual({ name: "R. Sharma", phone: "", email: null, address: "" });
  });
  it("sends a fixed discount in rupees and a disabled GST with no rate", () => {
    expect(toPayload(valid({ discount_type: "fixed", discount_value: "2500.50" })).settings.discount).toEqual({ type: "fixed", value: "2500.50" });
    expect(toPayload(valid()).settings.gst).toEqual({ enabled: false, rate: null, prices_include_tax: false });
  });
});

describe("loading a saved quotation into the form", () => {
  const savedItem = (over: Partial<QuotationItem>): QuotationItem => ({
    id: "i1", position: 0, pricing_method: "manual", item_name: "X", description: "", quantity: "1.0000", unit: "pc", unit_rate: "100.0000",
    calculated_quantity: "1.0000", chargeable_quantity: "1.0000", material_cost: "0.00", labour_cost: "0.00", additional_cost: "0.00",
    profit: "0.00", total: "100.00", line_amounts: [], measurement: null, materials: [], extra_costs: { labour: "0.00", transportation: "0.00", installation: "0.00", other: "0.00" },
    profit_rule: { type: "none", value: "0.0000" }, rate_includes_profit: true, ...over,
  });
  const quote = (items: QuotationItem[], settings: SettingsData = SETTINGS) => ({
    project_name: "", project_location: "", client: { name: "C", phone: "", email: null, address: "" }, quotation_date: "2026-11-18",
    valid_until: "2026-12-18", notes: "", payment_terms: "", terms_and_conditions: "", settings, items,
  }) as unknown as Quotation;

  it("shows saved inches as feet and inches, and a saved measurement round-trips to the same payload", () => {
    const item = savedItem({
      pricing_method: "measurement", quantity: "2.0000", unit: "sq.ft", unit_rate: "1200.0000",
      measurement: { formula: "front_area", width: "96.000", height: "84.500", depth: null, length: null, running_dimension: "width", minimum_quantity: "10.0000", rounding_places: 3 },
    });
    const form = toFormValues(quote([item])).items[0]!;
    expect(form).toMatchObject({ width: "8'", height: "7' 0.5\"", quantity: "2", unit: "", unit_rate: "1200", minimum_quantity: "10", rounding_places: "3" });
    expect(toItemPayload(form).measurement).toEqual({ formula: "front_area", width: "96", height: "84.5", minimum_quantity: "10", rounding_places: 3 });
  });
  it("restores material lines, costs and profit (as a percentage)", () => {
    const item = savedItem({
      pricing_method: "material", quantity: null, unit: "set", unit_rate: "27888.0000", rate_includes_profit: false,
      materials: [{ id: "L1", material_id: "M1", name: "Ply", description: "Greenply", unit: "sheet", quantity: "5.0000", rate: "2500.0000", amount: "12500.00" }],
      extra_costs: { labour: "5000.00", transportation: "0.00", installation: "0.00", other: "0.00" }, profit_rule: { type: "markup", value: "0.2000" },
    });
    const form = toFormValues(quote([item])).items[0]!;
    expect(form).toMatchObject({ labour: "5000", transportation: "", unit_rate: "", profit_type: "markup", profit_value: "20", rate_includes_profit: false });
    expect(form.materials).toEqual([{ id: "L1", material_id: "M1", name: "Ply", description: "Greenply", unit: "sheet", quantity: "5", rate: "2500" }]);
    expect(toItemPayload(form).profit_rule).toEqual({ type: "markup", value: "0.2" });
  });
  it("restores charges, discount and GST as the user typed them", () => {
    const settings: SettingsData = { charges: { labour: "0.00", transportation: "2000.00", installation: "0.00", miscellaneous: "0.00" },
      discount: { type: "percent", value: "0.0500" }, gst: { enabled: true, rate: "0.1800", prices_include_tax: false }, round_to_rupee: true };
    expect(toFormValues(quote([], settings))).toMatchObject({ charge_transportation: "2000", charge_labour: "", discount_type: "percent",
      discount_value: "5", gst_enabled: true, gst_rate_percent: "18", round_to_rupee: true });
  });
  it("a loaded item counts as complete for the preview", () => {
    expect(itemIsComplete(toFormValues(quote([savedItem({})])).items[0]!)).toBe(true);
  });
});

describe("server field paths", () => {
  it.each([
    ["client.name", "client_name"], ["items.1.quantity", "items.1.quantity"], ["valid_until", "valid_until"],
    ["items.0.measurement.height", "items.0.height"], ["items.2.measurement.formula", "items.2.formula"],
    ["items.0.extra_costs.labour", "items.0.labour"], ["items.0.profit_rule.value", "items.0.profit_value"],
    ["items.0.materials.1.quantity", "items.0.materials.1.quantity"], ["items.0.materials", "items.0.materials"],
    ["settings.charges.labour", "charge_labour"], ["settings.discount.value", "discount_value"], ["settings.gst.rate", "gst_rate_percent"],
  ])("%s -> %s", (server, form) => expect(serverFieldToFormField(server)).toBe(form));
});
