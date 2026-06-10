// Post-connect Grafana configure surface: rotate token/webhook secret, edit datasources, edit suppression.

import { useEffect, useState } from "react";
import { useApi } from "@internal/api-client/react";
import { useTranslation } from "@internal/i18n";
import type { IntegrationDetail } from "@internal/shared-types";
import { ConfirmDialog } from "@internal/shared-ui";
import { DatasourceSelect, pickDefaultUid, type DatasourceCandidate } from "./DatasourceSelect";

export interface GrafanaManagePanelProps {
  integration: IntegrationDetail;
  onChanged: () => void;
}

interface ProbeResult {
  datasources: {
    prometheus: DatasourceCandidate[];
    loki: DatasourceCandidate[];
    tempo: DatasourceCandidate[];
  };
  imageRendererAvailable: boolean;
}

export function GrafanaManagePanel({ integration, onChanged }: GrafanaManagePanelProps) {
  const api = useApi();
  const { t } = useTranslation("integrations");
  const [error, setError] = useState<string | null>(null);
  const [rotateTokenOpen, setRotateTokenOpen] = useState(false);
  const [editDsOpen, setEditDsOpen] = useState(false);
  const [confirmRotateWebhook, setConfirmRotateWebhook] = useState(false);
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null);

  // Runtime narrow, the prop type is the full IntegrationDetail union.
  if (integration.kind !== "grafana") return null;
  const cfg = integration.config;

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-app-danger">{error}</p>}

      <Section title={t("grafanaManage.sectionConnection")}>
        <Row label={t("grafanaManage.fieldBaseUrl")} value={cfg.baseUrl} />
        <Row
          label={t("grafanaManage.fieldApiToken")}
          value={
            cfg.hasApiToken ? t("grafanaManage.apiTokenSet") : t("grafanaManage.apiTokenNotSet")
          }
        />
        <div>
          <button
            type="button"
            onClick={() => setRotateTokenOpen(true)}
            className="rounded border border-app-border px-2 py-1 text-xs text-app-text hover:bg-app-surface-hover"
          >
            {t("grafanaManage.rotateApiToken")}
          </button>
        </div>
      </Section>

      <Section title={t("grafanaManage.sectionDatasources")}>
        <Row label={t("grafanaManage.fieldPrometheusUid")} value={cfg.dsUid.prometheus || "—"} />
        <Row
          label={t("grafanaManage.fieldLokiUid")}
          value={cfg.dsUid.loki ?? t("datasource.noneOption")}
        />
        <Row
          label={t("grafanaManage.fieldTempoUid")}
          value={cfg.dsUid.tempo ?? t("datasource.noneOption")}
        />
        <Row
          label={t("grafanaManage.fieldImageRenderer")}
          value={
            cfg.imageRendererAvailable
              ? t("grafanaManage.imageRendererAvailable")
              : t("grafanaManage.imageRendererNotAvailable")
          }
        />
        <div>
          <button
            type="button"
            onClick={() => setEditDsOpen(true)}
            className="rounded border border-app-border px-2 py-1 text-xs text-app-text hover:bg-app-surface-hover"
          >
            {t("grafanaManage.editDatasources")}
          </button>
        </div>
      </Section>

      <SuppressionSection
        integrationId={integration.id}
        initialMs={cfg.alertRefireSuppressionMs}
        onSaved={onChanged}
        onError={setError}
      />

      <Section title={t("grafanaManage.sectionWebhook")}>
        <Row
          label={t("grafanaManage.fieldEndpoint")}
          value={`/integrations/grafana/webhook/${integration.id}`}
        />
        <Row
          label={t("grafanaManage.fieldSecret")}
          value={
            cfg.hasWebhookSecret
              ? t("grafanaManage.webhookSecretSet")
              : t("grafanaManage.webhookSecretNotSet")
          }
        />
        <p className="text-xs text-app-text-muted">{t("grafanaManage.webhookSecretNote")}</p>
        <div>
          <button
            type="button"
            onClick={() => setConfirmRotateWebhook(true)}
            className="rounded border border-app-border px-2 py-1 text-xs text-app-text hover:bg-app-surface-hover"
          >
            {t("grafanaManage.rotateWebhookSecret")}
          </button>
        </div>
      </Section>

      {rotateTokenOpen && (
        <RotateTokenDialog
          integrationId={integration.id}
          onClose={() => setRotateTokenOpen(false)}
          onRotated={() => {
            setRotateTokenOpen(false);
            onChanged();
          }}
        />
      )}

      {editDsOpen && (
        <EditDatasourcesDialog
          integrationId={integration.id}
          currentDsUid={cfg.dsUid}
          onClose={() => setEditDsOpen(false)}
          onSaved={() => {
            setEditDsOpen(false);
            onChanged();
          }}
        />
      )}

      <ConfirmDialog
        open={confirmRotateWebhook}
        title={t("grafanaManage.confirmRotateWebhookTitle")}
        message={t("grafanaManage.confirmRotateWebhookMessage")}
        confirmLabel={t("grafanaManage.confirmRotateLabel")}
        destructive
        onConfirm={async () => {
          setConfirmRotateWebhook(false);
          setError(null);
          try {
            const res = await api.integrations.rotateGrafanaWebhookSecret(integration.id);
            setNewWebhookSecret(res.webhookSecret);
            onChanged();
          } catch (err) {
            setError(err instanceof Error ? err.message : t("errors.rotateFailed"));
          }
        }}
        onClose={() => setConfirmRotateWebhook(false)}
      />

      {newWebhookSecret !== null && (
        <NewWebhookSecretDialog
          integrationId={integration.id}
          webhookSecret={newWebhookSecret}
          onClose={() => setNewWebhookSecret(null)}
        />
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 rounded-md border border-app-border bg-app-surface p-3">
      <h3 className="text-sm font-semibold text-app-text">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-xs">
      <span className="text-app-text-muted">{label}</span>
      <span className="break-all text-right text-app-text">{value}</span>
    </div>
  );
}

