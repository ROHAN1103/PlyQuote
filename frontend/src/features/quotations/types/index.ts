export type PricingMethod = "manual" | "measurement" | "material";
export type QuotationStatus = "draft" | "finalized" | "sent" | "accepted" | "rejected";
export type EffectiveStatus = QuotationStatus | "expired";

/** Money, quantities and rates are decimal strings exactly as the API sends them. */
export type Totals = { subtotal: string; additional_charges: string; discount: string; tax_amount: string; grand_total: string };

export type ItemResult = {
  pricing_method: PricingMethod;
  calculated_quantity: string;
  chargeable_quantity: string;
  unit: string;
  unit_rate: string;
  total: string;
};

export type QuotationItem = ItemResult & {
  id: string;
  position: number;
  item_name: string;
  description: string;
  quantity: string;
};

export type Client = { name: string; phone: string; email: string | null; address: string };
export type CompanySnapshot = { name: string; address: string; phone: string; email: string | null; gstin: string; document_footer: string };

export type Quotation = {
  id: string;
  quotation_number: string;
  status: QuotationStatus;
  effective_status: EffectiveStatus;
  currency: string;
  revision: number;
  row_version: number;
  project_name: string;
  project_location: string;
  client: Client;
  quotation_date: string;
  valid_until: string;
  notes: string;
  payment_terms: string;
  terms_and_conditions: string;
  company: CompanySnapshot;
  items: QuotationItem[];
  totals: Totals;
  created_at: string;
  updated_at: string;
};

export type QuotationSummary = {
  id: string;
  quotation_number: string;
  status: QuotationStatus;
  effective_status: EffectiveStatus;
  project_name: string;
  client_name: string;
  quotation_date: string;
  valid_until: string;
  grand_total: string;
  revision: number;
  updated_at: string;
};

export type QuotationDefaults = { quotation_date: string; valid_until: string; payment_terms: string; terms_and_conditions: string };

export type ItemPayload = {
  id?: string;
  pricing_method: PricingMethod;
  item_name: string;
  description: string;
  quantity: string;
  unit: string;
  unit_rate: string;
};

export type QuotationPayload = {
  project_name: string;
  project_location: string;
  client: Client;
  quotation_date: string;
  valid_until: string;
  notes: string;
  payment_terms: string;
  terms_and_conditions: string;
  items: ItemPayload[];
};

export type PreviewResponse = { items: ItemResult[]; totals: Totals };
export type Page<T> = { items: T[]; total: number; page: number; page_size: number; pages: number };

export type StatusFilter = "" | EffectiveStatus;
export type QuotationFilters = { q: string; status: StatusFilter; page: number };

export const PAGE_SIZE = 20;
export const UNIT_SUGGESTIONS = ["pc", "set", "sq.ft", "r.ft", "nos", "lump sum"];
export const STATUS_LABELS: Record<EffectiveStatus, string> = {
  draft: "Draft", finalized: "Finalized", sent: "Sent", accepted: "Accepted", rejected: "Rejected", expired: "Expired",
};
