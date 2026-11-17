import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";
import { ME_KEY } from "@/features/auth/hooks/useAuth";
import { setUnauthorizedHandler } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    // If the session expires mid-use, mark the user signed out; RequireAuth redirects to /login.
    setUnauthorizedHandler(() => queryClient.setQueryData(ME_KEY, null));
    return () => setUnauthorizedHandler(null);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}
