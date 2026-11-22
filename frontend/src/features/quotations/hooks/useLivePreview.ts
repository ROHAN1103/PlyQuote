import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { isPreviewable, toItemPayload, type ItemFormValues } from "../schemas/quotationSchema";
import { quotationsApi } from "../services/quotationsApi";
import type { ItemPayload, Totals } from "../types";

export type LivePreview = {
  /** Backend-calculated total per form item (aligned to the form's item order); null when not available yet. */
  itemTotals: (string | null)[];
  /** Latest backend totals (may be from a moment ago while a newer request is in flight). */
  totals: Totals | null;
  /** True while the shown numbers are older than the form. */
  stale: boolean;
  /** Items left out of the totals because they are incomplete. */
  incomplete: number;
};

/**
 * Live totals for the builder. The numbers come from the backend's calculation engine through a
 * stateless endpoint, so the browser never re-implements pricing and cannot drift from what is saved.
 */
export function useLivePreview(items: ItemFormValues[]): LivePreview {
  const indexes: number[] = [];
  const payload: ItemPayload[] = [];
  items.forEach((item, index) => {
    if (isPreviewable(item)) {
      indexes.push(index);
      payload.push(toItemPayload({ ...item, id: undefined }));  // ids are irrelevant to pricing
    }
  });

  const key = JSON.stringify(payload);
  const debounced = useDebouncedValue(key, 350);
  const query = useQuery({
    queryKey: ["preview", debounced],
    queryFn: () => quotationsApi.preview(JSON.parse(debounced) as ItemPayload[]),
    enabled: debounced !== "[]",
    placeholderData: keepPreviousData,
    staleTime: Infinity,
  });

  const settled = debounced === key && !query.isPlaceholderData && !!query.data;
  const itemTotals: (string | null)[] = items.map(() => null);
  if (settled && query.data) indexes.forEach((formIndex, n) => { itemTotals[formIndex] = query.data!.items[n]?.total ?? null; });

  return {
    itemTotals,
    totals: payload.length === 0 && items.length === 0 ? null : (query.data?.totals ?? null),
    stale: debounced !== key || query.isFetching,
    incomplete: items.length - payload.length,
  };
}
