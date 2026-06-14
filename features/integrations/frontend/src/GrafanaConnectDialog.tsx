// Two-stage Grafana connect dialog: probe for datasources, then commit and show the one-time webhook secret.

import { useState } from "react";
import { useApi } from "@internal/api-client/react";
import { useTranslation } from "@internal/i18n";
import { DatasourceSelect, pickDefaultUid, type DatasourceCandidate } from "./DatasourceSelect";

export interface GrafanaConnectDialogProps {
  open: boolean;
  onClose: () => void;
  onConnected: () => void;
}

interface ProbeResult {
  datasources: {
    prometheus: DatasourceCandidate[];
    loki: DatasourceCandidate[];
    tempo: DatasourceCandidate[];
  };
  imageRendererAvailable: boolean;
}

interface ConnectResult {
  integrationId: string;
  webhookUrl: string;
  webhookSecret: string;
  imageRendererAvailable: boolean;
  dsUid: { prometheus: string; loki?: string; tempo?: string };
}

export function GrafanaConnectDialog({ open, onClose, onConnected }: GrafanaConnectDialogProps) {
  const api = useApi();
  const { t } = useTranslation("integrations");
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [suppressionMinutes, setSuppressionMinutes] = useState<string>("60");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [probe, setProbe] = useState<ProbeResult | null>(null);
  const [promUid, setPromUid] = useState("");
  const [lokiUid, setLokiUid] = useState("");
  const [tempoUid, setTempoUid] = useState("");

  const [result, setResult] = useState<ConnectResult | null>(null);

  if (!open) return null;

  async function handleProbe(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.integrations.probeGrafana({
        baseUrl: baseUrl.trim(),
        apiToken: apiToken.trim(),
      });
      setProbe(res);
      setPromUid(pickDefaultUid(res.datasources.prometheus));
      setLokiUid(pickDefaultUid(res.datasources.loki));
      setTempoUid(pickDefaultUid(res.datasources.tempo));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.probeFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleCommit() {
    setBusy(true);
    setError(null);
    try {
      const minutes = Number(suppressionMinutes);
      const suppressionMs =
        Number.isFinite(minutes) && minutes >= 0 ? Math.floor(minutes * 60_000) : undefined;
      const res = await api.integrations.connectGrafana({
        name: name.trim() || `Grafana (${new URL(baseUrl.trim()).host})`,
        baseUrl: baseUrl.trim(),
        apiToken: apiToken.trim(),
        dsUid: {
          prometheus: promUid,
          ...(lokiUid ? { loki: lokiUid } : {}),
          ...(tempoUid ? { tempo: tempoUid } : {}),
        },
        ...(suppressionMs !== undefined ? { alertRefireSuppressionMs: suppressionMs } : {}),
      });
      setResult({
        integrationId: res.integration.id,
        webhookUrl: res.webhookUrl,
        webhookSecret: res.webhookSecret,
        imageRendererAvailable: res.imageRendererAvailable,
        dsUid: res.dsUid,
      });
      onConnected();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.connectFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg border border-app-border bg-app-surface p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {!probe && !result && (
          <form onSubmit={handleProbe} className="space-y-3">
            <h3 className="text-sm font-semibold text-app-text">
              {t("grafanaConnect.stepCredentialsTitle")}
            </h3>
            <p className="text-xs text-app-text-muted">
              {t("grafanaConnect.stepCredentialsDescription")}
            </p>
            <Field
              label={t("grafanaConnect.fieldDisplayName")}
              value={name}
              onChange={setName}
              placeholder={t("grafanaConnect.fieldDisplayNamePlaceholder")}
            />
            <Field
              label={t("grafanaConnect.fieldBaseUrl")}
              value={baseUrl}
              onChange={setBaseUrl}
              placeholder={t("grafanaConnect.fieldBaseUrlPlaceholder")}
            />
            <Field
              label={t("grafanaConnect.fieldServiceAccountToken")}
              value={apiToken}
              onChange={setApiToken}
              placeholder={t("grafanaConnect.fieldServiceAccountTokenPlaceholder")}
              type="password"
            />
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              className="text-xs text-app-text-muted underline-offset-2 hover:underline"
            >
              {advancedOpen ? t("grafanaConnect.advancedHide") : t("grafanaConnect.advancedShow")}
            </button>
            {advancedOpen && (
              <Field
                label={t("grafanaConnect.fieldSuppressionWindow")}
                value={suppressionMinutes}
                onChange={setSuppressionMinutes}
                placeholder="60"
              />
            )}
            {error && <p className="text-xs text-app-danger">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded px-3 py-1.5 text-sm text-app-text-muted hover:bg-app-surface-hover"
              >
                {t("grafanaConnect.cancel")}
              </button>
              <button
                type="submit"
                disabled={busy || !baseUrl.trim() || !apiToken.trim()}
                className="rounded bg-app-primary px-3 py-1.5 text-sm font-medium text- disabled:opacity-50"
              >
                {busy ? t("grafanaConnect.probing") : t("grafanaConnect.connectButton")}
              </button>
            </div>
          </form>
        )}

        {probe && !result && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-app-text">
              {t("grafanaConnect.stepDatasourcesTitle")}
            </h3>
            <p className="text-xs text-app-text-muted">
              {t("grafanaConnect.stepDatasourcesDescription")}
            </p>
            <DatasourceSelect
              label={t("grafanaConnect.dsPrometheus")}
              value={promUid}
              onChange={setPromUid}
              candidates={probe.datasources.prometheus}
              required
            />
            <DatasourceSelect
              label={t("grafanaConnect.dsLoki")}
              value={lokiUid}
              onChange={setLokiUid}
              candidates={probe.datasources.loki}
            />
            <DatasourceSelect
              label={t("grafanaConnect.dsTempo")}
              value={tempoUid}
              onChange={setTempoUid}
              candidates={probe.datasources.tempo}
            />
            {!probe.imageRendererAvailable && (
              <p className="rounded border border-app-border bg-app-bg p-2 text-xs text-app-text-muted">
                {t("grafanaConnect.noImageRenderer")}
              </p>
            )}
            {error && <p className="text-xs text-app-danger">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProbe(null)}
                className="rounded px-3 py-1.5 text-sm text-app-text-muted hover:bg-app-surface-hover"
              >
                {t("grafanaConnect.back")}
              </button>
              <button
                type="button"
                onClick={handleCommit}
                disabled={busy || !promUid}
                className="rounded bg-app-primary px-3 py-1.5 text-sm font-medium text- disabled:opacity-50"
              >
                {busy ? t("grafanaConnect.saving") : t("grafanaConnect.saveIntegration")}
              </button>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-app-text">
              {t("grafanaConnect.stepConnectedTitle")}
            </h3>
            <p className="text-xs text-app-text-muted">
              {t("grafanaConnect.stepConnectedDescription")}
            </p>
            <ol className="space-y-2 text-xs text-app-text-muted">
              <li>
                <span className="font-medium text-app-text">1.</span>{" "}
                {t("grafanaConnect.webhookStep1")}
                <code className="mt-1 block break-all rounded bg-app-bg p-2 text-app-text">
                  {result.webhookUrl}
                </code>
              </li>
              <li>
                <span className="font-medium text-app-text">2.</span>{" "}
                {t("grafanaConnect.webhookStep2")}
                <code className="mt-1 block break-all rounded bg-app-bg p-2 text-app-text">
                  Authorization: Bearer {result.webhookSecret}
                </code>
              </li>
              <li>
                <span className="font-medium text-app-text">3.</span>{" "}
                {t("grafanaConnect.webhookStep3")}
              </li>
            </ol>
            {!result.imageRendererAvailable && (
              <p className="rounded border border-app-border bg-app-bg p-2 text-xs text-app-text-muted">
                {t("grafanaConnect.noImageRendererConnected")}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded bg-app-primary px-3 py-1.5 text-sm font-medium text-"
              >
                {t("grafanaConnect.done")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "password";
}) {
  return (
    <label className="block text-xs">
      <span className="text-app-text-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 block w-full rounded border border-app-border bg-app-bg px-2 py-1.5 text-sm text-app-text"
      />
    </label>
  );
}
