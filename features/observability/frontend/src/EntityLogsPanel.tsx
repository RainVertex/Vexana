// Panel of recent Loki log lines for an entity; lines with a trace ID open a Tempo trace drawer.

import { useEffect, useState } from "react";
import type { LokiLogLine } from "@feature/observability-shared";
import { useTranslation } from "@internal/i18n";
import { TraceDrawer } from "./TraceDrawer";
import { useObservabilityApi } from "./client";

export interface EntityLogsPanelProps {
  entityId: string;
  minutes?: number;
  limit?: number;
}

const TIME_WINDOWS: Array<{ minutes: number; label: string }> = [
  { minutes: 15, label: "15m" },
  { minutes: 60, label: "1h" },
  { minutes: 360, label: "6h" },
  { minutes: 1440, label: "24h" },
];

export function EntityLogsPanel({
  entityId,
  minutes: initialMinutes,
  limit,
}: EntityLogsPanelProps) {
  const api = useObservabilityApi();
  const { t } = useTranslation("observability");
  const [minutes, setMinutes] = useState(initialMinutes ?? 15);
  const [items, setItems] = useState<LokiLogLine[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openTrace, setOpenTrace] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setError(null);
    api
      .logs(entityId, { minutes, limit })
      .then((res) => {
        if (!cancelled) setItems(res.items);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : t("errors.failedLogs"));
      });
    return () => {
      cancelled = true;
    };
  }, [api, entityId, minutes, limit, reloadKey, t]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {TIME_WINDOWS.map((w) => (
            <button
              key={w.minutes}
              type="button"
              onClick={() => setMinutes(w.minutes)}
              className={`rounded px-2 py-1 text-xs ${
                minutes === w.minutes
                  ? "bg-app-primary text-app-primary-foreground"
                  : "bg-app-surface text-app-text-muted hover:bg-app-surface-hover"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="rounded px-2 py-1 text-xs text-app-text-muted hover:bg-app-surface-hover"
        >
          {t("actions.refresh")}
        </button>
      </div>

      {error && <p className="text-xs text-app-danger">{error}</p>}
      {!error && items === null && (
        <p className="text-xs text-app-text-muted">{t("errors.loading")}</p>
      )}
      {items && items.length === 0 && (
        <p className="text-xs text-app-text-muted">{t("empty.noLogs")}</p>
      )}
      {items && items.length > 0 && (
        <ul className="max-h-[60vh] overflow-y-auto rounded border border-app-border bg-app-bg font-mono text-xs">
          {items.map((line, idx) => (
            <LogRow
              key={idx}
              line={line}
              onTraceClick={setOpenTrace}
              openTraceLabel={t("trace.openTrace")}
              traceButtonLabel={t("logs.traceLabel")}
            />
          ))}
        </ul>
      )}

      {openTrace && (
        <TraceDrawer traceId={openTrace} entityId={entityId} onClose={() => setOpenTrace(null)} />
      )}
    </div>
  );
}

function LogRow({
  line,
  onTraceClick,
  openTraceLabel,
  traceButtonLabel,
}: {
  line: LokiLogLine;
  onTraceClick: (traceId: string) => void;
  openTraceLabel: string;
  traceButtonLabel: string;
}) {
  const ts = new Date(line.ts).toLocaleTimeString();
  return (
    <li className="flex gap-2 border-b border-app-border px-2 py-1 last:border-b-0">
      <span className="shrink-0 text-app-text-muted">{ts}</span>
      <span className="grow whitespace-pre-wrap break-words text-app-text">{line.line}</span>
      {line.traceId && (
        <button
          type="button"
          onClick={() => onTraceClick(line.traceId as string)}
          className="shrink-0 rounded bg-app-surface px-1.5 text-app-primary hover:bg-app-surface-hover"
          title={openTraceLabel}
        >
          {traceButtonLabel}
        </button>
      )}
    </li>
  );
}
