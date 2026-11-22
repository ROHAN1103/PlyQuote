import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/utils/formatting";
import type { Totals } from "../types";

type Props = {
  totals: Totals | null;
  itemCount: number;
  incomplete: number;
  stale: boolean;
  saving: boolean;
  readOnly: boolean;
  dirty: boolean;
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
    <dt className="text-muted">{label}</dt>
    <dd className="tabular-nums">{value}</dd>
  </div>
);

/**
 * One element, two layouts: a bar pinned to the bottom on phones (total + save), and a sticky panel
 * beside the form on large screens. Every figure comes from the backend's calculation.
 */
export function QuotationSummary({ totals, itemCount, incomplete, stale, saving, readOnly, dirty }: Props) {
  const money = (v: string | undefined) => (v === undefined ? "—" : formatINR(v));
  return (
    <section
      aria-label="Quotation summary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface p-3 shadow-[0_-4px_14px_rgba(28,42,43,0.08)] md:left-60 lg:sticky lg:inset-x-auto lg:left-auto lg:top-20 lg:bottom-auto lg:rounded-lg lg:border lg:p-5 lg:shadow-none"
    >
      <h2 className="hidden text-lg font-semibold lg:block">Summary</h2>

      <dl className="mt-2 hidden divide-y divide-line lg:block">
        <Row label={itemCount === 1 ? "1 item" : `${itemCount} items`} value={money(totals?.subtotal)} />
        <Row label="Additional charges" value={money(totals?.additional_charges)} />
        <Row label="Discount" value={money(totals?.discount)} />
        <Row label="GST" value={money(totals?.tax_amount)} />
      </dl>

      <div className="flex items-center justify-between gap-3 lg:mt-3 lg:block">
        <div className="lg:flex lg:items-baseline lg:justify-between">
          <p className="text-xs text-muted lg:text-sm lg:font-medium lg:text-ink">Total</p>
          <p className={`text-lg font-semibold tabular-nums lg:text-2xl ${stale ? "opacity-60" : ""}`} data-testid="grand-total" aria-live="polite">
            {money(totals?.grand_total)}
          </p>
        </div>
        <Button type="submit" className="lg:mt-4 lg:w-full" disabled={saving || readOnly || !dirty}>
          {saving ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
          {saving ? "Saving…" : "Save draft"}
        </Button>
      </div>

      {incomplete > 0 && (
        <p className="mt-2 hidden text-xs text-danger lg:block">
          {incomplete === 1 ? "1 item is" : `${incomplete} items are`} incomplete and not included in the total yet.
        </p>
      )}
      <p className="mt-2 hidden text-xs text-muted lg:block">Discounts, extra charges and GST aren't applied yet. They're coming in the next update.</p>
    </section>
  );
}
