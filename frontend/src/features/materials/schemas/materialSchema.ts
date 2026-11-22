import { z } from "zod";
import type { Material, MaterialPayload } from "../types";

// Up to 10 whole digits and 4 decimals, matching NUMERIC(14,4) on the server.
const RATE_RE = /^\d{1,10}(\.\d{1,4})?$/;
const rateMessage = "Enter an amount like 2500 or 80.50 (up to 4 decimals).";

export const materialFormSchema = z.object({
  category: z.enum(["plywood", "laminate", "hardware", "other"]),
  name: z.string().trim().min(1, "Enter a name.").max(200, "Keep the name under 200 characters."),
  brand: z.string().trim().max(100, "Keep the brand under 100 characters."),
  specification: z.string().trim().max(200, "Keep this under 200 characters."),
  unit: z.string().trim().min(1, "Enter a unit, e.g. sheet or pc.").max(30, "Keep the unit under 30 characters."),
  cost_rate: z.string().trim().regex(RATE_RE, rateMessage),
  selling_rate: z.string().trim().refine((v) => v === "" || RATE_RE.test(v), rateMessage),
  description: z.string().trim().max(1000, "Keep the description under 1,000 characters."),
  is_active: z.boolean(),
});

export type MaterialFormValues = z.infer<typeof materialFormSchema>;

export const emptyMaterialForm: MaterialFormValues = {
  category: "plywood", name: "", brand: "", specification: "", unit: "", cost_rate: "", selling_rate: "",
  description: "", is_active: true,
};

/** "2500.0000" -> "2500", "80.5000" -> "80.5": friendlier to edit; the value is unchanged. */
export function trimRate(rate: string): string {
  return rate.includes(".") ? rate.replace(/0+$/, "").replace(/\.$/, "") : rate;
}

export function toFormValues(m: Material): MaterialFormValues {
  return {
    category: m.category, name: m.name, brand: m.brand, specification: m.specification, unit: m.unit,
    cost_rate: trimRate(m.cost_rate), selling_rate: m.selling_rate ? trimRate(m.selling_rate) : "",
    description: m.description, is_active: m.is_active,
  };
}

export function toPayload(v: MaterialFormValues): MaterialPayload {
  return { ...v, selling_rate: v.selling_rate === "" ? null : v.selling_rate };
}
