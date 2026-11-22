import { createBrowserRouter, createMemoryRouter, Navigate } from "react-router";
import type { RouteObject } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import LoginPage from "@/features/auth/pages/LoginPage";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import DashboardPage from "@/features/dashboard/pages/DashboardPage";
import MaterialsPage from "@/features/materials/pages/MaterialsPage";
import QuotationsPage from "@/features/quotations/pages/QuotationsPage";
import SettingsPage from "@/features/settings/pages/SettingsPage";
import TemplatesPage from "@/features/templates/TemplatesPage";

export const routes: RouteObject[] = [
  { path: "/login", element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <DashboardPage /> },
          { path: "/quotations", element: <QuotationsPage /> },
          { path: "/materials", element: <MaterialsPage /> },
          { path: "/templates", element: <TemplatesPage /> },
          { path: "/settings", element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
];

export const createRouter = () => createBrowserRouter(routes);
export const createTestRouter = (initialEntries: string[]) => createMemoryRouter(routes, { initialEntries });
