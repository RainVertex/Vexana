import type { ReactNode } from "react";
import { useRoutes, type RouteObject } from "react-router-dom";
import { Trans, useTranslation } from "@internal/i18n";
import { useCurrentUser } from "./auth";
import { HomePage } from "./pages/HomePage";
import { DashboardPage } from "./pages/DashboardPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ThemeAuditPage } from "./pages/ThemeAudit";
import { AdminUsersPage } from "./admin/AdminUsersPage";
import { AdminAiModelsPage } from "./admin/AdminAiModelsPage";
import { AuditPage } from "./admin/AuditPage";
import { JobsPage } from "./admin/JobsPage";
import { McpTokensPage } from "./admin/McpTokensPage";
import { ChatRoute } from "./widgets/chat/ChatRoute";
import avatarPresets from "virtual:agent-avatar-presets";
import { buildFeatureRoutes } from "./featureRoutes";

function AdminRoute({ children }: { children: ReactNode }) {
  const me = useCurrentUser();
  const { t } = useTranslation();
  if (me.role !== "admin") {
    return (
      <div className="p-8">
        <h1 className="mb-2 text-xl font-semibold text-app-text">{t("forbidden.title")}</h1>
        <p className="text-sm text-app-text-muted">
          <Trans i18nKey="forbidden.body" components={{ strong: <strong /> }} />
        </p>
      </div>
    );
  }
  return <>{children}</>;
}

export function AppRoutes() {
  const shellRoutes: RouteObject[] = [
    { path: "/", element: <HomePage /> },
    { path: "/chat/:conversationId?", element: <ChatRoute /> },
    { path: "/p/:pageId", element: <DashboardPage /> },
    { path: "/settings", element: <SettingsPage /> },
    { path: "/admin/users", element: <AdminUsersPage /> },
    { path: "/admin/ai-models", element: <AdminAiModelsPage /> },
    { path: "/admin/audit", element: <AuditPage /> },
    { path: "/admin/jobs", element: <JobsPage /> },
    { path: "/admin/mcp-tokens", element: <McpTokensPage /> },
  ];
  if (import.meta.env.DEV) {
    shellRoutes.push({ path: "/theme-audit", element: <ThemeAuditPage /> });
  }
  return useRoutes([...shellRoutes, ...buildFeatureRoutes({ avatarPresets, AdminRoute })]);
}
