import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { FormField } from "@/components/forms/FormField";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { QuotationFormValues } from "../schemas/quotationSchema";

const PROFIT_LABEL = { none: "", markup: "Markup (%)", margin: "Margin (%)", fixed: "Profit amount (₹)" } as const;

/**
 * Profit rules. The checkbox is the guard against counting profit twice: when the typed rates already are
 * selling prices, no profit is added on top. Markup and margin are different, and the hint says how.
 */
export function ProfitFields({ index }: { index: number }) {
  const { register, formState: { errors }, control } = useFormContext<QuotationFormValues>();
  const item = useWatch({ control, name: `items.${index}` });
  const e = errors.items?.[index];
  const material = item?.pricing_method === "material";
  const includes = !!item?.rate_includes_profit;
  const type = item?.profit_type ?? "none";
  const [open, setOpen] = useState(!includes && type !== "none");

  const body = (
    <div className="space-y-3">
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-0.5 size-4 accent-pine" {...register(`items.${index}.rate_includes_profit`)} />
        <span>{material ? "These costs already include my profit" : "This rate already includes my profit"}</span>
      </label>
      {!includes && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField id={`item-${index}-profit_type`} label="Add profit as">
              <Select id={`item-${index}-profit_type`} {...register(`items.${index}.profit_type`)}>
                <option value="none">No profit</option>
                <option value="markup">Markup on cost</option>
                <option value="margin">Margin on selling price</option>
                <option value="fixed">Fixed amount</option>
              </Select>
            </FormField>
            {type !== "none" && (
              <FormField id={`item-${index}-profit_value`} label={PROFIT_LABEL[type]} error={e?.profit_value?.message}>
                <Input id={`item-${index}-profit_value`} inputMode="decimal" aria-invalid={!!e?.profit_value}
                       aria-describedby={e?.profit_value ? `item-${index}-profit_value-error` : undefined}
                       {...register(`items.${index}.profit_value`)} />
              </FormField>
            )}
          </div>
          <p className="text-xs text-muted">
            Markup is added on top of your cost: 20% markup on ₹1,000 sells for ₹1,200. Margin is a share of the selling price: 20% margin sells for ₹1,250.
          </p>
        </div>
      )}
    </div>
  );

  if (material) {
    return <fieldset><legend className="mb-2 text-sm font-medium">Profit</legend>{body}</fieldset>;
  }
  return (
    <details open={open} onToggle={(ev) => setOpen((ev.currentTarget as HTMLDetailsElement).open)} className="rounded-md border border-line px-3 py-2">
      <summary className="cursor-pointer text-sm font-medium">
        Profit on this item {!includes && type !== "none" && <span className="font-normal text-muted">· {type}</span>}
      </summary>
      <div className="mt-3">{body}</div>
    </details>
  );
}
