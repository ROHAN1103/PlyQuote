import { z } from "zod";
import { trimDecimal } from "@/utils/formatting";
import { formatFeetInches, parseLength } from "@/utils/measurement";
import { fractionToPercent, PERCENT_INPUT_RE, percentToFraction } from "@/utils/percent";
import {
  DEFAULT_INCLUDES_PROFIT, FORMULAS, type Dimension, type Formula, type ItemPayload, type PricingMethod, type ProfitType,
  type Quotation, type QuotationDefaults, type QuotationItem, type QuotationPayload, type SettingsData,
} from "../types";

// Quantities and rates: up to 10 whole digits and 4 decimals (NUMERIC(14,4)). Money: up to 2 decimals (NUMERIC(14,2)).
export const AMOUNT_RE = /^\d{1,10}(\.\d{1,4})?$/;
export const MONEY_RE = /^\d{1,12}(\.\d{1,2})?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const METHODS = ["manual", "measurement", "material"] as const;
const DIMENSIONS = ["width", "height", "depth", "length"] as const;
const PROFIT_TYPES = ["none", "markup", "margin", "fixed"] as const;

export const materialLineSchema = z.object({
  id: z.string().optional(),
  material_id: z.string(),
  name: z.string(),
  description: z.string(),
  unit: z.string(),
  quantity: z.string(),
  rate: z.string(),
});
export type MaterialLineValues = z.infer<typeof materialLineSchema>;

type Ctx = z.RefinementCtx;
const issue = (ctx: Ctx, path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });
const positive = (v: string) => AMOUNT_RE.test(v.trim()) && Number(v) > 0;

/** The dimensions an item's formula needs typed in. */
export function requiredDimensions(formula: Formula, running: Dimension): Dimension[] {
  return formula === "running_feet" ? [running] : (FORMULAS.find((f) => f.value === formula)?.needs ?? []);
}

export const itemSchema = z
  .object({
    id: z.string().optional(),
    pricing_method: z.enum(METHODS),
    item_name: z.string().trim().min(1, "Enter an item name.").max(200, "Keep the name under 200 characters."),
    description: z.string().trim().max(2000, "Keep the description under 2,000 characters."),
    quantity: z.string(),
    unit: z.string(),
    unit_rate: z.string(),
    // measurement
    formula: z.enum(["front_area", "side_area", "top_bottom_area", "square_feet", "running_feet", "piece", "manual_quantity"]),
    width: z.string(), height: z.string(), depth: z.string(), length: z.string(),
    running_dimension: z.enum(DIMENSIONS),
    minimum_quantity: z.string(),
    rounding_places: z.string(),
    // material
    materials: z.array(materialLineSchema),
    labour: z.string(), transportation: z.string(), installation: z.string(), other: z.string(),
    // profit
    profit_type: z.enum(PROFIT_TYPES),
    profit_value: z.string(),
    rate_includes_profit: z.boolean(),
  })
  .superRefine((i, ctx) => {
    const method = i.pricing_method;

    if (method === "manual" || method === "measurement") {
      if (!AMOUNT_RE.test(i.quantity.trim())) issue(ctx, ["quantity"], "Enter a quantity like 1 or 2.5.");
      else if (!positive(i.quantity)) issue(ctx, ["quantity"], "Quantity must be more than zero.");
      if (!AMOUNT_RE.test(i.unit_rate.trim())) issue(ctx, ["unit_rate"], "Enter a rate like 1200 or 80.50.");
    }

    if (method === "manual") {
      if (!i.unit.trim()) issue(ctx, ["unit"], "Enter a unit, e.g. pc or sq.ft.");
      else if (i.unit.trim().length > 30) issue(ctx, ["unit"], "Keep the unit under 30 characters.");
    }

    if (method === "measurement") {
      for (const d of requiredDimensions(i.formula, i.running_dimension)) {
        const parsed = parseLength(i[d]);
        if (!parsed.ok) issue(ctx, [d], parsed.message);
      }
      if (i.formula === "manual_quantity" && !i.unit.trim()) issue(ctx, ["unit"], "Enter a unit, e.g. sq.ft or set.");
      if (i.minimum_quantity.trim() !== "" && !AMOUNT_RE.test(i.minimum_quantity.trim())) {
        issue(ctx, ["minimum_quantity"], "Enter a quantity like 10 or 4.5, or leave it empty.");
      }
      if (!/^[0-4]$/.test(i.rounding_places.trim())) issue(ctx, ["rounding_places"], "Choose 0 to 4 decimal places.");
    }

    if (method === "material") {
      if (i.materials.length === 0 && ![i.labour, i.transportation, i.installation, i.other].some((v) => Number(v) > 0)) {
        issue(ctx, ["materials"], "Add at least one material or cost.");
      }
      i.materials.forEach((line, n) => {
        if (!line.name.trim()) issue(ctx, ["materials", n, "name"], "Enter a material name.");
        if (!line.unit.trim()) issue(ctx, ["materials", n, "unit"], "Enter a unit.");
        if (!AMOUNT_RE.test(line.quantity.trim())) issue(ctx, ["materials", n, "quantity"], "Enter a quantity like 5 or 2.5.");
        else if (!positive(line.quantity)) issue(ctx, ["materials", n, "quantity"], "Must be more than zero.");
        if (!AMOUNT_RE.test(line.rate.trim())) issue(ctx, ["materials", n, "rate"], "Enter a rate like 2500 or 80.50.");
      });
      for (const f of ["labour", "transportation", "installation", "other"] as const) {
        if (i[f].trim() !== "" && !MONEY_RE.test(i[f].trim())) issue(ctx, [f], "Enter an amount like 500 or 1250.50.");
      }
    }

    if (!i.rate_includes_profit && i.profit_type !== "none") {
      const v = i.profit_value.trim();
      if (i.profit_type === "fixed") {
        if (!MONEY_RE.test(v)) issue(ctx, ["profit_value"], "Enter the profit amount, e.g. 5000.");
      } else if (!PERCENT_INPUT_RE.test(v)) {
        issue(ctx, ["profit_value"], "Enter a percentage like 20 or 12.5.");
      } else if (i.profit_type === "margin" && Number(v) >= 100) {
        issue(ctx, ["profit_value"], "Margin must be below 100%.");
      }
    }
  });

