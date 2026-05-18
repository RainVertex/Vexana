// Renders a single Grafana panel as a PNG sourced from our backend's
// dashboard-image proxy. The SA token stays server-side — the browser only
// sees the proxy URL. Falls back to a placeholder if the renderer plugin is
// missing (backend returns 404).

import { useApi } from "@internal/api-client/react";

export interface GrafanaDashboardEmbedProps {
  dashboardUid: string;
  panelId: number;
  from?: string;
  to?: string;
  width?: number;
  height?: number;
  title?: string;
  /**
   * Required for non-admin callers — the backend gates dashboard rendering
   * on the user being a member of an owning team of an entity that has this
   * dashboardUid pinned. Admins can render any UID; for them this is optional.
   */
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
  const api = useApi();
  const src = api.observability.dashboardImageUrl({
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
        alt={title ?? `Grafana panel ${dashboardUid}/${panelId}`}
        width={width}
        height={height}
        loading="lazy"
        className="block w-full"
      />
      {title && <figcaption className="px-2 py-1 text-xs text-app-text-muted">{title}</figcaption>}
    </figure>
  );
}
