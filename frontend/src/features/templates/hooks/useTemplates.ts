import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { templatesApi } from "../services/templatesApi";
import type { TemplatePayload } from "../types";

const KEY = ["furniture-templates"] as const;

export const useTemplates = () => useQuery({ queryKey: KEY, queryFn: templatesApi.list });

function useInvalidating<TArgs, TResult>(fn: (a: TArgs) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: KEY }) });
}

export const useCreateTemplate = () => useInvalidating((p: TemplatePayload) => templatesApi.create(p));
export const useUpdateTemplate = () => useInvalidating((a: { id: string; payload: TemplatePayload }) => templatesApi.update(a.id, a.payload));
export const useDeleteTemplate = () => useInvalidating((id: string) => templatesApi.remove(id));
