// Top-level /observability page with Health, Logs, Alerts and Dashboards tabs.

import { useState } from "react";
import { Link } from "react-router-dom";
import { PageLayout } from "@internal/shared-ui";
import { useTranslation } from "@internal/i18n";
import { ServiceHealthPanel } from "./ServiceHealthPanel";
import { EntityLogsPanel } from "./EntityLogsPanel";
import { GrafanaAlertsPanel } from "./GrafanaAlertsPanel";
import { GrafanaDashboardEmbed } from "./GrafanaDashboardEmbed";

type Tab = "health" | "logs" | "alerts" | "dashboards";

export function ObservabilityPage() {
  const { t } = useTranslation("observability");
  const [tab, setTab] = useState<Tab>("health");
  const [entityId, setEntityId] = useState("");
  const [dashboardUid, setDashboardUid] = useState("");
  const [panelId, setPanelId] = useState("1");

  const TABS: Array<{ key: Tab; label: string }> = [
    { key: "health", label: t("tabs.health") },
    { key: "logs", label: t("tabs.logs") },
    { key: "alerts", label: t("tabs.alerts") },
    { key: "dashboards", label: t("tabs.dashboards") },
  ];

  return (
    <PageLayout
      title={t("page.title")}
      description={t("page.description")}
      actions={
        <Link
          to="/observability/config"
          className="rounded border border-app-border bg-app-surface px-3 py-1.5 text-sm text-app-text-muted hover:bg-app-surface-hover"
        >
          {t("page.configure")}
        </Link>
      }
    >
      <nav className="mb-4 flex gap-1 border-b border-app-border">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.key}
            type="button"
            onClick={() => setTab(tabItem.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              tab === tabItem.key
                ? "border-app-primary text-app-text"
                : "border-transparent text-app-text-muted hover:text-app-text"
            }`}
          >
            {tabItem.label}
          </button>
        ))}
      </nav>

      {tab === "health" && <ServiceHealthPanel limit={200} />}

      {tab === "alerts" && <GrafanaAlertsPanel limit={50} />}

      {tab === "logs" && (
        <div className="flex flex-col gap-3">
          <EntityIdField
            label={t("fields.entityId")}
            placeholder={t("fields.entityIdPlaceholder")}
            value={entityId}
            onChange={setEntityId}
          />
          {entityId.trim() ? (
            <EntityLogsPanel entityId={entityId.trim()} />
          ) : (
            <p className="text-xs text-app-text-muted">{t("empty.logsHint")}</p>
          )}
        </div>
      )}

      {tab === "dashboards" && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <TextField
              label={t("fields.dashboardUid")}
              value={dashboardUid}
              onChange={setDashboardUid}
            />
            <TextField label={t("fields.panelId")} value={panelId} onChange={setPanelId} />
          </div>
          {dashboardUid && Number(panelId) > 0 ? (
            <GrafanaDashboardEmbed
              dashboardUid={dashboardUid}
              panelId={Number(panelId)}
              title={t("grafanaPanel.embedTitle", { uid: dashboardUid, panelId })}
            />
          ) : (
            <p className="text-xs text-app-text-muted">{t("empty.dashboardHint")}</p>
          )}
        </div>
      )}
    </PageLayout>
  );
}

function EntityIdField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-xs">
      <span className="text-app-text-muted">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 block w-full rounded border border-app-border bg-app-bg px-2 py-1.5 text-sm text-app-text"
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-xs">
      <span className="text-app-text-muted">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded border border-app-border bg-app-bg px-2 py-1.5 text-sm text-app-text"
      />
    </label>
  );
}
