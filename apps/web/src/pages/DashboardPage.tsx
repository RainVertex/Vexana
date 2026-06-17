// Renders a dashboard page (/p/:id) and its editable widget grid.
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  PageLayout,
  WidgetEditToolbar,
  WidgetGrid,
  useRemoteGridLayout,
} from "@internal/shared-ui";
import { usePagesApi } from "@feature/pages-frontend";
import { useTranslation } from "@internal/i18n";
import type { PageDto, PageWidgetInstance } from "@feature/pages-shared";
import { useCurrentUser } from "../auth";
import { useSidebar } from "../components/sidebar/SidebarContext";
import { useLocalizedWidgets } from "../widgets";
import { DASHBOARD_WIDGETS, type DashboardWidgetId } from "../widgets/dashboardRegistry";

type LoadState =
  | { kind: "loading" }
  | { kind: "loaded"; page: PageDto }
  | { kind: "error"; status: number };

export function DashboardPage() {
  const { pageId } = useParams<{ pageId: string }>();
  const api = usePagesApi();
  const me = useCurrentUser();
  const { t } = useTranslation();
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    if (!pageId) return;
    let cancelled = false;
    setState({ kind: "loading" });
    api
      .get(pageId)
      .then((page) => {
        if (!cancelled) setState({ kind: "loaded", page });
      })
      .catch((err: { status?: number } | Error) => {
        if (cancelled) return;
        const status = "status" in err && typeof err.status === "number" ? err.status : 500;
        setState({ kind: "error", status });
      });
    return () => {
      cancelled = true;
    };
  }, [api, pageId]);

  if (state.kind === "loading") {
    return (
      <PageLayout title={t("common.loading")}>
        <div className="text-sm text-app-text-muted">{t("dashboard.loadingBody")}</div>
      </PageLayout>
    );
  }
  if (state.kind === "error") {
    return (
      <PageLayout title={t("dashboard.notFoundTitle")}>
        <div className="text-sm text-app-text-muted">{t("dashboard.notFoundBody")}</div>
      </PageLayout>
    );
  }

  return <DashboardView page={state.page} currentUserRole={me.role} currentUserId={me.id} />;
}

function DashboardView({
  page,
  currentUserId,
  currentUserRole,
}: {
  page: PageDto;
  currentUserId: string;
  currentUserRole: string;
}) {
  const api = usePagesApi();
  const { t } = useTranslation();
  const { registry, dashboardList } = useLocalizedWidgets();
  const { setRouteSection } = useSidebar();

  // Without this, deep-links to /p/:id would land with the default tree (or none).
  useEffect(() => {
    setRouteSection(page.section);
    return () => setRouteSection(null);
  }, [page.section, setRouteSection]);

  const canEdit =
    page.scope === "SHARED" ? currentUserRole === "admin" : page.ownerUserId === currentUserId;

  // Stable reference required, else useRemoteGridLayout resets edit mode every render and Customize appears broken.
  const initialWidgets = useMemo(
    () =>
      (page.layout ?? []).filter((w) =>
        Boolean(DASHBOARD_WIDGETS[w.widgetId as DashboardWidgetId]),
      ) as Array<PageWidgetInstance & { widgetId: DashboardWidgetId }>,
    [page.layout],
  );

  const layout = useRemoteGridLayout<DashboardWidgetId>({
    initialWidgets,
    registry: DASHBOARD_WIDGETS,
    readOnly: !canEdit,
    onSave: async (widgets) => {
      await api.updateLayout(page.id, widgets);
    },
  });

  return (
    <PageLayout
      title={page.title}
      description={page.scope === "SHARED" ? t("dashboard.sharedDescription") : undefined}
      actions={
        canEdit ? (
          <WidgetEditToolbar layout={layout} availableWidgets={dashboardList} hideReset />
        ) : null
      }
    >
      <WidgetGrid
        widgets={layout.widgets}
        editMode={layout.editMode}
        registry={registry}
        onLayoutChange={layout.updateLayout}
        onRemove={layout.removeWidget}
        onConfigChange={layout.updateWidgetConfig}
        emptyState={{
          title: t("dashboard.emptyTitle"),
          hint: canEdit ? t("dashboard.emptyHintEdit") : t("dashboard.emptyHintReadonly"),
        }}
      />
    </PageLayout>
  );
}
