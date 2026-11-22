import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ME_KEY } from "@/features/auth/hooks/useAuth";
import type { CurrentUser } from "@/features/auth/types";
import { settingsApi } from "../services/settingsApi";
import type { Company } from "../types";

export const COMPANY_KEY = ["company"] as const;

export const useCompany = () => useQuery({ queryKey: COMPANY_KEY, queryFn: settingsApi.get });

/** Every company mutation returns the fresh company: cache it, and keep the header's company name in sync. */
function useCompanyMutation<TArgs>(fn: (a: TArgs) => Promise<Company>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (company) => {
      qc.setQueryData(COMPANY_KEY, company);
      qc.setQueryData<CurrentUser | null>(ME_KEY, (u) => (u ? { ...u, company: { ...u.company, name: company.name } } : u));
    },
  });
}

export const useUpdateCompany = () => useCompanyMutation(settingsApi.update);
export const useUploadLogo = () => useCompanyMutation(settingsApi.uploadLogo);
export const useDeleteLogo = () => useCompanyMutation(settingsApi.deleteLogo);