function SuppressionSection({
  integrationId,
  initialMs,
  onSaved,
  onError,
}: {
  integrationId: string;
  initialMs: number;
  onSaved: () => void;
  onError: (msg: string | null) => void;
}) {
  const api = useApi();
  const { t } = useTranslation("integrations");
  const [minutes, setMinutes] = useState<string>(() => String(Math.round(initialMs / 60_000)));
  const [busy, setBusy] = useState(false);
  const initialMinutes = Math.round(initialMs / 60_000);
  const parsed = Number(minutes);
  const valid = Number.isFinite(parsed) && parsed >= 0;
  const dirty = valid && parsed !== initialMinutes;

  async function save() {
    setBusy(true);
    onError(null);
    try {
      await api.integrations.updateGrafanaConfig(integrationId, {
        alertRefireSuppressionMs: Math.floor(parsed * 60_000),
      });
      onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : t("errors.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title={t("grafanaManage.sectionSuppression")}>
      <label className="block text-xs">
        <span className="text-app-text-muted">{t("grafanaManage.fieldWindow")}</span>
        <input
          type="text"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          className="mt-1 block w-full rounded border border-app-border bg-app-bg px-2 py-1.5 text-sm text-app-text"
        />
      </label>
      <p className="text-xs text-app-text-muted">{t("grafanaManage.suppressionHint")}</p>
      <div>
        <button
          type="button"
          disabled={!dirty || busy}
          onClick={save}
          className="rounded bg-app-primary px-2.5 py-1 text-xs font-medium text-app-primary-on disabled:opacity-50"
        >
          {busy ? t("grafanaManage.savingSuppression") : t("grafanaManage.saveSuppression")}
        </button>
      </div>
    </Section>
  );
}

function RotateTokenDialog({
  integrationId,
  onClose,
  onRotated,
}: {
  integrationId: string;
  onClose: () => void;
  onRotated: () => void;
}) {
  const api = useApi();
  const { t } = useTranslation("integrations");
  const [apiToken, setApiToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.integrations.rotateGrafanaToken(integrationId, { apiToken: apiToken.trim() });
      onRotated();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.rotateFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <h3 className="text-sm font-semibold text-app-text">
          {t("grafanaManage.rotateTokenTitle")}
        </h3>
        <p className="text-xs text-app-text-muted">{t("grafanaManage.rotateTokenDescription")}</p>
        <label className="block text-xs">
          <span className="text-app-text-muted">
            {t("grafanaManage.fieldNewServiceAccountToken")}
          </span>
          <input
            type="password"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            placeholder="glsa_…"
            className="mt-1 block w-full rounded border border-app-border bg-app-bg px-2 py-1.5 text-sm text-app-text"
          />
        </label>
        {error && <p className="text-xs text-app-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1.5 text-sm text-app-text-muted hover:bg-app-surface-hover"
          >
            {t("grafanaManage.cancel")}
          </button>
          <button
            type="submit"
            disabled={busy || !apiToken.trim()}
            className="rounded bg-app-primary px-3 py-1.5 text-sm font-medium text-app-primary-on disabled:opacity-50"
          >
            {busy ? t("grafanaManage.validating") : t("grafanaManage.rotateButton")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditDatasourcesDialog({
  integrationId,
  currentDsUid,
  onClose,
  onSaved,
}: {
  integrationId: string;
  currentDsUid: { prometheus: string; loki?: string; tempo?: string };
  onClose: () => void;
  onSaved: () => void;
}) {
  const api = useApi();
  const { t } = useTranslation("integrations");
  const [probe, setProbe] = useState<ProbeResult | null>(null);
  const [promUid, setPromUid] = useState(currentDsUid.prometheus);
  const [lokiUid, setLokiUid] = useState(currentDsUid.loki ?? "");
  const [tempoUid, setTempoUid] = useState(currentDsUid.tempo ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    api.integrations
      .reprobeGrafana(integrationId)
      .then((res) => {
        if (cancelled) return;
        setProbe(res);
        if (!currentDsUid.prometheus) setPromUid(pickDefaultUid(res.datasources.prometheus));
        if (!currentDsUid.loki) setLokiUid(pickDefaultUid(res.datasources.loki));
        if (!currentDsUid.tempo) setTempoUid(pickDefaultUid(res.datasources.tempo));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t("errors.probeFailed"));
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
    // Deps are stable for the dialog lifetime (it remounts when reopened).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integrationId]);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api.integrations.updateGrafanaConfig(integrationId, {
        dsUid: {
          prometheus: promUid,
          ...(lokiUid ? { loki: lokiUid } : {}),
          ...(tempoUid ? { tempo: tempoUid } : {}),
        },
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-app-text">
          {t("grafanaManage.editDatasourcesTitle")}
        </h3>
        {!probe && !error && (
          <p className="text-xs text-app-text-muted">{t("grafanaManage.probingGrafana")}</p>
        )}
        {probe && (
          <>
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
          </>
        )}
        {error && <p className="text-xs text-app-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1.5 text-sm text-app-text-muted hover:bg-app-surface-hover"
          >
            {t("grafanaManage.cancel")}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy || !probe || !promUid}
            className="rounded bg-app-primary px-3 py-1.5 text-sm font-medium text-app-primary-on disabled:opacity-50"
          >
            {busy ? t("grafanaManage.saving") : t("grafanaManage.save")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function NewWebhookSecretDialog({
  integrationId,
  webhookSecret,
  onClose,
}: {
  integrationId: string;
  webhookSecret: string;
  onClose: () => void;
}) {
  const { t } = useTranslation("integrations");
  const webhookUrl = `/integrations/grafana/webhook/${integrationId}`;
  return (
    <Modal onClose={onClose}>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-app-text">
          {t("grafanaManage.newWebhookSecretTitle")}
        </h3>
        <p className="text-xs text-app-text-muted">
          {t("grafanaManage.newWebhookSecretDescription")}
        </p>
        <div className="text-xs text-app-text-muted">{t("grafanaManage.webhookUrlLabel")}</div>
        <code className="block break-all rounded bg-app-bg p-2 text-xs text-app-text">
          {webhookUrl}
        </code>
        <div className="text-xs text-app-text-muted">{t("grafanaManage.authHeaderLabel")}</div>
        <code className="block break-all rounded bg-app-bg p-2 text-xs text-app-text">
          Authorization: Bearer {webhookSecret}
        </code>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-app-primary px-3 py-1.5 text-sm font-medium text-app-primary-on"
          >
            {t("grafanaManage.done")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
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
        {children}
      </div>
    </div>
  );
}
