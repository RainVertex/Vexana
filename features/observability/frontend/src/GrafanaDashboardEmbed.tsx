// Renders a single Grafana panel PNG via the backend proxy (keeps the SA token server-side).

import { useTranslation } from "@internal/i18n";
import { useObservabilityApi } from "./client";

export interface GrafanaDashboardEmbedProps {
  dashboardUid: string;
  panelId: number;
  from?: string;
  to?: string;
  width?: number;
  height?: number;
  title?: string;
  // Required for non-admin callers, the backend gates rendering on team membership of an owning entity.
  entityId?: string;
}

export function GrafanaDashboardEmbed({
  dashboardUid,
  panelId,
  from,
  to,
  width = 800,
  height = 400,
  title,
  entityId,
}: GrafanaDashboardEmbedProps) {
  const api = useObservabilityApi();
  const { t } = useTranslation("observability");
  const src = api.dashboardImageUrl({
    dashboardUid,
    panelId,
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    w: width,
    h: height,
    ...(entityId ? { entityId } : {}),
  });
  return (
    <figure className="overflow-hidden rounded border border-app-border bg-app-bg">
      <img
        src={src}
        alt={title ?? t("grafanaPanel.altFallback", { uid: dashboardUid, panelId })}
        width={width}
        height={height}
        loading="lazy"
        className="block w-full"
      />
      {title && <figcaption className="px-2 py-1 text-xs text-app-text-muted">{title}</figcaption>}
    </figure>
  );
}
