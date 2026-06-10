// GitHub configure surface showing install identity and a manual Resync trigger.

import { useState } from "react";
import { useApi } from "@internal/api-client/react";
import { useTranslation } from "@internal/i18n";
import type { IntegrationDetail } from "@internal/shared-types";

export interface GithubManagePanelProps {
  integration: IntegrationDetail;
  onChanged: () => void;
}

export function GithubManagePanel({ integration, onChanged }: GithubManagePanelProps) {
  const api = useApi();
  const { t } = useTranslation("integrations");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (integration.kind !== "github") return null;
  const cfg = integration.config;

  async function resync() {
    setBusy(true);
    setStatus(null);
    setError(null);
    try {
      const res = await api.integrations.githubResync(integration.id);
      setStatus(
        t("githubManage.resyncStatusTemplate", {
          teamsCreated: res.teamsCreated,
          teamsUpdated: res.teamsUpdated,
          teamsDeleted: res.teamsDeleted,
          membersAdded: res.membersAdded,
          membersRemoved: res.membersRemoved,
        }),
      );
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.resyncFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-app-danger">{error}</p>}
      {status && <p className="text-sm text-app-text">{status}</p>}

      <section className="space-y-2 rounded-md border border-app-border bg-app-surface p-3">
        <h3 className="text-sm font-semibold text-app-text">
          {t("githubManage.sectionInstallation")}
        </h3>
        <Row label={t("githubManage.fieldOrg")} value={cfg.accountLogin || "—"} />
        <Row
          label={t("githubManage.fieldInstallationId")}
          value={String(cfg.installationId || "—")}
        />
      </section>

      <section className="space-y-2 rounded-md border border-app-border bg-app-surface p-3">
        <h3 className="text-sm font-semibold text-app-text">{t("githubManage.sectionSync")}</h3>
        <p className="text-xs text-app-text-muted">{t("githubManage.syncHint")}</p>
        <button
          type="button"
          onClick={resync}
          disabled={busy}
          className="rounded border border-app-border px-2 py-1 text-xs text-app-text hover:bg-app-surface-hover disabled:opacity-50"
        >
          {busy ? t("githubManage.syncing") : t("githubManage.resyncNow")}
        </button>
      </section>
    </div>
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
