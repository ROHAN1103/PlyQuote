import { ArrowDown, ArrowUp, ChevronDown, Copy, Trash2 } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatINR } from "@/utils/formatting";
import type { QuotationFormValues } from "../schemas/quotationSchema";
import { ManualPricingForm } from "./ManualPricingForm";
import { PricingMethodSelector } from "./PricingMethodSelector";

type Props = {
  index: number;
  expanded: boolean;
  total: string | null;
  isFirst: boolean;
  isLast: boolean;
  onToggle: () => void;
  onMove: (direction: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
};

export function FurnitureItemForm({ index, expanded, total, isFirst, isLast, onToggle, onMove, onDuplicate, onRemove }: Props) {
  const { formState: { errors } } = useFormContext<QuotationFormValues>();
  const item = useWatch<QuotationFormValues, `items.${number}`>({ name: `items.${index}` });
  const name = item?.item_name?.trim() || "Untitled item";
  const hasErrors = !!errors.items?.[index];
  const panelId = `item-panel-${index}`;

  return (
    <li className={cn("rounded-lg border bg-surface", hasErrors ? "border-danger/50" : "border-line")}>
      <div className="flex flex-wrap items-center gap-x-1 gap-y-0 p-2 sm:p-3">
        <button type="button" onClick={onToggle} aria-expanded={expanded} aria-controls={panelId}
                className="flex w-full min-w-0 items-center gap-3 rounded-md p-1 text-left hover:bg-pine-soft/50 sm:w-auto sm:flex-1">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-pine-soft text-xs font-semibold text-pine">{index + 1}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{name}</span>
            <span className="block truncate text-xs text-muted">
              {item?.quantity || "—"} {item?.unit} × {item?.unit_rate ? formatINR(item.unit_rate) : "—"}
            </span>
          </span>
          {hasErrors && <Badge variant="warning">Needs attention</Badge>}
          <span className="shrink-0 text-right font-semibold tabular-nums">{total ? formatINR(total) : "—"}</span>
          <ChevronDown className={cn("size-4 shrink-0 text-muted transition-transform", expanded && "rotate-180")} aria-hidden />
        </button>
        <div className="ml-auto flex shrink-0 items-center">
          <Button type="button" variant="ghost" size="icon" className="size-8" disabled={isFirst} onClick={() => onMove(-1)} aria-label={`Move ${name} up`} title="Move up"><ArrowUp /></Button>
          <Button type="button" variant="ghost" size="icon" className="size-8" disabled={isLast} onClick={() => onMove(1)} aria-label={`Move ${name} down`} title="Move down"><ArrowDown /></Button>
          <Button type="button" variant="ghost" size="icon" className="size-8" onClick={onDuplicate} aria-label={`Duplicate ${name}`} title="Duplicate"><Copy /></Button>
          <Button type="button" variant="ghost" size="icon" className="size-8 hover:text-danger" onClick={onRemove} aria-label={`Remove ${name}`} title="Remove"><Trash2 /></Button>
        </div>
      </div>

      {expanded && (
        <div id={panelId} className="space-y-5 border-t border-line p-4">
          <PricingMethodSelector index={index} />
          <ManualPricingForm index={index} amount={total} />
        </div>
      )}
    </li>
  );
}
