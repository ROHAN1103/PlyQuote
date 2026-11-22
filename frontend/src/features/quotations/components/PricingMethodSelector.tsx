import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";
import type { QuotationFormValues } from "../schemas/quotationSchema";
import type { PricingMethod } from "../types";

const METHODS: { value: PricingMethod; title: string; hint: string; available: boolean }[] = [
  { value: "manual", title: "Manual", hint: "Quantity × rate", available: true },
  { value: "measurement", title: "By measurement", hint: "Feet and inches", available: false },
  { value: "material", title: "By materials", hint: "Add up materials", available: false },
];

/** Each item picks its own pricing method, so one quotation can mix all three. */
export function PricingMethodSelector({ index }: { index: number }) {
  const { register, watch } = useFormContext<QuotationFormValues>();
  const current = watch(`items.${index}.pricing_method`);
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">Pricing method</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {METHODS.map((m) => (
          <label
            key={m.value}
            className={cn(
              "flex cursor-pointer flex-col rounded-md border px-3 py-2 text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-pine",
              current === m.value ? "border-pine bg-pine-soft" : "border-line bg-surface",
              !m.available && "cursor-not-allowed opacity-55",
            )}
          >
            <span className="flex items-center gap-2 font-medium">
              <input type="radio" value={m.value} disabled={!m.available} className="accent-pine" {...register(`items.${index}.pricing_method`)} />
              {m.title}
            </span>
            <span className="ml-6 text-xs text-muted">{m.available ? m.hint : "Coming soon"}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