export type ItemFormValues = z.infer<typeof itemSchema>;

const settingsShape = {
  charge_labour: z.string(), charge_transportation: z.string(), charge_installation: z.string(), charge_miscellaneous: z.string(),
  discount_type: z.enum(["none", "percent", "fixed"]),
  discount_value: z.string(),
  gst_enabled: z.boolean(),
  gst_rate_percent: z.string(),
  prices_include_tax: z.boolean(),
  round_to_rupee: z.boolean(),
};
type SettingsFields = { [K in keyof typeof settingsShape]: z.infer<(typeof settingsShape)[K]> };

function settingsChecks(v: SettingsFields, ctx: Ctx) {
  for (const f of ["charge_labour", "charge_transportation", "charge_installation", "charge_miscellaneous"] as const) {
    if (v[f].trim() !== "" && !MONEY_RE.test(v[f].trim())) issue(ctx, [f], "Enter an amount like 500 or 1250.50.");
  }
  if (v.discount_type === "percent") {
    const x = v.discount_value.trim();
    if (!PERCENT_INPUT_RE.test(x) || Number(x) > 100) issue(ctx, ["discount_value"], "Enter a percentage between 0 and 100.");
  } else if (v.discount_type === "fixed" && !MONEY_RE.test(v.discount_value.trim())) {
    issue(ctx, ["discount_value"], "Enter the discount amount, e.g. 2500.");
  }
  if (v.gst_enabled && (!PERCENT_INPUT_RE.test(v.gst_rate_percent.trim()) || Number(v.gst_rate_percent) > 100)) {
    issue(ctx, ["gst_rate_percent"], "Enter the GST rate as a percentage, e.g. 18.");
  }
}

export const settingsFormSchema = z.object(settingsShape).superRefine(settingsChecks);

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
    ...settingsShape,
    items: z.array(itemSchema).max(200, "A quotation can have up to 200 items."),
  })
  .superRefine((v, ctx) => {
    if (DATE_RE.test(v.quotation_date) && DATE_RE.test(v.valid_until) && v.valid_until < v.quotation_date) {
      issue(ctx, ["valid_until"], "The validity date can't be before the quotation date.");
    }
    settingsChecks(v, ctx);
  });

export type QuotationFormValues = z.infer<typeof quotationFormSchema>;

// ---------------------------------------------------------------- building form values

