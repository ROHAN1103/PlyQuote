import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Lock, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { Link, useBlocker, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Spinner } from "@/components/feedback/Spinner";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { useBuilderUi } from "@/store/quotationStore";
import { FurnitureItemList } from "../components/FurnitureItemList";
import { QuotationHeader, QuotationTerms } from "../components/QuotationHeader";
import { QuotationSummary } from "../components/QuotationSummary";
import { useLivePreview } from "../hooks/useLivePreview";
import { useQuotation, useQuotationDefaults, useSaveQuotation } from "../hooks/useQuotations";
import {
  emptyForm, quotationFormSchema, serverFieldToFormField, toFormValues, toPayload, type QuotationFormValues,
} from "../schemas/quotationSchema";
import type { Quotation, QuotationDefaults, Totals } from "../types";

const ZERO_TOTALS: Totals = { subtotal: "0.00", additional_charges: "0.00", discount: "0.00", tax_amount: "0.00", grand_total: "0.00" };

export default function QuotationBuilderPage() {
  const { id } = useParams();
  const isNew = !id;
  const defaults = useQuotationDefaults(isNew);
  const existing = useQuotation(id);

  const status = isNew ? defaults : existing;
  if (status.isPending) return <div className="py-16"><Spinner label="Loading quotation" /></div>;
  if (status.isError) {
    const notFound = status.error instanceof ApiError && status.error.status === 404;
    return (
      <div role="alert" className="mx-auto max-w-xl rounded-lg border border-danger/30 bg-danger-soft p-5 text-sm text-danger">
        <p>{notFound ? "We couldn't find that quotation. It may have been deleted." : "Couldn't load the quotation."}</p>
        <div className="mt-3 flex gap-2">
          {!notFound && <Button variant="outline" size="sm" onClick={() => status.refetch()}>Try again</Button>}
          <Button variant="outline" size="sm" asChild><Link to="/quotations">Back to quotations</Link></Button>
        </div>
      </div>
    );
  }

  // `key` makes React build a fresh form when switching between quotations.
  return (
    <BuilderForm
      key={id ?? "new"}
      quotation={existing.data}
      defaults={defaults.data}
      reload={() => existing.refetch()}
    />
  );
}

type Props = { quotation: Quotation | undefined; defaults: QuotationDefaults | undefined; reload: () => Promise<{ data?: Quotation }> };

function BuilderForm({ quotation, defaults, reload }: Props) {
  const navigate = useNavigate();
  const save = useSaveQuotation();
  const setExpanded = useBuilderUi((s) => s.setExpanded);
  const [formError, setFormError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const skipBlocker = useRef(false);

  const methods = useForm<QuotationFormValues>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: quotation ? toFormValues(quotation) : emptyForm(defaults!),
  });
  const { handleSubmit, reset, control, setError, formState: { isDirty } } = methods;

  const items = useWatch({ control, name: "items" }) ?? [];
  const preview = useLivePreview(items);
  const totals = items.length === 0 ? ZERO_TOTALS : (preview.totals ?? quotation?.totals ?? null);
  const readOnly = !!quotation && quotation.status !== "draft";

  useEffect(() => setExpanded(null), [setExpanded]);

  // Don't lose work: confirm before in-app navigation and before closing the tab.
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    isDirty && !skipBlocker.current && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const onValid = (values: QuotationFormValues) => {
    setFormError(null);
    save.mutate(
      { id: quotation?.id, rowVersion: quotation?.row_version, payload: toPayload(values) },
      {
        onSuccess: (saved) => {
          toast.success("Draft saved.");
          setStale(false);
          reset(toFormValues(saved));
          if (!quotation) {
            skipBlocker.current = true;
            navigate(`/quotations/${saved.id}`, { replace: true });
          }
        },
        onError: (e) => {
          if (!(e instanceof ApiError)) return setFormError("Something went wrong. Please try again.");
          if (e.code === "stale_quotation") return setStale(true);
          const mapped = e.fields.filter((f) => f.field !== "");
          if (mapped.length === 0) return setFormError(e.message);
          mapped.forEach((f) => setError(serverFieldToFormField(f.field) as keyof QuotationFormValues, { message: f.message }));
          setFormError(e.message);
        },
      },
    );
  };

  const reloadLatest = async () => {
    const result = await reload();
    if (result.data) {
      reset(toFormValues(result.data));
      setStale(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(onValid, () => toast.error("Some details need attention. Check the highlighted fields."))}
        noValidate
        className="mx-auto max-w-6xl pb-28 lg:pb-0"
      >
        <div className="mb-5">
          <Link to="/quotations" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden /> All quotations
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{quotation ? quotation.quotation_number : "New quotation"}</h1>
        </div>

        {readOnly && (
          <div role="status" className="mb-5 flex items-start gap-2 rounded-md border border-line bg-surface px-4 py-3 text-sm">
            <Lock className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
            <p>This quotation is <strong>{quotation!.status}</strong> and can't be edited. To change it, create a revision.</p>
          </div>
        )}
        {stale && (
          <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
            <p className="flex items-start gap-2"><TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              This quotation was changed somewhere else since you opened it. Your edits weren't saved.</p>
            <Button type="button" variant="outline" size="sm" onClick={reloadLatest}>Load the latest version</Button>
          </div>
        )}
        {formError && !stale && (
          <div role="alert" className="mb-5 rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">{formError}</div>
        )}

        <fieldset disabled={readOnly} className="contents">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
            <div className="min-w-0 space-y-5">
              <QuotationHeader number={quotation?.quotation_number ?? null} status={quotation?.effective_status ?? "draft"} />
              <FurnitureItemList itemTotals={preview.itemTotals} />
              <QuotationTerms />
            </div>
            <div>
              <QuotationSummary
                totals={totals} itemCount={items.length} incomplete={preview.incomplete} stale={preview.stale}
                saving={save.isPending} readOnly={readOnly} dirty={isDirty || !quotation}
              />
            </div>
          </div>
        </fieldset>
      </form>

      <ConfirmDialog
        open={blocker.state === "blocked"}
        title="Leave without saving?"
        description="You have unsaved changes to this quotation. If you leave now they will be lost."
        confirmLabel="Leave without saving" destructive
        onCancel={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
      />
    </FormProvider>
  );
}
