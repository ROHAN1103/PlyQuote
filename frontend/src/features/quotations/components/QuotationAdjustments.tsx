import { useFormContext } from "react-hook-form";
import { FormField } from "@/components/forms/FormField";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { QuotationFormValues } from "../schemas/quotationSchema";

const CHARGES = [
  ["charge_labour", "Labour"], ["charge_transportation", "Transportation"],
  ["charge_installation", "Installation"], ["charge_miscellaneous", "Miscellaneous"],
] as const;

type Field = keyof QuotationFormValues;

/** Quotation-level money: extra charges, discount, GST and round-off. Applied after the items, in that order. */
export function QuotationAdjustments() {
  const { register, watch, formState: { errors } } = useFormContext<QuotationFormValues>();
  const err = (f: Field) => (errors[f] as { message?: string } | undefined)?.message;
  const a = (f: Field) => ({ "aria-invalid": !!errors[f], "aria-describedby": errors[f] ? `${f}-error` : undefined });
  const discountType = watch("discount_type");
  const gstOn = watch("gst_enabled");

  return (
    <section aria-labelledby="adjust-heading" className="rounded-lg border border-line bg-surface p-5">
      <h2 id="adjust-heading" className="text-lg font-semibold">Charges, discount and tax</h2>
      <p className="mt-1 text-sm text-muted">Applied after your items: charges are added, the discount comes off, then GST.</p>

      <div className="mt-4 space-y-6">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Additional charges <span className="font-normal text-muted">(₹, optional)</span></legend>
          <div className="grid gap-3 sm:grid-cols-4">
            {CHARGES.map(([f, label]) => (
              <FormField key={f} id={f} label={label} error={err(f)}>
                <Input id={f} inputMode="decimal" placeholder="0" {...a(f)} {...register(f)} />
              </FormField>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Discount</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField id="discount_type" label="Type">
              <Select id="discount_type" {...register("discount_type")}>
                <option value="none">No discount</option>
                <option value="percent">Percentage</option>
                <option value="fixed">Fixed amount</option>
              </Select>
            </FormField>
            {discountType !== "none" && (
              <FormField id="discount_value" label={discountType === "percent" ? "Discount (%)" : "Discount (₹)"} error={err("discount_value")}>
                <Input id="discount_value" inputMode="decimal" {...a("discount_value")} {...register("discount_value")} />
              </FormField>
            )}
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="mb-2 text-sm font-medium">GST</legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-pine" {...register("gst_enabled")} /> Charge GST on this quotation
          </label>
          {gstOn && (
            <div className="space-y-3">
              <div className="max-w-[12rem]">
                <FormField id="gst_rate_percent" label="GST rate (%)" error={err("gst_rate_percent")}>
                  <Input id="gst_rate_percent" inputMode="decimal" placeholder="e.g. 18" {...a("gst_rate_percent")} {...register("gst_rate_percent")} />
                </FormField>
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-0.5 size-4 accent-pine" {...register("prices_include_tax")} />
                <span>The prices I've entered already include GST</span>
              </label>
            </div>
          )}
        </fieldset>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-pine" {...register("round_to_rupee")} /> Round the total to the nearest rupee
        </label>
      </div>
    </section>
  );
}