export function newItem(over: Partial<ItemFormValues> = {}): ItemFormValues {
  const method = over.pricing_method ?? "manual";
  return {
    pricing_method: method, item_name: "", description: "", quantity: "1", unit: method === "manual" ? "pc" : "", unit_rate: "",
    formula: "front_area", width: "", height: "", depth: "", length: "", running_dimension: "width", minimum_quantity: "", rounding_places: "2",
    materials: [], labour: "", transportation: "", installation: "", other: "",
    profit_type: "none", profit_value: "", rate_includes_profit: DEFAULT_INCLUDES_PROFIT[method], ...over,
  };
}

const amountText = (v: string) => (Number(v) === 0 ? "" : trimDecimal(v));

function settingsToForm(s: SettingsData) {
  const d = s.discount;
  return {
    charge_labour: amountText(s.charges.labour), charge_transportation: amountText(s.charges.transportation),
    charge_installation: amountText(s.charges.installation), charge_miscellaneous: amountText(s.charges.miscellaneous),
    discount_type: d.type, discount_value: d.type === "none" ? "" : d.type === "percent" ? fractionToPercent(d.value) : trimDecimal(d.value),
    gst_enabled: s.gst.enabled, gst_rate_percent: fractionToPercent(s.gst.rate), prices_include_tax: s.gst.prices_include_tax,
    round_to_rupee: s.round_to_rupee,
  };
}

export function emptyForm(d: QuotationDefaults): QuotationFormValues {
  return {
    quotation_date: d.quotation_date, valid_until: d.valid_until, client_name: "", client_phone: "", client_email: "",
    client_address: "", project_name: "", project_location: "", notes: "", payment_terms: d.payment_terms,
    terms_and_conditions: d.terms_and_conditions, ...settingsToForm(d.settings), items: [],
  };
}

function itemToForm(i: QuotationItem): ItemFormValues {
  const m = i.measurement;
  const method = i.pricing_method;
  const dimension = (v: string | null | undefined) => (v ? formatFeetInches(trimDecimal(v)) : "");
  const rule = i.profit_rule;
  return newItem({
    id: i.id, pricing_method: method, item_name: i.item_name, description: i.description,
    quantity: i.quantity ? trimDecimal(i.quantity) : "1",
    // Area/running/piece formulas derive their unit; only manual items and manual_quantity carry one the user typed.
    unit: method === "manual" || m?.formula === "manual_quantity" ? i.unit : "",
    unit_rate: method === "material" ? "" : trimDecimal(i.unit_rate),
    formula: m?.formula ?? "front_area", width: dimension(m?.width), height: dimension(m?.height), depth: dimension(m?.depth),
    length: dimension(m?.length), running_dimension: m?.running_dimension ?? "width",
    minimum_quantity: m?.minimum_quantity ? trimDecimal(m.minimum_quantity) : "", rounding_places: String(m?.rounding_places ?? 2),
    materials: i.materials.map((l) => ({
      id: l.id, material_id: l.material_id ?? "", name: l.name, description: l.description, unit: l.unit,
      quantity: trimDecimal(l.quantity), rate: trimDecimal(l.rate),
    })),
    labour: amountText(i.extra_costs.labour), transportation: amountText(i.extra_costs.transportation),
    installation: amountText(i.extra_costs.installation), other: amountText(i.extra_costs.other),
    profit_type: rule.type, profit_value: rule.type === "none" ? "" : rule.type === "fixed" ? trimDecimal(rule.value) : fractionToPercent(rule.value),
    rate_includes_profit: i.rate_includes_profit,
  });
}

export function toFormValues(q: Quotation): QuotationFormValues {
  return {
    quotation_date: q.quotation_date, valid_until: q.valid_until, client_name: q.client.name, client_phone: q.client.phone,
    client_email: q.client.email ?? "", client_address: q.client.address, project_name: q.project_name,
    project_location: q.project_location, notes: q.notes, payment_terms: q.payment_terms,
    terms_and_conditions: q.terms_and_conditions, ...settingsToForm(q.settings), items: q.items.map(itemToForm),
  };
}

// ---------------------------------------------------------------- building payloads

const money = (v: string) => (v.trim() === "" ? "0" : v.trim());

function profitFraction(type: ProfitType, value: string): string {
  return type === "fixed" ? value.trim() : (percentToFraction(value) ?? "0");
}

