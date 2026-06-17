import { useEffect, useState } from "react";
import { useTranslation } from "@internal/i18n";
import type { DeploymentRow, WorkflowRunRow } from "@feature/dora-metrics-shared";
import { useCatalogApi } from "../../client";
import { useEntityContext } from "../outletContext";

// Pipelines tab: workflow runs and deployments, populated by webhooks plus a 15-min cron sweep.

const CONCLUSION_COLOR: Record<string, string> = {
  success: "text-app-success",
  failure: "text-app-danger",
  cancelled: "text-app-text-muted",
  skipped: "text-app-text-muted",
  timed_out: "text-app-danger",
  action_required: "text-app-warning",
  neutral: "text-app-text-muted",
};

const DEPLOY_STATE_COLOR: Record<string, string> = {
  success: "text-app-success",
  failure: "text-app-danger",
  error: "text-app-danger",
  pending: "text-app-text-muted",
  queued: "text-app-text-muted",
  in_progress: "text-app-warning",
  inactive: "text-app-text-muted",
};

type AgeTranslate = (key: string, options?: { n: number }) => string;

function fmtAge(iso: string | null, t: AgeTranslate): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return t("runs.justNow");
  if (ms < 3_600_000) return t("runs.agoMinutes", { n: Math.floor(ms / 60_000) });
  if (ms < 86_400_000) return t("runs.agoHours", { n: Math.floor(ms / 3_600_000) });
  return t("runs.agoDays", { n: Math.floor(ms / 86_400_000) });
}

function fmtDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 0) return "—";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

export function RunsTab() {
  const { data } = useEntityContext();
  const api = useCatalogApi();
  const { t } = useTranslation("catalog");
  const entityId = data.entity.id;
  const hasInstallation = data.entity.installationId != null;

  const [runs, setRuns] = useState<WorkflowRunRow[] | null>(null);
  const [deploys, setDeploys] = useState<DeploymentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNote, setRefreshNote] = useState<string | null>(null);

  function load() {
    let cancelled = false;
    setError(null);
    Promise.all([
      api.pipelineRuns(entityId, { limit: 50 }),
      api.deployments(entityId, { limit: 50 }),
    ])
      .then(([r, d]) => {
        if (!cancelled) {
          setRuns(r.items);
          setDeploys(d.items);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : t("errors.generic"));
      });
    return () => {
      cancelled = true;
    };
  }

  useEffect(() => {
    if (!hasInstallation) {
      setRuns([]);
      setDeploys([]);
      return;
    }
    return load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, entityId, hasInstallation]);

  async function refresh() {
    setRefreshing(true);
    setRefreshNote(null);
    try {
      const res = await api.refreshPipelines(entityId);
      setRefreshNote(
        res.error
          ? t("runs.syncError", { error: res.error })
          : t("runs.syncedRuns_other", {
              runs: res.runsUpserted,
              deploys: res.deploymentsUpserted,
            }),
      );
      load();
    } catch (err) {
      setRefreshNote(err instanceof Error ? err.message : t("runs.refreshFailed"));
    } finally {
      setRefreshing(false);
    }
  }

  if (!hasInstallation) {
    return (
      <div className="rounded-lg border border-app-border bg-app-surface p-6">
        <h2 className="text-sm font-semibold text-app-text mb-2">{t("runs.noIntegrationTitle")}</h2>
        <p className="text-sm text-app-text-muted">{t("runs.noIntegrationBody")}</p>
      </div>
    );
  }

  if (error) return <p className="text-sm text-app-danger">{error}</p>;
  if (runs === null || deploys === null) {
    return <p className="text-sm text-app-text-muted">{t("runs.loading")}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-app-text-muted">
          {t("runs.countSummary_other", { runs: runs.length, deploys: deploys.length })}
        </p>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="rounded-md bg-app-primary px-3 py-1.5 text-sm font-medium text-app-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {refreshing ? t("runs.refreshing") : t("runs.refresh")}
        </button>
      </div>
      {refreshNote && (
        <div className="rounded-md border border-app-border bg-app-surface px-3 py-2 text-xs text-app-text-muted">
          {refreshNote}
        </div>
      )}

      <RunsSection runs={runs} />
      <DeploymentsSection deploys={deploys} />
    </div>
  );
}

