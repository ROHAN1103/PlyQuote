import { Navigate, Outlet, useLocation } from "react-router";
import { FullPageSpinner } from "@/components/feedback/Spinner";
import { useCurrentUser } from "../hooks/useAuth";

/** Route guard: signed-out visitors are sent to /login and returned afterwards. */
export function RequireAuth() {
  const { data: user, isPending } = useCurrentUser();
  const location = useLocation();

  if (isPending) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}
