import { PackagePlus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useTemplates } from "@/features/templates/hooks/useTemplates";
import { trimDecimal } from "@/utils/formatting";
import { useBuilderUi } from "@/store/quotationStore";
import { newItem, type QuotationFormValues } from "../schemas/quotationSchema";
import { FurnitureItemForm } from "./FurnitureItemForm";

type Props = { itemTotals: (string | null)[] };

const isBlank = (i?: Partial<QuotationFormValues["items"][number]>) => !i?.item_name?.trim() && !i?.unit_rate?.trim() && !i?.description?.trim();

export function FurnitureItemList({ itemTotals }: Props) {
  const { control, getValues, setFocus, formState: { errors, submitCount } } = useFormContext<QuotationFormValues>();
  // keyName: our own `id` (the server's item id) must survive; RHF's list key gets a different name.
  const { fields, append, insert, remove, move } = useFieldArray({ control, name: "items", keyName: "fieldKey" });
  const { expandedKey, setExpanded } = useBuilderUi();
  // Saved items keep their server id across a save (so an open item stays open); unsaved ones use RHF's key.
  const keyOf = (f: { id?: string; fieldKey: string }) => f.id ?? f.fieldKey;
  const { data: templates } = useTemplates();
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);

  // After a failed save, open the first item with a problem and focus its first invalid field.
  useEffect(() => {
    if (submitCount === 0 || !Array.isArray(errors.items)) return;
    const index = errors.items.findIndex(Boolean);
    const target = fields[index];
    const key = target && keyOf(target);
    if (index < 0 || !key) return;
    setExpanded(key);
    const field = (["item_name", "quantity", "unit", "unit_rate", "description"] as const).find((f) => errors.items?.[index]?.[f]);
    if (field) setTimeout(() => setFocus(`items.${index}.${field}`), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitCount]);

  // Newly added or duplicated items open automatically. The new row's key only exists after it renders,
  // so remember which index to open and do it in an effect.
  const pendingOpen = useRef<number | null>(null);
  useEffect(() => {
    const index = pendingOpen.current;
    const target = index === null ? undefined : fields[index];
    const key = target && keyOf(target);
    if (key) {
      setExpanded(key);
      pendingOpen.current = null;
    }
  }, [fields, setExpanded]);

  const add = (values = newItem()) => {
    pendingOpen.current = fields.length;
    append(values, { shouldFocus: false });
  };

  const duplicate = (index: number) => {
    const source = getValues(`items.${index}`);
    pendingOpen.current = index + 1;
    insert(index + 1, { ...source, id: undefined, item_name: `${source.item_name} (copy)`.slice(0, 200) }, { shouldFocus: false });
  };

  const requestRemove = (index: number) => (isBlank(getValues(`items.${index}`)) ? remove(index) : setRemoveIndex(index));

  return (
    <section aria-labelledby="items-heading" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="items-heading" className="text-lg font-semibold">Furniture items</h2>
        <div className="flex flex-wrap items-center gap-2">
          {templates && templates.length > 0 && (
            <Select aria-label="Add from template" className="h-9 w-48" value=""
                    onChange={(e) => {
                      const t = templates.find((x) => x.id === e.target.value);
                      if (!t) return;
                      add(newItem({
                        item_name: t.name, description: t.description, unit: t.default_config.unit,
                        quantity: trimDecimal(t.default_config.quantity), unit_rate: trimDecimal(t.default_config.unit_rate),
                      }));
                    }}>
              <option value="">Add from template…</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          )}
          <Button type="button" size="sm" onClick={() => add()}><Plus /> Add item</Button>
        </div>
      </div>

      {typeof errors.items?.message === "string" && <p role="alert" className="text-sm text-danger">{errors.items.message}</p>}

      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-surface p-8 text-center">
          <PackagePlus className="mx-auto size-6 text-birch-deep" aria-hidden />
          <p className="mt-2 font-medium">No furniture items yet</p>
          <p className="mt-1 text-sm text-muted">Add the wardrobes, kitchens, TV units and other pieces you're quoting.</p>
          <Button type="button" className="mt-4" onClick={() => add()}><Plus /> Add your first item</Button>
        </div>
      ) : (
        <ol className="space-y-2">
          {fields.map((field, index) => (
            <FurnitureItemForm
              key={field.fieldKey}
              index={index}
              expanded={expandedKey === keyOf(field)}
              total={itemTotals[index] ?? null}
              isFirst={index === 0}
              isLast={index === fields.length - 1}
              onToggle={() => setExpanded(expandedKey === keyOf(field) ? null : keyOf(field))}
              onMove={(d) => move(index, index + d)}
              onDuplicate={() => duplicate(index)}
              onRemove={() => requestRemove(index)}
            />
          ))}
        </ol>
      )}

      <ConfirmDialog
        open={removeIndex !== null}
        title="Remove this item?"
        description={`"${removeIndex !== null ? getValues(`items.${removeIndex}.item_name`) || "This item" : ""}" will be taken off the quotation when you save.`}
        confirmLabel="Remove item" destructive
        onCancel={() => setRemoveIndex(null)}
        onConfirm={() => { if (removeIndex !== null) remove(removeIndex); setRemoveIndex(null); }}
      />
    </section>
  );
}
