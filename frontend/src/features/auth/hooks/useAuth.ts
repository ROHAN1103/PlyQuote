import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { resetCsrfToken } from "@/lib/api";
import { authApi } from "../services/authApi";

export const ME_KEY = ["auth", "me"] as const;

export function useCurrentUser() {
  return useQuery({ queryKey: ME_KEY, queryFn: authApi.me, staleTime: 5 * 60_000, retry: false });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (user) => qc.setQueryData(ME_KEY, user),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      // Drop every cached business record so the next user never sees stale data.
      qc.clear();
      qc.setQueryData(ME_KEY, null);
      resetCsrfToken();
    },
  });
}
