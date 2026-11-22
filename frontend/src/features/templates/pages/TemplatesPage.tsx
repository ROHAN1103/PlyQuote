import { LayoutTemplate, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Spinner } from "@/components/feedback/Spinner";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { formatINR, trimDecimal } from "@/utils/formatting";
import { TemplateFormDialog } from "../components/TemplateFormDialog";
import { useDeleteTemplate, useTemplates } from "../hooks/useTemplates";
import type { FurnitureTemplate } from "../types";

export default function TemplatesPage() {
  const { data, isPending, isError, refetch } = useTemplates();
  const remove = useDeleteTemplate();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FurnitureTemplate | null>(null);
  const [toRemove, setToRemove] = useState<FurnitureTemplate | null>(null);

  const openAdd = () => { setEditing(null); setFormOpen(true); };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Furniture templates</h1>
          <p className="mt-1 text-sm text-muted">Pieces you quote often. Add one to a quotation in a click, then adjust it there.</p>
        </div>
        <Button onClick={openAdd}><Plus /> Add template</Button>
      </div>

      {isPending ? (
        <div className="py-16"><Spinner label="Loading templates" /></div>
      ) : isError ? (
        <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft p-5 text-sm text-danger">
          <p>Couldn't load templates.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>Try again</Button>
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-surface p-10 text-center">
          <LayoutTemplate className="mx-auto size-6 text-birch-deep" aria-hidden />
          <h2 className="mt-3 text-lg font-semibold">No templates yet</h2>
          <p className="mt-1 text-sm text-muted">Save a wardrobe, TV unit or bed as a template to reuse it.</p>
          <Button className="mt-4" onClick={openAdd}><Plus /> Add your first template</Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="border-b border-line bg-paper text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Template</th>
                <th scope="col" className="px-4 py-3 font-medium">Starts with</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{t.name}</p>
                    {t.description && <p className="line-clamp-1 text-xs text-muted">{t.description}</p>}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted">
                    {trimDecimal(t.default_config.quantity)} {t.default_config.unit} × {formatINR(t.default_config.unit_rate)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setEditing(t); setFormOpen(true); }} aria-label={`Edit ${t.name}`}><Pencil /> Edit</Button>
                      <Button variant="ghost" size="sm" className="hover:text-danger" onClick={() => setToRemove(t)} aria-label={`Remove ${t.name}`} title="Remove"><Trash2 /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TemplateFormDialog open={formOpen} template={editing} onClose={() => setFormOpen(false)} />
      <ConfirmDialog
        open={toRemove !== null} title="Remove this template?"
        description={`${toRemove?.name ?? "This template"} will no longer be offered when you add items. Quotations that already used it are not affected.`}
        confirmLabel="Remove template" destructive pending={remove.isPending}
        onCancel={() => setToRemove(null)}
        onConfirm={() => toRemove && remove.mutate(toRemove.id, {
          onSuccess: () => { toast.success(`${toRemove.name} removed.`); setToRemove(null); },
          onError: (e) => { toast.error(e instanceof ApiError ? e.message : "Couldn't remove the template."); setToRemove(null); },
        })}
      />
    </div>
  );
}
