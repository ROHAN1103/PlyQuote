import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { materialsApi } from "../services/materialsApi";
import type { MaterialFilters, MaterialPayload } from "../types";

const KEY = ["materials"] as const;

export function useMaterials(filters: MaterialFilters) {
  // keepPreviousData: the table doesn't blank out while a new search/page loads.
  return useQuery({ queryKey: [...KEY, filters], queryFn: () => materialsApi.list(filters), placeholderData: keepPreviousData });
}

function useInvalidating<TArgs, TResult>(fn: (a: TArgs) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: KEY }) });
}

export const useCreateMaterial = () => useInvalidating((p: MaterialPayload) => materialsApi.create(p));
export const useUpdateMaterial = () =>
  useInvalidating((a: { id: string; payload: MaterialPayload }) => materialsApi.update(a.id, a.payload));
export const useDeactivateMaterial = () => useInvalidating((id: string) => materialsApi.deactivate(id));
