export type PricingMethod = "manual" | "measurement" | "material";
export type QuotationStatus = "draft" | "finalized" | "sent" | "accepted" | "rejected";
export type EffectiveStatus = QuotationStatus | "expired";

export type Formula = "front_area" | "side_area" | "top_bottom_area" | "square_feet" | "running_feet" | "piece" | "manual_quantity";
export type Dimension = "width" | "height" | "depth" | "length";
export type ProfitType = "none" | "markup" | "margin" | "fixed";
export type DiscountType = "none" | "percent" | "fixed";

/** Money, quantities and rates are decimal strings exactly as the API sends them. */
export type Totals = {
  subtotal: string; additional_charges: string; discount: string; taxable_amount: string; tax_amount: string;
  rounding_adjustment: string; grand_total: string;
  material_cost: string; profit: string;   // internal: never shown to the client
};

export type ItemResult = {
  pricing_method: PricingMethod;
  calculated_quantity: string;
  chargeable_quantity: string;
  unit: string;
  unit_rate: string;
  material_cost: string;
  labour_cost: string;
  additional_cost: string;
  profit: string;
  total: string;
  line_amounts: string[];
};

/** Dimensions are inches, as decimal strings. */
export type MeasurementData = {
  formula: Formula; width: string | null; height: string | null; depth: string | null; length: string | null;
  running_dimension: Dimension; minimum_quantity: string | null; rounding_places: number;
};
export type MaterialLineData = {
  id: string; material_id: string | null; name: string; description: string; unit: string; quantity: string; rate: string; amount: string;
};
export type ExtraCosts = { labour: string; transportation: string; installation: string; other: string };
export type ProfitRule = { type: ProfitType; value: string };

export type SettingsData = {
  charges: { labour: string; transportation: string; installation: string; miscellaneous: string };
  discount: { type: DiscountType; value: string };
  gst: { enabled: boolean; rate: string | null; prices_include_tax: boolean };
  round_to_rupee: boolean;
};

export type QuotationItem = ItemResult & {
  id: string;
  position: number;
  item_name: string;
  description: string;
  quantity: string | null;
  measurement: MeasurementData | null;
  materials: MaterialLineData[];
  extra_costs: ExtraCosts;
  profit_rule: ProfitRule;
  rate_includes_profit: boolean;
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
  settings: SettingsData;
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

export type QuotationDefaults = {
  quotation_date: string; valid_until: string; payment_terms: string; terms_and_conditions: string; settings: SettingsData;
};

export type MaterialLinePayload = {
  id?: string; material_id?: string; name: string; description: string; unit: string; quantity: string; rate: string;
};

export type ItemPayload = {
  id?: string;
  pricing_method: PricingMethod;
  item_name: string;
  description: string;
  quantity?: string;
  unit?: string;
  unit_rate?: string;
  measurement?: {
    formula: Formula; width?: string; height?: string; depth?: string; length?: string;
    running_dimension?: Dimension; minimum_quantity?: string; rounding_places: number;
  };
  materials?: MaterialLinePayload[];
  extra_costs?: ExtraCosts;
  profit_rule?: ProfitRule;
  rate_includes_profit?: boolean;
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
  settings: SettingsData;
};

export type PreviewResponse = { items: ItemResult[]; totals: Totals };
export type Page<T> = { items: T[]; total: number; page: number; page_size: number; pages: number };

export type StatusFilter = "" | EffectiveStatus;
export type QuotationFilters = { q: string; status: StatusFilter; page: number };

export const PAGE_SIZE = 20;
export const FORMULAS: { value: Formula; label: string; hint: string; needs: Dimension[] }[] = [
  { value: "front_area", label: "Front area", hint: "width × height", needs: ["width", "height"] },
  { value: "side_area", label: "Side area", hint: "height × depth", needs: ["height", "depth"] },
  { value: "top_bottom_area", label: "Top / bottom area", hint: "width × depth", needs: ["width", "depth"] },
  { value: "square_feet", label: "Square feet", hint: "length × width", needs: ["length", "width"] },
  { value: "running_feet", label: "Running feet", hint: "one length", needs: [] },
  { value: "piece", label: "Per piece", hint: "count only", needs: [] },
  { value: "manual_quantity", label: "Manual quantity", hint: "type the quantity", needs: [] },
];
export const DIMENSION_LABELS: Record<Dimension, string> = { width: "Width", height: "Height", depth: "Depth", length: "Length" };
export const DEFAULT_INCLUDES_PROFIT: Record<PricingMethod, boolean> = { manual: true, measurement: true, material: false };
export const UNIT_SUGGESTIONS = ["pc", "set", "sq.ft", "r.ft", "nos", "lump sum"];
export const STATUS_LABELS: Record<EffectiveStatus, string> = {
  draft: "Draft", finalized: "Finalized", sent: "Sent", accepted: "Accepted", rejected: "Rejected", expired: "Expired",
};
