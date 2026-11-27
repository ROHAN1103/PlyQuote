import { jsonResponse, type Handler } from "@/test/utils";
import type { Quotation, QuotationItem, QuotationSummary } from "@/features/quotations/types";

export const SETTINGS = {
  charges: { labour: "0.00", transportation: "0.00", installation: "0.00", miscellaneous: "0.00" },
  discount: { type: "none", value: "0.0000" }, gst: { enabled: false, rate: null, prices_include_tax: false }, round_to_rupee: false,
} as const;
export const DEFAULTS = { quotation_date: "2026-11-18", valid_until: "2026-12-18", payment_terms: "50% advance", terms_and_conditions: "Standard T&C", settings: SETTINGS };
export const totals = (over: Record<string, string> = {}) => ({
  subtotal: "92200.00", additional_charges: "0.00", discount: "0.00", taxable_amount: "92200.00", tax_amount: "0.00",
  rounding_adjustment: "0.00", grand_total: "92200.00", material_cost: "0.00", profit: "0.00", ...over,
});
export const ZERO_COSTS = { material_cost: "0.00", labour_cost: "0.00", additional_cost: "0.00", profit: "0.00" };
export const NO_EXTRA = { labour: "0.00", transportation: "0.00", installation: "0.00", other: "0.00" };

export const item = (over: Partial<QuotationItem> = {}): QuotationItem => ({
  id: "i1", position: 0, pricing_method: "manual", item_name: "Wardrobe", description: "", quantity: "1.0000", unit: "pc",
  unit_rate: "67200.0000", calculated_quantity: "1.0000", chargeable_quantity: "1.0000", total: "67200.00", line_amounts: [],
  measurement: null, materials: [], extra_costs: NO_EXTRA, profit_rule: { type: "none", value: "0.0000" }, rate_includes_profit: true,
  ...ZERO_COSTS, ...over,
});
export const quote = (over: Partial<Quotation> = {}): Quotation => ({
  id: "q1", quotation_number: "QT-2026-0001", status: "draft", effective_status: "draft", currency: "INR", revision: 1, row_version: 3,
  project_name: "Sharma Residence", project_location: "", client: { name: "R. Sharma", phone: "", email: null, address: "" },
  quotation_date: "2026-11-18", valid_until: "2026-12-18", notes: "", payment_terms: "", terms_and_conditions: "",
  company: { name: "Acme", address: "", phone: "", email: null, gstin: "", document_footer: "" }, settings: SETTINGS,
  items: [item(), item({ id: "i2", position: 1, item_name: "TV Unit", unit_rate: "25000.0000", total: "25000.00" })],
  totals: totals(), created_at: "", updated_at: "", ...over,
});
export const summary = (over: Partial<QuotationSummary> = {}): QuotationSummary => ({
  id: "q1", quotation_number: "QT-2026-0001", status: "draft", effective_status: "draft", project_name: "Sharma Residence",
  client_name: "R. Sharma", quotation_date: "2026-11-18", valid_until: "2026-12-18", grand_total: "92200.00", revision: 1, updated_at: "", ...over,
});

/** The fake preview returns numbers that browser-side arithmetic could never produce, to prove the UI shows the backend's. */
export const previewHandler: Handler = (r) => r.method === "POST" && r.path === "/calculations/preview"
  ? jsonResponse(200, {
      items: (r.body.items as { pricing_method: string; materials?: unknown[] }[]).map((i) => ({
        pricing_method: i.pricing_method, calculated_quantity: "56.0000", chargeable_quantity: "56.5000", unit: "sq.ft", unit_rate: "1.0000",
        material_cost: "500.00", labour_cost: "5000.00", additional_cost: "0.00", profit: "1100.00", total: "999.00",
        line_amounts: (i.materials ?? []).map(() => "111.00"),
      })),
      totals: totals({ subtotal: "123456.00", grand_total: "123456.00", material_cost: "777.00", profit: "4648.00", tax_amount: "20877.05" }),
    })
  : undefined;
export const defaultsHandler: Handler = (r) => (r.path === "/quotations/defaults" ? jsonResponse(200, DEFAULTS) : undefined);
export const noTemplates: Handler = (r) => (r.path === "/furniture-templates" ? jsonResponse(200, []) : undefined);
export const getQuote = (q: Quotation): Handler => (r) => (r.method === "GET" && r.path === `/quotations/${q.id}` ? jsonResponse(200, q) : undefined);
