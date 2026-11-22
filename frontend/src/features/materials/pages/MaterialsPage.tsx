import { Layers, Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Spinner } from "@/components/feedback/Spinner";
import { Pagination } from "@/components/tables/Pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ApiError } from "@/lib/api";
import { MaterialFormDialog } from "../components/MaterialFormDialog";
import { MaterialsTable } from "../components/MaterialsTable";
import { useDeactivateMaterial, useMaterials, useUpdateMaterial } from "../hooks/useMaterials";
import { toFormValues, toPayload } from "../schemas/materialSchema";
import { CATEGORIES, PAGE_SIZE, type Material, type MaterialCategory, type StatusFilter } from "../types";

export default function MaterialsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<MaterialCategory | "">("");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search, 300);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [toDeactivate, setToDeactivate] = useState<Material | null>(null);

  const { data, isPending, isError, error, refetch, isFetching } = useMaterials({ q, category, status, page });
  const deactivate = useDeactivateMaterial();
  const update = useUpdateMaterial();

  const filtersActive = q.trim() !== "" || category !== "" || status !== "active";
  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (m: Material) => { setEditing(m); setFormOpen(true); };
  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(1); };

  const confirmDeactivate = () => {
    if (!toDeactivate) return;
    deactivate.mutate(toDeactivate.id, {
      onSuccess: () => { toast.success(`${toDeactivate.name} deactivated.`); setToDeactivate(null); },
      onError: (e) => toast.error(e instanceof ApiError ? e.message : "Couldn't deactivate the material."),
    });
  };
  const reactivate = (m: Material) =>
    update.mutate({ id: m.id, payload: toPayload({ ...toFormValues(m), is_active: true }) }, {
      onSuccess: () => toast.success(`${m.name} is active again.`),
      onError: (e) => toast.error(e instanceof ApiError ? e.message : "Couldn't reactivate the material."),
    });

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Materials</h1>
          <p className="mt-1 text-sm text-muted">Your price list. Changing a rate here never changes quotations you've already saved.</p>
        </div>
        <Button onClick={openAdd}><Plus /> Add material</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_12rem_10rem]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted" aria-hidden />
          <Input aria-label="Search materials" placeholder="Search by name, brand or specification" className="pl-9"
                 value={search} onChange={(e) => resetPage(setSearch)(e.target.value)} />
        </div>
        <Select aria-label="Category" value={category} onChange={(e) => resetPage(setCategory)(e.target.value as MaterialCategory | "")}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </Select>
        <Select aria-label="Status" value={status} onChange={(e) => resetPage(setStatus)(e.target.value as StatusFilter)}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All statuses</option>
        </Select>
      </div>

      {isPending ? (
        <div className="py-16"><Spinner label="Loading materials" /></div>
      ) : isError ? (
        <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft p-5 text-sm text-danger">
          <p>{error instanceof ApiError ? error.message : "Couldn't load materials."}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>Try again</Button>
        </div>
      ) : data.total === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-surface p-10 text-center">
          <Layers className="mx-auto size-6 text-birch-deep" aria-hidden />
          <h2 className="mt-3 text-lg font-semibold">{filtersActive ? "No materials match" : "No materials yet"}</h2>
          <p className="mt-1 text-sm text-muted">
            {filtersActive ? "Try a different search or clear the filters." : "Add the plywood, laminates and hardware you quote with."}
          </p>
          {!filtersActive && <Button className="mt-4" onClick={openAdd}><Plus /> Add your first material</Button>}
        </div>
      ) : (
        <div className={isFetching ? "opacity-70 transition-opacity" : ""}>
          <MaterialsTable items={data.items} onEdit={openEdit} onDeactivate={setToDeactivate} onReactivate={reactivate} />
          <Pagination page={data.page} pages={data.pages} total={data.total} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      )}

      <MaterialFormDialog open={formOpen} material={editing} onClose={() => setFormOpen(false)} />
      <ConfirmDialog
        open={toDeactivate !== null}
        title="Deactivate this material?"
        description={`${toDeactivate?.name ?? "This material"} will no longer be offered for new quotations. Existing quotations keep their prices, and you can reactivate it any time.`}
        confirmLabel="Deactivate"
        destructive
        pending={deactivate.isPending}
        onConfirm={confirmDeactivate}
        onCancel={() => setToDeactivate(null)}
      />
    </div>
  );
}
