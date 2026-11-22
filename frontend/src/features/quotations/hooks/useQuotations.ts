import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { quotationsApi } from "../services/quotationsApi";
import type { Quotation, QuotationFilters, QuotationPayload } from "../types";

export const LIST_KEY = ["quotations"] as const;
export const quotationKey = (id: string) => ["quotation", id] as const;

export const useQuotations = (filters: QuotationFilters) =>
  useQuery({ queryKey: [...LIST_KEY, filters], queryFn: () => quotationsApi.list(filters), placeholderData: keepPreviousData });

export const useQuotation = (id: string | undefined) =>
  useQuery({ queryKey: quotationKey(id ?? ""), queryFn: () => quotationsApi.get(id!), enabled: !!id });

/** Defaults only matter for a brand-new quotation, and are fetched fresh each time (dates change daily). */
export const useQuotationDefaults = (enabled: boolean) =>
  useQuery({ queryKey: ["quotation-defaults"], queryFn: quotationsApi.defaults, enabled, staleTime: 0, gcTime: 0 });

type SaveArgs = { id?: string; rowVersion?: number; payload: QuotationPayload };

export function useSaveQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rowVersion, payload }: SaveArgs): Promise<Quotation> =>
      id && rowVersion !== undefined ? quotationsApi.update(id, rowVersion, payload) : quotationsApi.create(payload),
    onSuccess: (saved) => {
      qc.setQueryData(quotationKey(saved.id), saved);   // the page re-renders from this, no refetch flicker
      qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useDeleteQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: quotationsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}
