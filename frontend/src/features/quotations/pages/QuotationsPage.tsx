import { FileText, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Spinner } from "@/components/feedback/Spinner";
import { Pagination } from "@/components/tables/Pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ApiError } from "@/lib/api";
import { formatDate, formatINR } from "@/utils/formatting";
import { StatusBadge } from "../components/StatusBadge";
import { useDeleteQuotation, useQuotations } from "../hooks/useQuotations";
import { PAGE_SIZE, STATUS_LABELS, type EffectiveStatus, type QuotationSummary, type StatusFilter } from "../types";

export default function QuotationsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("");
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<QuotationSummary | null>(null);
  const q = useDebouncedValue(search, 300);

  const { data, isPending, isError, error, refetch, isFetching } = useQuotations({ q, status, page });
  const remove = useDeleteQuotation();
  const filtersActive = q.trim() !== "" || status !== "";

  const confirmDelete = () => {
    if (!toDelete) return;
    remove.mutate(toDelete.id, {
      onSuccess: () => { toast.success(`${toDelete.quotation_number} deleted.`); setToDelete(null); },
      onError: (e) => { toast.error(e instanceof ApiError ? e.message : "Couldn't delete the quotation."); setToDelete(null); },
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Quotations</h1>
          <p className="mt-1 text-sm text-muted">Every quotation you've prepared, newest first.</p>
        </div>
        <Button asChild><Link to="/quotations/new"><Plus /> New quotation</Link></Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted" aria-hidden />
          <Input aria-label="Search quotations" placeholder="Search by number, client or project" className="pl-9"
                 value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value as StatusFilter); setPage(1); }}>
          <option value="">All statuses</option>
          {(Object.keys(STATUS_LABELS) as EffectiveStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </Select>
      </div>

      {isPending ? (
        <div className="py-16"><Spinner label="Loading quotations" /></div>
      ) : isError ? (
        <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft p-5 text-sm text-danger">
          <p>{error instanceof ApiError ? error.message : "Couldn't load quotations."}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>Try again</Button>
        </div>
      ) : data.total === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-surface p-10 text-center">
          <FileText className="mx-auto size-6 text-birch-deep" aria-hidden />
          <h2 className="mt-3 text-lg font-semibold">{filtersActive ? "No quotations match" : "No quotations yet"}</h2>
          <p className="mt-1 text-sm text-muted">{filtersActive ? "Try a different search or clear the filters." : "Create your first quotation to get started."}</p>
          {!filtersActive && <Button asChild className="mt-4"><Link to="/quotations/new"><Plus /> New quotation</Link></Button>}
        </div>
      ) : (
        <div className={isFetching ? "opacity-70 transition-opacity" : ""}>
          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="border-b border-line bg-paper text-xs uppercase tracking-wide text-muted">
                <tr>
                  {["Number", "Client", "Project", "Date", "Amount", "Status"].map((h) => (
                    <th key={h} scope="col" className={`px-4 py-3 font-medium ${h === "Amount" ? "text-right" : ""}`}>{h}</th>
                  ))}
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((qt) => (
                  <tr key={qt.id}>
                    <td className="px-4 py-3 font-medium tabular-nums">
                      <Link to={`/quotations/${qt.id}`} className="text-pine hover:underline">{qt.quotation_number}</Link>
                      {qt.revision > 1 && <span className="ml-1 text-xs text-muted">R{qt.revision}</span>}
                    </td>
                    <td className="px-4 py-3">{qt.client_name}</td>
                    <td className="px-4 py-3 text-muted">{qt.project_name || "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(qt.quotation_date)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatINR(qt.grand_total)}</td>
                    <td className="px-4 py-3"><StatusBadge status={qt.effective_status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" asChild><Link to={`/quotations/${qt.id}`} aria-label={`Open ${qt.quotation_number}`}>Open</Link></Button>
                        {qt.status === "draft" && (
                          <Button variant="ghost" size="sm" className="hover:text-danger" onClick={() => setToDelete(qt)} aria-label={`Delete ${qt.quotation_number}`} title="Delete draft"><Trash2 /></Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} total={data.total} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      )}

      <ConfirmDialog
        open={toDelete !== null} title="Delete this draft?"
        description={`${toDelete?.quotation_number ?? "This draft"} (${toDelete?.client_name ?? ""}) will be permanently deleted. Its number won't be reused.`}
        confirmLabel="Delete draft" destructive pending={remove.isPending}
        onConfirm={confirmDelete} onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