function RunsSection({ runs }: { runs: WorkflowRunRow[] }) {
  const { t } = useTranslation("catalog");
  return (
    <section>
      <h2 className="text-sm font-semibold text-app-text mb-2">{t("runs.recentRuns")}</h2>
      {runs.length === 0 ? (
        <div className="rounded-lg border border-app-border bg-app-surface p-6">
          <p className="text-sm text-app-text-muted">{t("runs.noRuns")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-app-border bg-app-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-app-border">
              <tr className="text-left text-xs uppercase tracking-wide text-app-text-muted">
                <th className="px-4 py-3">{t("runs.colStatus")}</th>
                <th className="px-4 py-3">{t("runs.colWorkflow")}</th>
                <th className="px-4 py-3">{t("runs.colBranch")}</th>
                <th className="px-4 py-3">{t("runs.colCommit")}</th>
                <th className="px-4 py-3">{t("runs.colActor")}</th>
                <th className="px-4 py-3">{t("runs.colDuration")}</th>
                <th className="px-4 py-3">{t("runs.colWhen")}</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-t border-app-border align-top">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <RunStatus status={r.status} conclusion={r.conclusion} />
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={r.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-app-primary hover:underline"
                    >
                      {r.workflowName} #{r.runNumber}
                    </a>
                    <div className="text-xs text-app-text-muted">{r.event}</div>
                  </td>
                  <td className="px-4 py-3 text-app-text-muted">{r.headBranch ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-app-text-muted">
                    {r.headSha.slice(0, 7)}
                  </td>
                  <td className="px-4 py-3 text-app-text-muted">{r.actorLogin ?? "—"}</td>
                  <td className="px-4 py-3 text-app-text-muted whitespace-nowrap">
                    {fmtDuration(r.runStartedAt, r.runUpdatedAt)}
                  </td>
                  <td className="px-4 py-3 text-app-text-muted whitespace-nowrap">
                    {fmtAge(r.runUpdatedAt, t)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RunStatus({
  status,
  conclusion,
}: {
  status: WorkflowRunRow["status"];
  conclusion: WorkflowRunRow["conclusion"];
}) {
  const { t } = useTranslation("catalog");
  if (status !== "completed") {
    return (
      <span className="text-xs uppercase tracking-wide text-app-warning">
        {t(`runs.runStatus.${status}`)}
      </span>
    );
  }
  const color = conclusion
    ? (CONCLUSION_COLOR[conclusion] ?? "text-app-text-muted")
    : "text-app-text-muted";
  return (
    <span className={`text-xs uppercase tracking-wide ${color}`}>
      {conclusion ? t(`runs.runConclusion.${conclusion}`) : "—"}
    </span>
  );
}

function DeploymentsSection({ deploys }: { deploys: DeploymentRow[] }) {
  const { t } = useTranslation("catalog");
  return (
    <section>
      <h2 className="text-sm font-semibold text-app-text mb-2">{t("runs.recentDeploys")}</h2>
      {deploys.length === 0 ? (
        <div className="rounded-lg border border-app-border bg-app-surface p-6">
          <p className="text-sm text-app-text-muted">{t("runs.noDeploys")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-app-border bg-app-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-app-border">
              <tr className="text-left text-xs uppercase tracking-wide text-app-text-muted">
                <th className="px-4 py-3">{t("runs.colEnvironment")}</th>
                <th className="px-4 py-3">{t("runs.colState")}</th>
                <th className="px-4 py-3">{t("runs.colRef")}</th>
                <th className="px-4 py-3">{t("runs.colCommit")}</th>
                <th className="px-4 py-3">{t("runs.colActor")}</th>
                <th className="px-4 py-3">{t("runs.colWhen")}</th>
              </tr>
            </thead>
            <tbody>
              {deploys.map((d) => (
                <tr key={d.id} className="border-t border-app-border align-top">
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-app-surface-hover px-2 py-0.5 text-xs text-app-text">
                      {d.environment}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs uppercase tracking-wide ${
                        DEPLOY_STATE_COLOR[d.state] ?? "text-app-text-muted"
                      }`}
                    >
                      {t(`runs.deployState.${d.state}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-app-text-muted">{d.ref}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {d.htmlUrl ? (
                      <a
                        href={d.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-app-primary hover:underline"
                      >
                        {d.sha.slice(0, 7)}
                      </a>
                    ) : (
                      <span className="text-app-text-muted">{d.sha.slice(0, 7)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-app-text-muted">{d.actorLogin ?? "—"}</td>
                  <td className="px-4 py-3 text-app-text-muted whitespace-nowrap">
                    {fmtAge(d.deployedAt, t)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