/** Only meaningful, non-default pricing choices are sent: a plain manual item has the same payload it always had. */
export function toItemPayload(i: ItemFormValues): ItemPayload {
  const method: PricingMethod = i.pricing_method;
  const p: ItemPayload = { ...(i.id ? { id: i.id } : {}), pricing_method: method, item_name: i.item_name, description: i.description };

  if (method === "manual") {
    Object.assign(p, { quantity: i.quantity, unit: i.unit, unit_rate: i.unit_rate });
  } else if (method === "measurement") {
    const measurement: NonNullable<ItemPayload["measurement"]> = { formula: i.formula, rounding_places: Number(i.rounding_places) };
    for (const d of requiredDimensions(i.formula, i.running_dimension)) {
      const parsed = parseLength(i[d]);
      if (parsed.ok) measurement[d] = parsed.inches;
    }
    if (i.formula === "running_feet") measurement.running_dimension = i.running_dimension;
    if (i.minimum_quantity.trim() !== "") measurement.minimum_quantity = i.minimum_quantity.trim();
    Object.assign(p, { quantity: i.quantity, unit: i.formula === "manual_quantity" ? i.unit : "", unit_rate: i.unit_rate, measurement });
  } else {
    p.materials = i.materials.map((l) => ({
      ...(l.id ? { id: l.id } : {}), ...(l.material_id ? { material_id: l.material_id } : {}),
      name: l.name, description: l.description, unit: l.unit, quantity: l.quantity, rate: l.rate,
    }));
    p.extra_costs = { labour: money(i.labour), transportation: money(i.transportation), installation: money(i.installation), other: money(i.other) };
  }

  if (!i.rate_includes_profit && i.profit_type !== "none") p.profit_rule = { type: i.profit_type, value: profitFraction(i.profit_type, i.profit_value) };
  if (i.rate_includes_profit !== DEFAULT_INCLUDES_PROFIT[method]) p.rate_includes_profit = i.rate_includes_profit;
  return p;
}

export function toSettingsPayload(v: SettingsFields): SettingsData {
  const discountValue = v.discount_type === "none" ? "0" : v.discount_type === "percent" ? (percentToFraction(v.discount_value) ?? "0") : money(v.discount_value);
  return {
    charges: { labour: money(v.charge_labour), transportation: money(v.charge_transportation), installation: money(v.charge_installation), miscellaneous: money(v.charge_miscellaneous) },
    discount: { type: v.discount_type, value: discountValue },
    gst: { enabled: v.gst_enabled, rate: v.gst_rate_percent.trim() === "" ? null : percentToFraction(v.gst_rate_percent), prices_include_tax: v.prices_include_tax },
    round_to_rupee: v.round_to_rupee,
  };
}

export function toPayload(v: QuotationFormValues): QuotationPayload {
  return {
    project_name: v.project_name, project_location: v.project_location,
    client: { name: v.client_name, phone: v.client_phone, email: v.client_email === "" ? null : v.client_email, address: v.client_address },
    quotation_date: v.quotation_date, valid_until: v.valid_until, notes: v.notes, payment_terms: v.payment_terms,
    terms_and_conditions: v.terms_and_conditions, items: v.items.map(toItemPayload), settings: toSettingsPayload(v),
  };
}

/** Server field paths -> form field names. */
export function serverFieldToFormField(path: string): string {
  if (path.startsWith("client.")) return `client_${path.slice("client.".length)}`;
  let m = /^items\.(\d+)\.(?:measurement|extra_costs)\.(.+)$/.exec(path);
  if (m) return `items.${m[1]}.${m[2]}`;
  m = /^items\.(\d+)\.profit_rule\.(type|value)$/.exec(path);
  if (m) return `items.${m[1]}.profit_${m[2]}`;
  if (path.startsWith("settings.charges.")) return `charge_${path.slice("settings.charges.".length)}`;
  if (path === "settings.gst.rate") return "gst_rate_percent";
  if (path.startsWith("settings.discount.")) return `discount_${path.slice("settings.discount.".length)}`;
  return path;
}

/** Can the live preview price this item yet? Uses the same rules as the form, so what is previewed is what will save. */
export const itemIsComplete = (i: ItemFormValues) => itemSchema.safeParse(i).success;
export const settingsAreComplete = (v: SettingsFields) => settingsFormSchema.safeParse(v).success;
export type { SettingsFields };
