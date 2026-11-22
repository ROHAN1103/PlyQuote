import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UNIT_SUGGESTIONS } from "@/features/quotations/types";
import { ApiError } from "@/lib/api";
import { useCreateTemplate, useUpdateTemplate } from "../hooks/useTemplates";
import { emptyTemplateForm, templateFormSchema, toFormValues, toPayload, type TemplateFormValues } from "../schemas/templateSchema";
import type { FurnitureTemplate } from "../types";

type Props = { open: boolean; template: FurnitureTemplate | null; onClose: () => void };

export function TemplateFormDialog({ open, template, onClose }: Props) {
  const editing = template !== null;
  const create = useCreateTemplate();
  const update = useUpdateTemplate();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema), defaultValues: emptyTemplateForm,
  });

  useEffect(() => {
    if (open) { reset(template ? toFormValues(template) : emptyTemplateForm); setFormError(null); }
  }, [open, template, reset]);

  const pending = create.isPending || update.isPending;
  const err = (k: keyof TemplateFormValues) => errors[k]?.message;
  const a = (k: keyof TemplateFormValues) => ({ "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `${k}-error` : undefined });

  const onSubmit = (values: TemplateFormValues) => {
    setFormError(null);
    const handlers = {
      onSuccess: () => { toast.success(editing ? "Template updated." : "Template added."); onClose(); },
      onError: (e: unknown) => {
        if (!(e instanceof ApiError)) return setFormError("Something went wrong. Please try again.");
        const nameError = e.fields.find((f) => f.field === "name");
        if (nameError) return setError("name", { message: nameError.message });
        setFormError(e.message);
      },
    };
    if (editing) update.mutate({ id: template.id, payload: toPayload(values) }, handlers);
    else create.mutate(toPayload(values), handlers);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent title={editing ? "Edit template" : "Add template"} description="Starting values for a new item. You can change them on each quotation.">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="space-y-4">
            {formError && <div role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</div>}
            <FormField id="tpl-name" label="Name" error={err("name")}>
              <Input id="tpl-name" placeholder="e.g. TV unit" {...a("name")} {...register("name")} />
            </FormField>
            <FormField id="tpl-description" label="Description" optional error={err("description")}>
              <Textarea id="tpl-description" {...a("description")} {...register("description")} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField id="tpl-quantity" label="Quantity" error={err("quantity")}>
                <Input id="tpl-quantity" inputMode="decimal" {...a("quantity")} {...register("quantity")} />
              </FormField>
              <FormField id="tpl-unit" label="Unit" error={err("unit")}>
                <Input id="tpl-unit" list="tpl-units" autoComplete="off" {...a("unit")} {...register("unit")} />
                <datalist id="tpl-units">{UNIT_SUGGESTIONS.map((u) => <option key={u} value={u} />)}</datalist>
              </FormField>
              <FormField id="tpl-unit_rate" label="Rate (₹)" error={err("unit_rate")}>
                <Input id="tpl-unit_rate" inputMode="decimal" {...a("unit_rate")} {...register("unit_rate")} />
              </FormField>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : editing ? "Save changes" : "Add template"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
