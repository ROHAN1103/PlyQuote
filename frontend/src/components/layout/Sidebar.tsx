import { FileText, Layers, LayoutDashboard, LayoutTemplate, Settings, X } from "lucide-react";
import { NavLink } from "react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";

export const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/quotations", label: "Quotations", icon: FileText, end: false },
  { to: "/materials", label: "Materials", icon: Layers, end: false },
  { to: "/templates", label: "Furniture templates", icon: LayoutTemplate, end: false },
  { to: "/settings", label: "Settings", icon: Settings, end: false },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5 px-3">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-md border-l-[3px] px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-birch bg-pine-soft text-pine"
                : "border-transparent text-muted hover:bg-pine-soft/60 hover:text-ink",
            )
          }
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export function Sidebar() {
  const { mobileNavOpen, closeMobileNav } = useAppStore();
  return (
    <>
      <aside className="no-print fixed inset-y-0 left-0 hidden w-60 border-r border-line bg-surface py-5 md:block">
        <p className="px-6 pb-6 font-display text-lg font-semibold tracking-tight text-pine">Quotation Builder</p>
        <NavList />
      </aside>

      {mobileNavOpen && (
        <div className="no-print fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button className="absolute inset-0 bg-ink/40" aria-label="Close navigation" onClick={closeMobileNav} />
          <aside className="relative h-full w-64 bg-surface py-5 shadow-xl">
            <div className="flex items-center justify-between px-6 pb-6">
              <p className="font-display text-lg font-semibold tracking-tight text-pine">Quotation Builder</p>
              <Button variant="ghost" size="icon" onClick={closeMobileNav} aria-label="Close navigation">
                <X />
              </Button>
            </div>
            <NavList onNavigate={closeMobileNav} />
          </aside>
        </div>
      )}
    </>
  );
}
