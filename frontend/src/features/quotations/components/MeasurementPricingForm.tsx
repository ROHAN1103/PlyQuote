import { useFormContext, useWatch } from "react-hook-form";
import { FormField } from "@/components/forms/FormField";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatINR, trimDecimal } from "@/utils/formatting";
import { describeLength } from "@/utils/measurement";
import { requiredDimensions, type QuotationFormValues } from "../schemas/quotationSchema";
import { DIMENSION_LABELS, FORMULAS, UNIT_SUGGESTIONS, type Dimension, type ItemResult } from "../types";
import { ProfitFields } from "./ProfitFields";

const RATE_UNIT: Record<string, string> = { front_area: "sq.ft", side_area: "sq.ft", top_bottom_area: "sq.ft", square_feet: "sq.ft", running_feet: "r.ft", piece: "piece" };

/** Measurement-based pricing: type lengths the way you say them (8' 6", 102", 8.5), the backend does the arithmetic. */
export function MeasurementPricingForm({ index, result }: { index: number; result: ItemResult | null }) {
  const { register, control, formState: { errors } } = useFormContext<QuotationFormValues>();
  const item = useWatch({ control, name: `items.${index}` });
  const e = errors.items?.[index];
  const id = (f: string) => `item-${index}-${f}`;
  const a = (f: keyof NonNullable<typeof e>) => ({ "aria-invalid": !!e?.[f], "aria-describedby": e?.[f] ? `${id(String(f))}-error` : undefined });

  const formula = item?.formula ?? "front_area";
  const dims = requiredDimensions(formula, item?.running_dimension ?? "width");
  const manualQty = formula === "manual_quantity";
  const rateUnit = manualQty ? (item?.unit?.trim() || "unit") : RATE_UNIT[formula];

  return (
    <div className="space-y-4">
      <FormField id={id("item_name")} label="Item name" error={e?.item_name?.message}>
        <Input id={id("item_name")} placeholder="e.g. Wardrobe" {...a("item_name")} {...register(`items.${index}.item_name`)} />
      </FormField>
      <FormField id={id("description")} label="Description" optional error={e?.description?.message}>
        <Input id={id("description")} {...register(`items.${index}.description`)} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id={id("formula")} label="Measured by">
          <Select id={id("formula")} {...register(`items.${index}.formula`)}>
            {FORMULAS.map((f) => <option key={f.value} value={f.value}>{f.label} ({f.hint})</option>)}
          </Select>
        </FormField>
        {formula === "running_feet" && (
          <FormField id={id("running_dimension")} label="Which length?">
            <Select id={id("running_dimension")} {...register(`items.${index}.running_dimension`)}>
              {(Object.keys(DIMENSION_LABELS) as Dimension[]).map((d) => <option key={d} value={d}>{DIMENSION_LABELS[d]}</option>)}
            </Select>
          </FormField>
        )}
      </div>

      {dims.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {dims.map((d) => {
            const echo = describeLength(item?.[d] ?? "");
            return (
              <FormField key={d} id={id(d)} label={DIMENSION_LABELS[d]} error={e?.[d]?.message}
                         hint={echo ? `= ${echo}` : `e.g. 8' or 6' 6" or 78"`}>
                <Input id={id(d)} placeholder={`8' 6"`} autoComplete="off" {...a(d)} {...register(`items.${index}.${d}`)} />
              </FormField>
            );
          })}
        </div>
      )}
      {dims.length > 0 && <p className="-mt-2 text-xs text-muted">A plain number means feet (5.5 = 5' 6"). Add " or in for inches (66").</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField id={id("quantity")} label={manualQty ? "Quantity" : "Number of pieces"} error={e?.quantity?.message}
                   hint={manualQty || formula === "piece" ? undefined : "How many identical pieces"}>
          <Input id={id("quantity")} inputMode="decimal" {...a("quantity")} {...register(`items.${index}.quantity`)} />
        </FormField>
        {manualQty && (
          <FormField id={id("unit")} label="Unit" error={e?.unit?.message}>
            <Input id={id("unit")} list={id("units")} autoComplete="off" {...a("unit")} {...register(`items.${index}.unit`)} />
            <datalist id={id("units")}>{UNIT_SUGGESTIONS.map((u) => <option key={u} value={u} />)}</datalist>
          </FormField>
        )}
        <FormField id={id("unit_rate")} label={`Rate (₹ per ${rateUnit})`} error={e?.unit_rate?.message}>
          <Input id={id("unit_rate")} inputMode="decimal" placeholder="0.00" {...a("unit_rate")} {...register(`items.${index}.unit_rate`)} />
        </FormField>
      </div>

      <details className="rounded-md border border-line px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium">Minimum charge and rounding</summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <FormField id={id("minimum_quantity")} label="Minimum chargeable quantity" optional error={e?.minimum_quantity?.message}
                     hint="If the measured quantity is smaller, this is charged instead.">
            <Input id={id("minimum_quantity")} inputMode="decimal" {...a("minimum_quantity")} {...register(`items.${index}.minimum_quantity`)} />
          </FormField>
          <FormField id={id("rounding_places")} label="Round the quantity to" error={e?.rounding_places?.message}>
            <Select id={id("rounding_places")} {...register(`items.${index}.rounding_places`)}>
              {[0, 1, 2, 3, 4].map((n) => <option key={n} value={String(n)}>{n} decimal place{n === 1 ? "" : "s"}</option>)}
            </Select>
          </FormField>
        </div>
      </details>

      <ProfitFields index={index} />

      <dl className="space-y-1 rounded-md bg-paper px-3 py-2 text-sm" data-testid={`item-${index}-result`}>
        <div className="flex justify-between"><dt className="text-muted">Measured quantity</dt>
          <dd className="tabular-nums">{result ? `${trimDecimal(result.calculated_quantity)} ${result.unit}` : "…"}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">Chargeable quantity</dt>
          <dd className="tabular-nums">{result ? `${trimDecimal(result.chargeable_quantity)} ${result.unit}` : "…"}</dd></div>
        <div className="flex items-baseline justify-between border-t border-line pt-1"><dt className="text-muted">Amount</dt>
          <dd className="text-base font-semibold tabular-nums" data-testid={`item-${index}-amount`}>{result ? formatINR(result.total) : "…"}</dd></div>
      </dl>
    </div>
  );
}
