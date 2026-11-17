import { LogOut, Menu } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCurrentUser, useLogout } from "@/features/auth/hooks/useAuth";
import { useAppStore } from "@/store/appStore";

export function Header() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();
  const openMobileNav = useAppStore((s) => s.openMobileNav);

  const signOut = () =>
    logout.mutate(undefined, {
      onSettled: () => navigate("/login", { replace: true }),
      onError: () => toast.error("Couldn't reach the server, but you've been signed out on this device."),
    });

  return (
    <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur md:px-8">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={openMobileNav} aria-label="Open navigation">
        <Menu />
      </Button>
      <p className="truncate font-medium">{user?.company.name}</p>
      <div className="ml-auto flex items-center gap-2">
        <span className="hidden text-sm text-muted sm:inline">{user?.username}</span>
        <Button variant="outline" size="sm" onClick={signOut} disabled={logout.isPending}>
          <LogOut /> Sign out
        </Button>
      </div>
    </header>
  );
}
