export const en = {
  page: {
    title: "Observability",
    description: "Service health, logs, Grafana alerts, and dashboard embeds.",
    configure: "Configure",
    configTitle: "Observability configuration",
    configDescription:
      "Per-entity PromQL / LogQL / dashboard wiring. Empty fields fall back to the default defaults shown as placeholder.",
  },
  tabs: {
    health: "Health",
    logs: "Logs",
    alerts: "Alerts",
    dashboards: "Dashboards",
  },
  fields: {
    entityId: "Entity id",
    entityIdPlaceholder: "catalog entity id",
    dashboardUid: "Dashboard UID",
    panelId: "Panel ID",
    grafanaIntegration: "Grafana integration",
    upQuery: "upQuery",
    latencyQuery: "latencyQuery",
    errorQuery: "errorQuery",
    logsSelector: "logsSelector",
    dashboardUidField: "dashboardUid",
    traceIdRegex: "traceIdRegex (optional override)",
    dashboardUidPlaceholder: "grafana dashboard UID",
    traceIdRegexPlaceholder: "leave empty to use defaults",
  },
  status: {
    saved: "saved",
    saving: "saving…",
    error: "error",
    unsaved: "unsaved",
  },
  actions: {
    save: "Save",
    saving: "Saving…",
    refresh: "Refresh",
  },
  empty: {
    logsHint: "Enter an entity id to load its Loki stream.",
    dashboardHint:
      "Provide a dashboard UID and panel id to render. Requires the Grafana Image Renderer plugin.",
    noSamples: "No samples yet. Wire up a Grafana integration to populate.",
    noAlerts: "No recent Grafana alerts.",
    noLogs: "No log lines in this window.",
    noGrafanaIntegration: "No enabled Grafana integration. Connect one from {{- link}} first.",
    noGrafanaIntegrationLinkText: "Integrations",
  },
  errors: {
    loading: "Loading…",
    failedSamples: "Failed to load samples",
    failedAlerts: "Failed to load alerts",
    failedLogs: "Failed to load logs",
    failedTrace: "Failed to load trace",
    failedLoad: "Failed to load",
    saveFailed: "Save failed",
    pickIntegration: "Pick a Grafana integration first",
  },
  trace: {
    title: "Trace",
    close: "Close",
    openTrace: "Open trace",
  },
  alerts: {
    unnamedAlert: "(unnamed alert)",
    openInGrafana: "open in Grafana",
    firing: "firing",
    resolved: "resolved",
  },
  health: {
    errorRate: "err {{rate}}%",
    latency: "{{ms}}ms",
    status: {
      healthy: "healthy",
      degraded: "degraded",
      down: "down",
    },
  },
  grafanaPanel: {
    altFallback: "Grafana panel {{uid}}/{{panelId}}",
    embedTitle: "{{uid}} / panel {{panelId}}",
  },
  logs: {
    traceLabel: "trace",
  },
};

export type ObservabilityResources = typeof en;
