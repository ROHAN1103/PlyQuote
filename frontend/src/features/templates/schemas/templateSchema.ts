import { z } from "zod";
import { trimDecimal } from "@/utils/formatting";
import type { FurnitureTemplate, TemplatePayload } from "../types";

const AMOUNT_RE = /^\d{1,10}(\.\d{1,4})?$/;

export const templateFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(200, "Keep the name under 200 characters."),
  description: z.string().trim().max(2000, "Keep the description under 2,000 characters."),
  unit: z.string().trim().min(1, "Enter a unit, e.g. pc or sq.ft.").max(30, "Keep the unit under 30 characters."),
  quantity: z.string().trim().regex(AMOUNT_RE, "Enter a quantity like 1 or 2.5.")
    .refine((v) => !AMOUNT_RE.test(v) || Number(v) > 0, "Quantity must be more than zero."),
  unit_rate: z.string().trim().regex(AMOUNT_RE, "Enter a rate like 1200 or 80.50."),
});

export type TemplateFormValues = z.infer<typeof templateFormSchema>;
export const emptyTemplateForm: TemplateFormValues = { name: "", description: "", unit: "pc", quantity: "1", unit_rate: "0" };

export const toFormValues = (t: FurnitureTemplate): TemplateFormValues => ({
  name: t.name, description: t.description, unit: t.default_config.unit,
  quantity: trimDecimal(t.default_config.quantity), unit_rate: trimDecimal(t.default_config.unit_rate),
});

export const toPayload = (v: TemplateFormValues): TemplatePayload => ({
  name: v.name, description: v.description, default_pricing_method: "manual",
  default_config: { unit: v.unit, quantity: v.quantity, unit_rate: v.unit_rate },
});
