import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  itemIsComplete, settingsAreComplete, toItemPayload, toSettingsPayload, type ItemFormValues, type SettingsFields,
} from "../schemas/quotationSchema";
import { quotationsApi } from "../services/quotationsApi";
import type { ItemPayload, ItemResult, SettingsData, Totals } from "../types";

export const ZERO_TOTALS: Totals = {
  subtotal: "0.00", additional_charges: "0.00", discount: "0.00", taxable_amount: "0.00", tax_amount: "0.00",
  rounding_adjustment: "0.00", grand_total: "0.00", material_cost: "0.00", profit: "0.00",
};

const NO_SETTINGS: SettingsFields = {
  charge_labour: "", charge_transportation: "", charge_installation: "", charge_miscellaneous: "", discount_type: "none",
  discount_value: "", gst_enabled: false, gst_rate_percent: "", prices_include_tax: false, round_to_rupee: false,
};

export type LivePreview = {
  /** Backend-calculated result per form item (aligned to the form's item order); null until available. */
  itemResults: (ItemResult | null)[];
  /** Latest backend totals (may be a moment old while a newer request is in flight). */
  totals: Totals | null;
  /** True while the shown numbers are older than the form. */
  stale: boolean;
  /** Items left out of the totals because they are incomplete. */
  incomplete: number;
  /** Charges, discount or GST are filled in wrongly, so they are not yet in the totals. */
  settingsIncomplete: boolean;
};

/**
 * Live totals for the builder. Every figure comes from the backend's calculation engine through a
 * stateless endpoint, so the browser never re-implements pricing and cannot drift from what is saved.
 * An item is sent only once it passes the same validation the save does.
 */
export function useLivePreview(items: ItemFormValues[], settings: SettingsFields): LivePreview {
  const indexes: number[] = [];
  const payload: ItemPayload[] = [];
  items.forEach((item, index) => {
    if (itemIsComplete(item)) {
      indexes.push(index);
      payload.push(toItemPayload({ ...item, id: undefined, materials: item.materials.map((l) => ({ ...l, id: undefined })) }));
    }
  });

  const settingsOk = settingsAreComplete(settings);
  const settingsPayload: SettingsData = toSettingsPayload(settingsOk ? settings : NO_SETTINGS);
  const hasCharges = settingsOk && [settings.charge_labour, settings.charge_transportation, settings.charge_installation, settings.charge_miscellaneous].some((v) => v.trim() !== "");
  const needsServer = payload.length > 0 || hasCharges;

  const key = JSON.stringify({ items: payload, settings: settingsPayload });
  const debounced = useDebouncedValue(key, 350);
  const query = useQuery({
    queryKey: ["preview", debounced],
    queryFn: () => {
      const parsed = JSON.parse(debounced) as { items: ItemPayload[]; settings: SettingsData };
      return quotationsApi.preview(parsed.items, parsed.settings);
    },
    enabled: needsServer,
    placeholderData: keepPreviousData,
    staleTime: Infinity,
  });

  const settled = debounced === key && !query.isPlaceholderData && !!query.data;
  const itemResults: (ItemResult | null)[] = items.map(() => null);
  if (settled && query.data) indexes.forEach((formIndex, n) => { itemResults[formIndex] = query.data!.items[n] ?? null; });

  return {
    itemResults,
    totals: needsServer ? (query.data?.totals ?? null) : ZERO_TOTALS,
    stale: needsServer && (debounced !== key || query.isFetching),
    incomplete: items.length - payload.length,
    settingsIncomplete: !settingsOk,
  };
}
