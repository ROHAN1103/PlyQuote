import { Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useMaterials } from "@/features/materials/hooks/useMaterials";
import type { Material } from "@/features/materials/types";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatINR, isZeroAmount } from "@/utils/formatting";

/** Search the catalogue and pick a material. Only active materials are offered. */
export function MaterialPicker({ id, onPick }: { id: string; onPick: (m: Material) => void }) {
  const [text, setText] = useState("");
  const q = useDebouncedValue(text, 250);
  // The list follows what is typed right now (so it closes the instant a material is picked); the request follows
  // the debounced text (so we don't search on every keystroke).
  const open = text.trim() !== "";
  const querying = q.trim() !== "";
  const { data, isFetching } = useMaterials({ q: querying ? q : "", category: "", status: "active", page: 1 }, { enabled: querying });
  const settled = q === text && !isFetching;
  const results = (open && querying ? data?.items : undefined)?.slice(0, 8) ?? [];

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted" aria-hidden />
        <Input id={id} aria-label="Search the catalogue" placeholder="Search the catalogue: plywood, laminate, hinge…" className="pl-9"
               autoComplete="off" value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      {open && (
        <ul aria-label="Catalogue results" className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface text-sm">
          {results.length === 0 ? (
            <li className="px-3 py-2 text-muted">{settled ? "Nothing in your catalogue matches. Add a custom line instead." : "Searching…"}</li>
          ) : results.map((m) => (
            <li key={m.id}>
              <button type="button" className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left hover:bg-pine-soft"
                      onClick={() => { onPick(m); setText(""); }}>
                <span className="min-w-0">
                  <span className="font-medium">{m.name}</span>
                  <span className="text-muted">{[m.specification, m.brand].filter(Boolean).map((x) => ` · ${x}`).join("")}</span>
                </span>
                <span className="shrink-0 tabular-nums text-muted">
                  {isZeroAmount(m.cost_rate) ? "rate not set" : `${formatINR(m.cost_rate)} / ${m.unit}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
