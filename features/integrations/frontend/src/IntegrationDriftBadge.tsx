// Inline GitHub drift indicator with a manual resync; hidden for non-admins and non-github kinds.

import { useCallback, useEffect, useState } from "react";
import { DriftBadge } from "@internal/shared-ui";
import { useApi } from "@internal/api-client/react";
import { useTranslation } from "@internal/i18n";
import type { GithubDriftSummaryDto } from "@internal/shared-types";

export interface IntegrationDriftBadgeProps {
  integrationId: string;
  kind: string;
}

export function IntegrationDriftBadge({ integrationId, kind }: IntegrationDriftBadgeProps) {
  const api = useApi();
  const { t } = useTranslation("integrations");
  const [data, setData] = useState<GithubDriftSummaryDto | null>(null);
  const [resyncing, setResyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (kind !== "github") return;
    try {
      const res = await api.integrations.githubDrift(integrationId);
      setData(res);
    } catch {
      setData(null);
    }
  }, [api, integrationId, kind]);

  useEffect(() => {
    void load();
  }, [load]);

  if (kind !== "github" || !data) return null;
  const count = data.staleTeamCount + (data.pendingMemberCount > 0 ? 1 : 0);
  if (count === 0) return null;

  async function resync() {
    setResyncing(true);
    setError(null);
    try {
      await api.integrations.githubResync(integrationId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.resyncFailed"));
    } finally {
      setResyncing(false);
    }
  }

  return (
    <DriftBadge count={data.staleTeamCount} label={t("drift.staleTeams")} severity="warn">
      <div className="space-y-2">
        <div className="text-app-text-muted">
          {t("drift.lastReconciliation")}{" "}
          {data.lastReconciliationAt
            ? new Date(data.lastReconciliationAt).toLocaleString()
            : t("drift.never")}
        </div>
        {data.staleTeams.length > 0 && (
          <ul className="space-y-1">
            {data.staleTeams.map((team) => (
              <li key={team.id} className="flex justify-between gap-2">
                <span className="text-app-text">{team.name}</span>
                <span className="text-app-text-muted">
                  {team.lastSyncedAt
                    ? new Date(team.lastSyncedAt).toLocaleDateString()
                    : t("drift.never")}
                </span>
              </li>
            ))}
          </ul>
        )}
        {data.pendingMemberCount > 0 && (
          <div className="text-app-text-muted">
            {t("drift.pendingMemberships", { count: data.pendingMemberCount })}
          </div>
        )}
        {error && <div className="text-app-danger">{error}</div>}
        <button
          type="button"
          onClick={() => void resync()}
          disabled={resyncing}
          className="rounded border border-app-border px-2 py-1 text-app-text hover:bg-app-surface-hover disabled:opacity-50"
        >
          {resyncing ? t("drift.resyncing") : t("drift.resyncNow")}
        </button>
      </div>
    </DriftBadge>
  );
}
