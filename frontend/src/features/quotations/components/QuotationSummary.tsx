import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/utils/formatting";
import type { Totals } from "../types";

type Props = {
  totals: Totals | null;
  itemCount: number;
  incomplete: number;
  settingsIncomplete: boolean;
  gst: { enabled: boolean; label: string };
  stale: boolean;
  saving: boolean;
  readOnly: boolean;
  dirty: boolean;
};

const Row = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
  <div className={`flex items-baseline justify-between gap-3 py-1.5 text-sm ${strong ? "font-medium" : ""}`}>
    <dt className="text-muted">{label}</dt>
    <dd className="tabular-nums">{value}</dd>
  </div>
);

/**
 * One element, two layouts: a bar pinned to the bottom on phones (total + save), and a sticky panel
 * beside the form on large screens. Every figure comes from the backend's calculation.
 */
export function QuotationSummary({ totals, itemCount, incomplete, settingsIncomplete, gst, stale, saving, readOnly, dirty }: Props) {
  const money = (v: string | undefined) => (v === undefined ? "—" : formatINR(v));
  const hasDiscount = totals && Number(totals.discount) > 0;
  const hasRounding = totals && Number(totals.rounding_adjustment) !== 0;
  return (
    <section
      aria-label="Quotation summary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface p-3 shadow-[0_-4px_14px_rgba(28,42,43,0.08)] md:left-60 lg:sticky lg:inset-x-auto lg:left-auto lg:top-20 lg:bottom-auto lg:rounded-lg lg:border lg:p-5 lg:shadow-none"
    >
      <h2 className="hidden text-lg font-semibold lg:block">Summary</h2>

      <dl className={`mt-2 hidden divide-y divide-line lg:block ${stale ? "opacity-70" : ""}`}>
        <Row label={itemCount === 1 ? "1 item" : `${itemCount} items`} value={money(totals?.subtotal)} />
        <Row label="Additional charges" value={money(totals?.additional_charges)} />
        {hasDiscount && <Row label="Discount" value={`− ${money(totals?.discount)}`} />}
        {gst.enabled && <Row label="Taxable amount" value={money(totals?.taxable_amount)} />}
        {gst.enabled && <Row label={gst.label} value={money(totals?.tax_amount)} />}
        {hasRounding && <Row label="Rounding" value={money(totals?.rounding_adjustment)} />}
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

      {(incomplete > 0 || settingsIncomplete) && (
        <p className="mt-2 hidden text-xs text-danger lg:block">
          {incomplete > 0 && `${incomplete === 1 ? "1 item is" : `${incomplete} items are`} incomplete and not in the total yet. `}
          {settingsIncomplete && "Some charge, discount or GST details need fixing before they count."}
        </p>
      )}

      {totals && (
        <details className="mt-3 hidden text-sm lg:block">
          <summary className="cursor-pointer text-muted">Your costs (internal)</summary>
          <dl className="mt-1 divide-y divide-line">
            <Row label="Material cost" value={money(totals.material_cost)} />
            <Row label="Profit on items" value={money(totals.profit)} />
          </dl>
          <p className="mt-1 text-xs text-muted">Never shown on the quotation you send.</p>
        </details>
      )}
    </section>
  );
}
