import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";
import type { QuotationFormValues } from "../schemas/quotationSchema";
import { DEFAULT_INCLUDES_PROFIT, type PricingMethod } from "../types";

const METHODS: { value: PricingMethod; title: string; hint: string }[] = [
  { value: "manual", title: "Manual", hint: "Quantity × rate" },
  { value: "measurement", title: "By measurement", hint: "Feet and inches" },
  { value: "material", title: "By materials", hint: "Add up materials" },
];

/** Each item picks its own pricing method, so one quotation can mix all three. */
export function PricingMethodSelector({ index }: { index: number }) {
  const { register, watch, getValues, setValue } = useFormContext<QuotationFormValues>();
  const current = watch(`items.${index}.pricing_method`);

  /** Switching method keeps what was typed, but moves the profit default and a sensible unit along with it. */
  const onSwitch = (next: PricingMethod) => {
    // `current` is the method from the previous render. React Hook Form has already stored `next` by the
    // time this runs, so reading the form value here would give the new method, not the old one.
    const prev = current;
    if (getValues(`items.${index}.rate_includes_profit`) === DEFAULT_INCLUDES_PROFIT[prev]) {
      setValue(`items.${index}.rate_includes_profit`, DEFAULT_INCLUDES_PROFIT[next], { shouldDirty: true });
    }
    if (next === "manual" && !getValues(`items.${index}.unit`).trim()) setValue(`items.${index}.unit`, "pc", { shouldDirty: true });
  };
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
            )}
          >
            <span className="flex items-center gap-2 font-medium">
              <input type="radio" value={m.value} className="accent-pine"
                     {...register(`items.${index}.pricing_method`, { onChange: (ev) => onSwitch(ev.target.value as PricingMethod) })} />
              {m.title}
            </span>
            <span className="ml-6 text-xs text-muted">{m.hint}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
