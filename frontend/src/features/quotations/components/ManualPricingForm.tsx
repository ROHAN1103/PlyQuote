import { useFormContext } from "react-hook-form";
import { FormField } from "@/components/forms/FormField";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatINR } from "@/utils/formatting";
import type { QuotationFormValues } from "../schemas/quotationSchema";
import { UNIT_SUGGESTIONS } from "../types";

/** Manual pricing: amount = quantity × rate. The amount shown is calculated by the backend. */
export function ManualPricingForm({ index, amount }: { index: number; amount: string | null }) {
  const { register, formState: { errors } } = useFormContext<QuotationFormValues>();
  const e = errors.items?.[index];
  const id = (f: string) => `item-${index}-${f}`;
  const a = (f: "item_name" | "description" | "quantity" | "unit" | "unit_rate") => ({
    "aria-invalid": !!e?.[f], "aria-describedby": e?.[f] ? `${id(f)}-error` : undefined,
  });

  return (
    <div className="space-y-4">
      <FormField id={id("item_name")} label="Item name" error={e?.item_name?.message}>
        <Input id={id("item_name")} placeholder="e.g. Wardrobe, TV unit" {...a("item_name")} {...register(`items.${index}.item_name`)} />
      </FormField>
      <FormField id={id("description")} label="Description" optional error={e?.description?.message}>
        <Textarea id={id("description")} placeholder="Materials, finish, size: whatever the client should see" {...a("description")} {...register(`items.${index}.description`)} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField id={id("quantity")} label="Quantity" error={e?.quantity?.message}>
          <Input id={id("quantity")} inputMode="decimal" {...a("quantity")} {...register(`items.${index}.quantity`)} />
        </FormField>
        <FormField id={id("unit")} label="Unit" error={e?.unit?.message}>
          <Input id={id("unit")} list={`${id("units")}`} autoComplete="off" {...a("unit")} {...register(`items.${index}.unit`)} />
          <datalist id={id("units")}>{UNIT_SUGGESTIONS.map((u) => <option key={u} value={u} />)}</datalist>
        </FormField>
        <FormField id={id("unit_rate")} label="Rate (₹ per unit)" error={e?.unit_rate?.message}>
          <Input id={id("unit_rate")} inputMode="decimal" placeholder="0.00" {...a("unit_rate")} {...register(`items.${index}.unit_rate`)} />
        </FormField>
      </div>
      <p className="flex items-baseline justify-between rounded-md bg-paper px-3 py-2 text-sm">
        <span className="text-muted">Amount</span>
        <span className="text-base font-semibold tabular-nums" data-testid={`item-${index}-amount`}>{amount ? formatINR(amount) : "…"}</span>
      </p>
    </div>
  );
}
