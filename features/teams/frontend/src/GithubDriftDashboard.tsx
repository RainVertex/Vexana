import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageLayout } from "@internal/shared-ui";
import { useApi } from "@internal/api-client/react";
import type {
  CurrentUser,
  GithubDriftDto,
  GithubReconciliationRunDto,
} from "@internal/shared-types";

// Admin view of GitHub team-sync drift. Drives the operator decision "do I
// need to hit Resync?" — shows last sync per source (webhook/manual/cron),
// per-team last-synced + stale flag, and the running pending-membership
// queue size. Entry point: /admin/integrations/github/:integrationId/drift
export function GithubDriftDashboard() {
  const api = useApi();
  const { integrationId } = useParams<{ integrationId: string }>();
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [data, setData] = useState<GithubDriftDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resyncing, setResyncing] = useState(false);
  const [resyncResult, setResyncResult] = useState<GithubReconciliationRunDto | null>(null);

  const load = useCallback(async () => {
    if (!integrationId) return;
    try {
      const res = await api.integrations.githubDrift(integrationId);
      setData(res);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load drift");
    }
  }, [api, integrationId]);

  useEffect(() => {
    api.auth
      .me()
      .then(setMe)
      .catch(() => setMe(null));
  }, [api]);

  useEffect(() => {
    if (me?.role !== "admin") return;
    void load();
  }, [load, me]);

  if (me && me.role !== "admin") {
    return (
      <PageLayout title="GitHub drift" description="Admin only.">
        <div className="text-sm text-app-text-muted">
          You need the <strong>admin</strong> role to view this page.
        </div>
      </PageLayout>
    );
  }

  async function handleResync() {
    if (!integrationId) return;
    setResyncing(true);
    setResyncResult(null);
    try {
      const result = await api.integrations.githubResync(integrationId);
      setResyncResult(result);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Resync failed");
    } finally {
      setResyncing(false);
    }
  }

  if (!integrationId) {
    return (
      <PageLayout title="GitHub drift" description="Missing integration id.">
        <div className="text-sm text-app-text-muted">No integration selected.</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="GitHub team sync drift"
      description="Last reconciliation per source and per-team last-synced timestamps."
      actions={
        <button
          type="button"
          onClick={() => void handleResync()}
          disabled={resyncing}
          className="rounded-md bg-app-primary px-3 py-1 text-sm text-white hover:bg-app-primary-hover disabled:opacity-50 transition-colors"
        >
          {resyncing ? "Resyncing…" : "Resync now"}
        </button>
      }
    >
      {error && (
        <div className="mb-4 rounded-md border border-app-danger bg-app-surface px-3 py-2 text-sm text-app-danger">
          {error}
        </div>
      )}

      {resyncResult && (
        <div className="mb-4 rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text">
          Resync complete: +{resyncResult.teamsCreated} teams, ~{resyncResult.teamsUpdated} updated,
          -{resyncResult.teamsDeleted} removed; +{resyncResult.membersAdded} members, -
          {resyncResult.membersRemoved}; queued {resyncResult.pendingQueued} pending.
        </div>
      )}

      {!data ? (
        <div className="text-sm text-app-text-muted">Loading…</div>
      ) : (
        <>
          <section className="mb-6 rounded-lg border border-app-border bg-app-surface p-4">
            <div className="mb-3 text-xs uppercase tracking-wide text-app-text-muted">
              Last reconciliation per source
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {(["webhook", "manual", "cron"] as const).map((src) => {
                const r = data.lastBySource[src];
                return (
                  <div
                    key={src}
                    className="rounded-md border border-app-border bg-app-surface-hover px-3 py-2"
                  >
                    <div className="text-app-text-muted uppercase tracking-wide text-[10px]">
                      {src}
                    </div>
                    <div className="text-app-text">
                      {r ? new Date(r.startedAt).toLocaleString() : "—"}
                    </div>
                    {r && (
                      <div className="text-app-text-muted text-[11px] mt-1">
                        +{r.teamsCreated}/~{r.teamsUpdated}/-{r.teamsDeleted} teams · +
                        {r.membersAdded}/-{r.membersRemoved} members
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {data.pendingMemberCount > 0 && (
              <div className="mt-3 text-xs text-app-text-muted">
                {data.pendingMemberCount} pending team memberships awaiting SSO sign-in.
              </div>
            )}
          </section>

          <section className="rounded-lg border border-app-border bg-app-surface p-4">
            <div className="mb-3 text-xs uppercase tracking-wide text-app-text-muted">
              Imported teams ({data.teams.length})
            </div>
            {data.teams.length === 0 ? (
              <div className="text-sm text-app-text-muted">
                No GitHub teams imported yet. The first sync runs on install.
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-app-text-muted">
                    <th className="py-1">Team</th>
                    <th className="py-1">GH slug</th>
                    <th className="py-1">Members</th>
                    <th className="py-1">Pending</th>
                    <th className="py-1">Last synced</th>
                  </tr>
                </thead>
                <tbody>
                  {data.teams.map((t) => (
                    <tr
                      key={t.id}
                      className={`border-t border-app-border ${t.stale ? "text-app-danger" : ""}`}
                    >
                      <td className="py-1.5">
                        {t.name}
                        {t.stale && <span className="ml-2 text-[10px]">(stale)</span>}
                      </td>
                      <td className="py-1.5 text-app-text-muted font-mono">
                        {t.externalSlug ?? "—"}
                      </td>
                      <td className="py-1.5">{t.memberCount}</td>
                      <td className="py-1.5">{t.pendingMemberCount}</td>
                      <td className="py-1.5 text-app-text-muted">
                        {t.lastSyncedAt ? new Date(t.lastSyncedAt).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </PageLayout>
  );
}
