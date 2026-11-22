import { z } from "zod";
import { trimDecimal } from "@/utils/formatting";
import type { ItemPayload, Quotation, QuotationDefaults, QuotationItem, QuotationPayload } from "../types";

// Up to 10 whole digits and 4 decimals, matching NUMERIC(14,4) on the server.
export const AMOUNT_RE = /^\d{1,10}(\.\d{1,4})?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const itemSchema = z.object({
  id: z.string().optional(),
  pricing_method: z.enum(["manual", "measurement", "material"]),
  item_name: z.string().trim().min(1, "Enter an item name.").max(200, "Keep the name under 200 characters."),
  description: z.string().trim().max(2000, "Keep the description under 2,000 characters."),
  quantity: z.string().trim()
    .regex(AMOUNT_RE, "Enter a quantity like 1 or 2.5.")
    .refine((v) => !AMOUNT_RE.test(v) || Number(v) > 0, "Quantity must be more than zero."),
  unit: z.string().trim().min(1, "Enter a unit, e.g. pc or sq.ft.").max(30, "Keep the unit under 30 characters."),
  unit_rate: z.string().trim().regex(AMOUNT_RE, "Enter a rate like 1200 or 80.50."),
});

export const quotationFormSchema = z
  .object({
    quotation_date: z.string().regex(DATE_RE, "Choose a date."),
    valid_until: z.string().regex(DATE_RE, "Choose a date."),
    client_name: z.string().trim().min(1, "Enter the client's name.").max(200),
    client_phone: z.string().trim().regex(/^[0-9+()\-\s]{0,30}$/, "Use digits, spaces, +, - and brackets only."),
    client_email: z.string().trim().refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email address."),
    client_address: z.string().trim().max(1000),
    project_name: z.string().trim().max(200),
    project_location: z.string().trim().max(300),
    notes: z.string().trim().max(2000, "Keep notes under 2,000 characters."),
    payment_terms: z.string().trim().max(2000, "Keep this under 2,000 characters."),
    terms_and_conditions: z.string().trim().max(10000, "Keep this under 10,000 characters."),
    items: z.array(itemSchema).max(200, "A quotation can have up to 200 items."),
  })
  .superRefine((v, ctx) => {
    if (DATE_RE.test(v.quotation_date) && DATE_RE.test(v.valid_until) && v.valid_until < v.quotation_date) {
      ctx.addIssue({ code: "custom", path: ["valid_until"], message: "The validity date can't be before the quotation date." });
    }
  });

export type QuotationFormValues = z.infer<typeof quotationFormSchema>;
export type ItemFormValues = z.infer<typeof itemSchema>;

export const newItem = (over: Partial<ItemFormValues> = {}): ItemFormValues => ({
  pricing_method: "manual", item_name: "", description: "", quantity: "1", unit: "pc", unit_rate: "", ...over,
});

const itemToForm = (i: QuotationItem): ItemFormValues => ({
  id: i.id, pricing_method: i.pricing_method, item_name: i.item_name, description: i.description,
  quantity: trimDecimal(i.quantity), unit: i.unit, unit_rate: trimDecimal(i.unit_rate),
});

export function emptyForm(d: QuotationDefaults): QuotationFormValues {
  return {
    quotation_date: d.quotation_date, valid_until: d.valid_until, client_name: "", client_phone: "", client_email: "",
    client_address: "", project_name: "", project_location: "", notes: "", payment_terms: d.payment_terms,
    terms_and_conditions: d.terms_and_conditions, items: [],
  };
}

export function toFormValues(q: Quotation): QuotationFormValues {
  return {
    quotation_date: q.quotation_date, valid_until: q.valid_until, client_name: q.client.name, client_phone: q.client.phone,
    client_email: q.client.email ?? "", client_address: q.client.address, project_name: q.project_name,
    project_location: q.project_location, notes: q.notes, payment_terms: q.payment_terms,
    terms_and_conditions: q.terms_and_conditions, items: q.items.map(itemToForm),
  };
}

export function toItemPayload(i: ItemFormValues): ItemPayload {
  const { id, ...rest } = i;
  return id ? { id, ...rest } : rest;
}

export function toPayload(v: QuotationFormValues): QuotationPayload {
  return {
    project_name: v.project_name, project_location: v.project_location,
    client: { name: v.client_name, phone: v.client_phone, email: v.client_email === "" ? null : v.client_email, address: v.client_address },
    quotation_date: v.quotation_date, valid_until: v.valid_until, notes: v.notes, payment_terms: v.payment_terms,
    terms_and_conditions: v.terms_and_conditions, items: v.items.map(toItemPayload),
  };
}

/** Server field paths ("client.name", "items.0.quantity") -> form field names. */
export function serverFieldToFormField(path: string): string {
  return path.startsWith("client.") ? `client_${path.slice("client.".length)}` : path;
}

/** Can the live preview price this item yet? (Backend still validates; this only avoids pointless requests.) */
export function isPreviewable(i: ItemFormValues): boolean {
  return i.pricing_method === "manual" && AMOUNT_RE.test(i.quantity.trim()) && Number(i.quantity) > 0
    && AMOUNT_RE.test(i.unit_rate.trim()) && i.unit.trim() !== "";
}
