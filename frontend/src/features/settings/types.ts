export type CompanyDefaults = {
  currency: "INR";
  gst: { enabled: boolean; rate: string | null; prices_include_tax: boolean };
  quotation_validity_days: number;
  payment_terms: string;
  terms_and_conditions: string;
  document_footer: string;
  signature: { name: string; designation: string };
  show_material_breakdown_to_customer: boolean;
};

export type Company = {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string | null;
  gstin: string;
  has_logo: boolean;
  logo_version: string | null;
  defaults: CompanyDefaults;
};

export type CompanyPayload = Omit<Company, "id" | "has_logo" | "logo_version">;
