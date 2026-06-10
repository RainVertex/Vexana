// Per-integration manage shell: generic enable/disable/disconnect plus the provider's ManagePanel.

import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ConfirmDialog, PageLayout } from "@internal/shared-ui";
import { useApi } from "@internal/api-client/react";
import { useTranslation } from "@internal/i18n";
import type { IntegrationDetail } from "@internal/shared-types";
import { findProvider } from "./providerRegistry";

export function IntegrationManagePage() {
  const api = useApi();
  const navigate = useNavigate();
  const { t } = useTranslation("integrations");
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";

  const [detail, setDetail] = useState<IntegrationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.integrations.get(id);
      setDetail(res);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.loadIntegration"));
    }
  }, [api, id, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleEnabled() {
    if (!detail) return;
    setBusy(true);
    try {
      await api.integrations.setEnabled(detail.id, !detail.enabled);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.toggleFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!detail) return;
    setConfirmDisconnect(false);
    try {
      await api.integrations.disconnect(detail.id);
      navigate("/integrations");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.disconnectFailed"));
    }
  }

  const provider = detail ? findProvider(detail.kind) : undefined;
  const ManagePanel = provider?.ManagePanel;
  const title = detail ? detail.name : t("manage.fallbackTitle");
  const description = detail
    ? `${provider ? t(provider.labelKey) : detail.kind} · ${detail.enabled ? t("connected.enabled") : t("connected.disabled")}`
    : undefined;

  return (
    <PageLayout
      title={title}
      description={description}
      actions={
        detail && (
          <>
            <button
              type="button"
              onClick={toggleEnabled}
              disabled={busy}
              className="rounded border border-app-border px-2 py-1 text-xs text-app-text hover:bg-app-surface-hover disabled:opacity-50"
            >
              {detail.enabled ? t("manage.disable") : t("manage.enable")}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDisconnect(true)}
              className="rounded px-2 py-1 text-xs text-app-danger hover:bg-app-surface-hover"
            >
              {t("manage.disconnect")}
            </button>
          </>
        )
      }
    >
      <div className="mb-3">
        <Link to="/integrations" className="text-xs text-app-text-muted hover:underline">
          {t("page.backToIntegrations")}
        </Link>
      </div>

      {error && <p className="mb-3 text-sm text-app-danger">{error}</p>}
      {!detail && !error && <p className="text-sm text-app-text-muted">{t("manage.loading")}</p>}

      {detail && !ManagePanel && (
        <p className="text-sm text-app-text-muted">{t("manage.noPanel")}</p>
      )}

      {detail && ManagePanel && <ManagePanel integration={detail} onChanged={() => void load()} />}

      <ConfirmDialog
        open={confirmDisconnect}
        title={t("confirm.disconnectTitle", { name: detail?.name ?? "integration" })}
        message={t("confirm.disconnectMessage")}
        confirmLabel={t("confirm.disconnectLabel")}
        destructive
        onConfirm={disconnect}
        onClose={() => setConfirmDisconnect(false)}
      />
    </PageLayout>
  );
}
