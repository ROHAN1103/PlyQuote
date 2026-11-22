import { Pencil, PowerOff, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatINR, isZeroAmount } from "@/utils/formatting";
import { categoryLabel, type Material } from "../types";

type Props = {
  items: Material[];
  onEdit: (m: Material) => void;
  onDeactivate: (m: Material) => void;
  onReactivate: (m: Material) => void;
};

export function MaterialsTable({ items, onEdit, onDeactivate, onReactivate }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full min-w-[46rem] text-left text-sm">
        <thead className="border-b border-line bg-paper text-xs uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">Material</th>
            <th scope="col" className="px-4 py-3 font-medium">Category</th>
            <th scope="col" className="px-4 py-3 font-medium">Unit</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Cost rate</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Selling rate</th>
            <th scope="col" className="px-4 py-3 font-medium">Status</th>
            <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {items.map((m) => (
            <tr key={m.id} className={m.is_active ? "" : "bg-paper/60 text-muted"}>
              <td className="px-4 py-3">
                <p className="font-medium text-ink">{m.name}</p>
                {(m.brand || m.specification) && (
                  <p className="text-xs text-muted">{[m.brand, m.specification].filter(Boolean).join(" · ")}</p>
                )}
              </td>
              <td className="px-4 py-3"><Badge variant="birch">{categoryLabel(m.category)}</Badge></td>
              <td className="px-4 py-3">{m.unit}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {isZeroAmount(m.cost_rate) ? <Badge variant="warning">Rate not set</Badge> : formatINR(m.cost_rate)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{formatINR(m.selling_rate)}</td>
              <td className="px-4 py-3"><Badge variant={m.is_active ? "default" : "muted"}>{m.is_active ? "Active" : "Inactive"}</Badge></td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(m)} aria-label={`Edit ${m.name}`}><Pencil /> Edit</Button>
                  {m.is_active ? (
                    <Button variant="ghost" size="sm" onClick={() => onDeactivate(m)} aria-label={`Deactivate ${m.name}`} title="Deactivate"><PowerOff /></Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => onReactivate(m)} aria-label={`Reactivate ${m.name}`} title="Reactivate"><RotateCcw /></Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
