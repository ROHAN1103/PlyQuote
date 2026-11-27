import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { FormField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trimDecimal, formatINR } from "@/utils/formatting";
import type { QuotationFormValues } from "../schemas/quotationSchema";
import type { ItemResult } from "../types";
import { MaterialPicker } from "./MaterialPicker";
import { ProfitFields } from "./ProfitFields";

/** Material-based pricing: add the materials, quantities and rates, plus labour and other costs. Profit is added on top. */
export function MaterialPricingForm({ index, result }: { index: number; result: ItemResult | null }) {
  const { register, control, formState: { errors } } = useFormContext<QuotationFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: `items.${index}.materials`, keyName: "fieldKey" });
  const e = errors.items?.[index];
  const id = (f: string) => `item-${index}-${f}`;
  const rootError = e?.materials?.message ?? (e?.materials as { root?: { message?: string } } | undefined)?.root?.message;

  return (
    <div className="space-y-5">
      <FormField id={id("item_name")} label="Item name" error={e?.item_name?.message}>
        <Input id={id("item_name")} placeholder="e.g. Modular kitchen" aria-invalid={!!e?.item_name} {...register(`items.${index}.item_name`)} />
      </FormField>
      <FormField id={id("description")} label="Description" optional error={e?.description?.message}>
        <Input id={id("description")} {...register(`items.${index}.description`)} />
      </FormField>

      <section aria-label="Materials" className="space-y-3">
        <h3 className="text-sm font-medium">Materials</h3>
        <MaterialPicker id={id("picker")} onPick={(m) => append({
          material_id: m.id, name: [m.name, m.specification].filter(Boolean).join(" "), description: m.brand, unit: m.unit,
          quantity: "1", rate: trimDecimal(m.cost_rate),
        }, { shouldFocus: false })} />

        {fields.length > 0 && (
          <ul className="space-y-3">
            {fields.map((field, n) => {
              const le = e?.materials?.[n];
              const lid = (f: string) => `item-${index}-line-${n}-${f}`;
              return (
                <li key={field.fieldKey} className="rounded-md border border-line p-3">
                  <div className="grid gap-3 sm:grid-cols-[1fr_6rem]">
                    <FormField id={lid("name")} label="Material" error={le?.name?.message}>
                      <Input id={lid("name")} aria-invalid={!!le?.name} {...register(`items.${index}.materials.${n}.name`)} />
                    </FormField>
                    <FormField id={lid("unit")} label="Unit" error={le?.unit?.message}>
                      <Input id={lid("unit")} aria-invalid={!!le?.unit} {...register(`items.${index}.materials.${n}.unit`)} />
                    </FormField>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                    <FormField id={lid("quantity")} label="Quantity" error={le?.quantity?.message}>
                      <Input id={lid("quantity")} inputMode="decimal" aria-invalid={!!le?.quantity} {...register(`items.${index}.materials.${n}.quantity`)} />
                    </FormField>
                    <FormField id={lid("rate")} label="Rate (₹)" error={le?.rate?.message}>
                      <Input id={lid("rate")} inputMode="decimal" aria-invalid={!!le?.rate} {...register(`items.${index}.materials.${n}.rate`)} />
                    </FormField>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="mb-1.5 text-sm font-medium">Amount</p>
                      <p className="flex h-10 items-center tabular-nums" data-testid={`item-${index}-line-${n}-amount`}>
                        {result?.line_amounts[n] !== undefined ? formatINR(result.line_amounts[n]) : "…"}
                      </p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="col-span-2 justify-self-end hover:text-danger sm:col-span-1"
                            onClick={() => remove(n)} aria-label={`Remove material ${n + 1}`} title="Remove material"><Trash2 /></Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {rootError && <p role="alert" className="text-sm text-danger">{rootError}</p>}
        <Button type="button" variant="outline" size="sm"
                onClick={() => append({ material_id: "", name: "", description: "", unit: "", quantity: "1", rate: "" })}>
          <Plus /> Add a custom line
        </Button>
      </section>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Other costs <span className="font-normal text-muted">(₹, optional)</span></legend>
        <div className="grid gap-3 sm:grid-cols-4">
          {(["labour", "transportation", "installation", "other"] as const).map((f) => (
            <FormField key={f} id={id(f)} label={f[0]!.toUpperCase() + f.slice(1)} error={e?.[f]?.message}>
              <Input id={id(f)} inputMode="decimal" placeholder="0" aria-invalid={!!e?.[f]} {...register(`items.${index}.${f}`)} />
            </FormField>
          ))}
        </div>
      </fieldset>

      <ProfitFields index={index} />

      <dl className="space-y-1 rounded-md bg-paper px-3 py-2 text-sm" data-testid={`item-${index}-result`}>
        <div className="flex justify-between"><dt className="text-muted">Materials</dt><dd className="tabular-nums">{result ? formatINR(result.material_cost) : "…"}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">Labour and other costs</dt>
          <dd className="tabular-nums">{result ? formatINR((Number(result.labour_cost) + Number(result.additional_cost)).toFixed(2)) : "…"}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">Profit</dt><dd className="tabular-nums">{result ? formatINR(result.profit) : "…"}</dd></div>
        <div className="flex items-baseline justify-between border-t border-line pt-1"><dt className="text-muted">Selling price</dt>
          <dd className="text-base font-semibold tabular-nums" data-testid={`item-${index}-amount`}>{result ? formatINR(result.total) : "…"}</dd></div>
      </dl>
    </div>
  );
}
