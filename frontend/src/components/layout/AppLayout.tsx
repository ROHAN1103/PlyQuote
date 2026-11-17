import { Outlet } from "react-router";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  return (
    <div className="min-h-dvh">
      <Sidebar />
      <div className="md:pl-60">
        <Header />
        <main className="px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
