export type MaterialCategory = "plywood" | "laminate" | "hardware" | "other";

export const CATEGORIES: { value: MaterialCategory; label: string }[] = [
  { value: "plywood", label: "Plywood" },
  { value: "laminate", label: "Laminates" },
  { value: "hardware", label: "Hardware" },
  { value: "other", label: "Other" },
];
export const categoryLabel = (c: MaterialCategory) => CATEGORIES.find((x) => x.value === c)?.label ?? c;

/** Rates are decimal strings, exactly as the API sends them. Never convert to float for storage. */
export type Material = {
  id: string;
  name: string;
  category: MaterialCategory;
  brand: string;
  description: string;
  specification: string;
  unit: string;
  cost_rate: string;
  selling_rate: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type MaterialPayload = Omit<Material, "id" | "created_at" | "updated_at">;

export type Page<T> = { items: T[]; total: number; page: number; page_size: number; pages: number };

export type StatusFilter = "active" | "inactive" | "all";
export type MaterialFilters = { q: string; category: MaterialCategory | ""; status: StatusFilter; page: number };

export const PAGE_SIZE = 20;
export const UNIT_SUGGESTIONS = ["sheet", "pc", "pair", "sq.ft", "r.ft", "kg", "litre", "box", "set", "roll"];
