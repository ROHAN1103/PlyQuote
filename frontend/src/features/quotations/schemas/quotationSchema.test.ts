import { describe, expect, it } from "vitest";
import {
  emptyForm, isPreviewable, newItem, quotationFormSchema, serverFieldToFormField, toFormValues, toPayload,
  type QuotationFormValues,
} from "./quotationSchema";
import type { Quotation } from "../types";

const defaults = { quotation_date: "2026-11-18", valid_until: "2026-12-18", payment_terms: "50% advance", terms_and_conditions: "T&C" };
const valid = (over: Partial<QuotationFormValues> = {}): QuotationFormValues => ({
  ...emptyForm(defaults), client_name: "R. Sharma", items: [newItem({ item_name: "Wardrobe", unit_rate: "67200" })], ...over,
});
const problems = (v: object) => {
  const r = quotationFormSchema.safeParse(v);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
};

describe("quotation form schema", () => {
  it("accepts a complete quotation", () => expect(problems(valid())).toEqual([]));
  it("accepts a draft with no items", () => expect(problems(valid({ items: [] }))).toEqual([]));

  it("requires a client name, and nothing else in the header", () => {
    expect(problems(valid({ client_name: " " }))).toEqual(["client_name: Enter the client's name."]);
    expect(problems(valid({ client_phone: "", client_email: "", client_address: "", project_name: "", project_location: "" }))).toEqual([]);
  });

  it.each([["client_email", "nope", "Enter a valid email address."], ["client_phone", "call me", "digits"]])(
    "validates %s", (field, value, text) => expect(problems(valid({ [field]: value }))[0]).toContain(text));

  it("rejects a validity date before the quotation date, on the valid_until field", () => {
    expect(problems(valid({ valid_until: "2026-11-01" }))).toEqual(["valid_until: The validity date can't be before the quotation date."]);
  });

  it.each(["0", "0.0", "-1", "abc", "1.23456", ""])("rejects quantity %j", (q) => {
    expect(problems(valid({ items: [newItem({ item_name: "X", unit_rate: "1", quantity: q })] })).some((p) => p.startsWith("items.0.quantity"))).toBe(true);
  });
  it.each(["1", "2.5", "0.0001", "9999999999.9999"])("accepts quantity %s", (q) => {
    expect(problems(valid({ items: [newItem({ item_name: "X", unit_rate: "1", quantity: q })] }))).toEqual([]);
  });
  it.each(["-5", "x", "1.23456", ""])("rejects rate %j", (r) => {
    expect(problems(valid({ items: [newItem({ item_name: "X", unit_rate: r })] })).some((p) => p.startsWith("items.0.unit_rate"))).toBe(true);
  });
  it("accepts a zero rate", () => expect(problems(valid({ items: [newItem({ item_name: "Free", unit_rate: "0" })] }))).toEqual([]));

  it("requires item name and unit", () => {
    const p = problems(valid({ items: [newItem({ item_name: " ", unit: "", unit_rate: "1" })] }));
    expect(p.some((x) => x.startsWith("items.0.item_name"))).toBe(true);
    expect(p.some((x) => x.startsWith("items.0.unit"))).toBe(true);
  });
});

describe("payload mapping", () => {
  it("nests client details, nulls a blank email, and omits ids of new items", () => {
    const p = toPayload(valid());
    expect(p.client).toEqual({ name: "R. Sharma", phone: "", email: null, address: "" });
    expect(p.items[0]).toEqual({ pricing_method: "manual", item_name: "Wardrobe", description: "", quantity: "1", unit: "pc", unit_rate: "67200" });
    expect("id" in p.items[0]!).toBe(false);
    expect("totals" in p || "grand_total" in p).toBe(false);   // the browser never sends totals
  });

  it("keeps the server id of existing items", () => {
    const p = toPayload(valid({ items: [newItem({ id: "abc", item_name: "X", unit_rate: "1" })] }));
    expect(p.items[0]!.id).toBe("abc");
  });

  it("round-trips a saved quotation into form values with friendly numbers", () => {
    const q = {
      project_name: "P", project_location: "L", client: { name: "C", phone: "1", email: null, address: "A" },
      quotation_date: "2026-11-18", valid_until: "2026-12-18", notes: "", payment_terms: "", terms_and_conditions: "",
      items: [{ id: "i1", position: 0, pricing_method: "manual", item_name: "X", description: "", quantity: "2.5000", unit: "pc", unit_rate: "1200.0000", calculated_quantity: "2.5000", chargeable_quantity: "2.5000", total: "3000.00" }],
    } as unknown as Quotation;
    const v = toFormValues(q);
    expect(v.items[0]).toMatchObject({ id: "i1", quantity: "2.5", unit_rate: "1200" });
    expect(v.client_email).toBe("");
  });

  it("maps server field paths onto form fields", () => {
    expect(serverFieldToFormField("client.name")).toBe("client_name");
    expect(serverFieldToFormField("client.email")).toBe("client_email");
    expect(serverFieldToFormField("items.1.quantity")).toBe("items.1.quantity");
    expect(serverFieldToFormField("valid_until")).toBe("valid_until");
  });

  it("previews only items it can price", () => {
    expect(isPreviewable(newItem({ item_name: "X", unit_rate: "10" }))).toBe(true);
    expect(isPreviewable(newItem({ unit_rate: "" }))).toBe(false);
    expect(isPreviewable(newItem({ unit_rate: "10", quantity: "0" }))).toBe(false);
    expect(isPreviewable(newItem({ unit_rate: "10", pricing_method: "measurement" }))).toBe(false);
  });
});
