import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { useCreateMaterial, useUpdateMaterial } from "../hooks/useMaterials";
import {
  emptyMaterialForm, materialFormSchema, toFormValues, toPayload, type MaterialFormValues,
} from "../schemas/materialSchema";
import { CATEGORIES, UNIT_SUGGESTIONS, type Material } from "../types";

type Props = { open: boolean; material: Material | null; onClose: () => void };

export function MaterialFormDialog({ open, material, onClose }: Props) {
  const editing = material !== null;
  const create = useCreateMaterial();
  const update = useUpdateMaterial();
  const [formError, setFormError] = useState<string | null>(null);

  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<MaterialFormValues>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: emptyMaterialForm,
  });

  useEffect(() => {
    if (open) {
      reset(material ? toFormValues(material) : emptyMaterialForm);
      setFormError(null);
    }
  }, [open, material, reset]);

  const pending = create.isPending || update.isPending;

  const onSubmit = (values: MaterialFormValues) => {
    setFormError(null);
    const payload = toPayload(values);
    const handlers = {
      onSuccess: () => {
        toast.success(editing ? "Material updated." : "Material added.");
        onClose();
      },
      onError: (e: unknown) => {
        if (!(e instanceof ApiError)) return setFormError("Something went wrong. Please try again.");
        // Show server-side field errors next to the fields; anything else at the top of the form.
        const known = new Set(Object.keys(emptyMaterialForm));
        const mapped = e.fields.filter((f) => known.has(f.field));
        mapped.forEach((f) => setError(f.field as keyof MaterialFormValues, { message: f.message }));
        if (mapped.length === 0) setFormError(e.message);
      },
    };
    if (editing) update.mutate({ id: material.id, payload }, handlers);
    else create.mutate(payload, handlers);
  };

  const err = (k: keyof MaterialFormValues) => errors[k]?.message;
  const attrs = (k: keyof MaterialFormValues) => ({ "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `${k}-error` : undefined });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent title={editing ? "Edit material" : "Add material"} description="Rates are in rupees (₹) per unit.">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="space-y-4">
            {formError && (
              <div role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
                {formError}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="category" label="Category" error={err("category")}>
                <Select id="category" {...attrs("category")} {...register("category")}>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </Select>
              </FormField>
              <FormField id="unit" label="Unit" error={err("unit")} hint="What you buy or quote by, e.g. sheet, pc, r.ft.">
                <Input id="unit" list="unit-suggestions" autoComplete="off" {...attrs("unit")} {...register("unit")} />
                <datalist id="unit-suggestions">{UNIT_SUGGESTIONS.map((u) => <option key={u} value={u} />)}</datalist>
              </FormField>
            </div>

            <FormField id="name" label="Name" error={err("name")}>
              <Input id="name" placeholder="e.g. BWP Plywood" {...attrs("name")} {...register("name")} />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="brand" label="Brand" optional error={err("brand")}>
                <Input id="brand" {...attrs("brand")} {...register("brand")} />
              </FormField>
              <FormField id="specification" label="Specification" optional error={err("specification")} hint="e.g. 18mm, Matte">
                <Input id="specification" {...attrs("specification")} {...register("specification")} />
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="cost_rate" label="Cost rate (₹)" error={err("cost_rate")}>
                <Input id="cost_rate" inputMode="decimal" placeholder="0.00" {...attrs("cost_rate")} {...register("cost_rate")} />
              </FormField>
              <FormField id="selling_rate" label="Selling rate (₹)" optional error={err("selling_rate")}>
                <Input id="selling_rate" inputMode="decimal" placeholder="0.00" {...attrs("selling_rate")} {...register("selling_rate")} />
              </FormField>
            </div>

            <FormField id="description" label="Description" optional error={err("description")}>
              <Textarea id="description" {...attrs("description")} {...register("description")} />
            </FormField>

            {editing && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="size-4 accent-pine" {...register("is_active")} />
                Active (available for new quotations)
              </label>
            )}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : editing ? "Save changes" : "Add material"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
