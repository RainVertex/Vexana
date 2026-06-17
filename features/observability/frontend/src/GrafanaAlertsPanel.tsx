// Lists recent Grafana alert notifications from the notifications feed.

import { useEffect, useState } from "react";
import type { NotificationDto } from "@feature/notifications-shared";
import { useNotificationsApi } from "@feature/notifications-frontend";
import { useTranslation } from "@internal/i18n";

export interface GrafanaAlertsPanelProps {
  limit?: number;
}

const GRAFANA_KINDS = new Set(["grafana.alert", "grafana.alert.resolved"]);

interface AlertPayload {
  status?: string;
  alertname?: string;
  summary?: string;
  severity?: string;
  startsAt?: string;
  endsAt?: string;
  generatorURL?: string;
  entity?: string;
  fingerprint?: string;
}

export function GrafanaAlertsPanel({ limit = 25 }: GrafanaAlertsPanelProps) {
  const notifications = useNotificationsApi();
  const { t } = useTranslation("observability");
  const [items, setItems] = useState<NotificationDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setError(null);
    notifications
      .list({ limit: 200 })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items.filter((n) => GRAFANA_KINDS.has(n.kind)).slice(0, limit));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : t("errors.failedAlerts"));
      });
    return () => {
      cancelled = true;
    };
  }, [notifications, limit, t]);

  if (error) return <p className="text-xs text-app-danger">{error}</p>;
  if (items === null) return <p className="text-xs text-app-text-muted">{t("errors.loading")}</p>;
  if (items.length === 0)
    return <p className="text-xs text-app-text-muted">{t("empty.noAlerts")}</p>;

  return (
    <ul className="divide-y divide-app-border">
      {items.map((n) => {
        const payload = (n.payload ?? {}) as AlertPayload;
        const resolved = n.kind === "grafana.alert.resolved";
        return (
          <li key={n.id} className="flex items-start gap-3 py-2 text-xs">
            <span
              className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                resolved
                  ? "bg-app-success/20 text-app-success"
                  : payload.severity === "critical"
                    ? "bg-app-danger/20 text-app-danger"
                    : "bg-app-warning/20 text-app-warning"
              }`}
            >
              {resolved ? t("alerts.resolved") : (payload.severity ?? t("alerts.firing"))}
            </span>
            <div className="flex grow flex-col gap-0.5">
              <span className="font-medium text-app-text">
                {payload.alertname ?? t("alerts.unnamedAlert")}
                {payload.entity && (
                  <span className="ml-1 text-app-text-muted">· {payload.entity}</span>
                )}
              </span>
              {payload.summary && <span className="text-app-text-muted">{payload.summary}</span>}
              <span className="text-app-text-muted">
                {new Date(n.createdAt).toLocaleString()}
                {payload.generatorURL && (
                  <a
                    href={payload.generatorURL}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 underline-offset-2 hover:underline"
                  >
                    {t("alerts.openInGrafana")}
                  </a>
                )}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
