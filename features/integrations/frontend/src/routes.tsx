import type { ComponentType, ReactNode } from "react";
import type { RouteObject } from "react-router-dom";
import { IntegrationsPage } from "./IntegrationsPage";
import { IntegrationManagePage } from "./IntegrationManagePage";

// AdminRoute is the shell's role guard (it reads the current user), injected by the app shell.
export function featureRoutes(ctx: {
  AdminRoute: ComponentType<{ children: ReactNode }>;
}): RouteObject[] {
  const { AdminRoute } = ctx;
  return [
    {
      path: "/integrations",
      element: (
        <AdminRoute>
          <IntegrationsPage />
        </AdminRoute>
      ),
    },
    {
      path: "/integrations/:id",
      element: (
        <AdminRoute>
          <IntegrationManagePage />
        </AdminRoute>
      ),
    },
  ];
}
