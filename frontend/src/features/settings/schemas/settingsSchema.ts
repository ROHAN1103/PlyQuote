import { z } from "zod";
import { fractionToPercent, PERCENT_INPUT_RE, percentToFraction } from "@/utils/percent";
import type { Company, CompanyPayload } from "../types";

const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export const settingsFormSchema = z
  .object({
    name: z.string().trim().min(1, "Enter your company name.").max(200),
    address: z.string().trim().max(1000),
    phone: z.string().trim().regex(/^[0-9+()\-\s]{0,30}$/, "Use digits, spaces, +, - and brackets only."),
    email: z.string().trim().refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email address."),
    gstin: z.string().trim().toUpperCase().refine((v) => v === "" || GSTIN_RE.test(v), "Enter a valid 15-character GSTIN, e.g. 33ABCDE1234F1Z5."),
    gst_enabled: z.boolean(),
    gst_rate_percent: z.string().trim(),
    prices_include_tax: z.boolean(),
    quotation_validity_days: z.string().trim().regex(/^\d{1,3}$/, "Enter a whole number of days.")
      .refine((v) => Number(v) >= 1 && Number(v) <= 365, "Enter between 1 and 365 days."),
    payment_terms: z.string().trim().max(2000, "Keep this under 2,000 characters."),
    terms_and_conditions: z.string().trim().max(10000, "Keep this under 10,000 characters."),
    document_footer: z.string().trim().max(500, "Keep this under 500 characters."),
    signature_name: z.string().trim().max(100),
    signature_designation: z.string().trim().max(100),
    show_material_breakdown_to_customer: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const rate = v.gst_rate_percent;
    const valid = PERCENT_INPUT_RE.test(rate) && Number(rate) <= 100;
    if (v.gst_enabled && !valid) {
      ctx.addIssue({ code: "custom", path: ["gst_rate_percent"], message: "Enter the GST rate as a percentage, e.g. 18." });
    } else if (!v.gst_enabled && rate !== "" && !valid) {
      ctx.addIssue({ code: "custom", path: ["gst_rate_percent"], message: "Enter a percentage between 0 and 100." });
    }
  });

export type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export function toFormValues(c: Company): SettingsFormValues {
  const d = c.defaults;
  return {
    name: c.name, address: c.address, phone: c.phone, email: c.email ?? "", gstin: c.gstin,
    gst_enabled: d.gst.enabled, gst_rate_percent: fractionToPercent(d.gst.rate), prices_include_tax: d.gst.prices_include_tax,
    quotation_validity_days: String(d.quotation_validity_days), payment_terms: d.payment_terms,
    terms_and_conditions: d.terms_and_conditions, document_footer: d.document_footer,
    signature_name: d.signature.name, signature_designation: d.signature.designation,
    show_material_breakdown_to_customer: d.show_material_breakdown_to_customer,
  };
}

export function toPayload(v: SettingsFormValues): CompanyPayload {
  return {
    name: v.name, address: v.address, phone: v.phone, email: v.email === "" ? null : v.email, gstin: v.gstin,
    defaults: {
      currency: "INR",
      gst: { enabled: v.gst_enabled, rate: v.gst_rate_percent === "" ? null : percentToFraction(v.gst_rate_percent), prices_include_tax: v.prices_include_tax },
      quotation_validity_days: Number(v.quotation_validity_days),
      payment_terms: v.payment_terms, terms_and_conditions: v.terms_and_conditions, document_footer: v.document_footer,
      signature: { name: v.signature_name, designation: v.signature_designation },
      show_material_breakdown_to_customer: v.show_material_breakdown_to_customer,
    },
  };
}
