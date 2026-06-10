import { useCallback, useEffect, useState } from "react";
import { PageLayout } from "@internal/shared-ui";
import { Trans, useTranslation } from "@internal/i18n";
import { useApi } from "@internal/api-client/react";
import type { JobRunStatus, JobSummary } from "@internal/shared-types";
import { useCurrentUser } from "../auth";

const statusColors: Record<JobRunStatus, string> = {
  running: "text-app-text",
  succeeded: "text-app-text",
  failed: "text-app-danger",
  cancelled: "text-app-text-muted",
};

export function JobsPage() {
  const client = useApi();
  const me = useCurrentUser();
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<JobSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await client.adminJobs.list();
      setJobs(res.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs");
    }
  }, [client]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 10_000);
    return () => clearInterval(id);
  }, [load]);

  async function runNow(name: string) {
    setBusy(name);
    try {
      await client.adminJobs.run(name);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Run failed");
    } finally {
      setBusy(null);
    }
  }

  async function toggle(name: string, enabled: boolean) {
    setBusy(name);
    try {
      await client.adminJobs.toggle(name, enabled);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Toggle failed");
    } finally {
      setBusy(null);
    }
  }

  if (me.role !== "admin") {
    return (
      <PageLayout title={t("admin.jobsTitle")} description={t("common.adminOnly")}>
        <div className="text-sm text-app-text-muted">
          <Trans i18nKey="forbidden.body" components={{ strong: <strong /> }} />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={t("admin.jobsTitle")} description={t("admin.jobsDescription")}>
      {error && (
        <div className="mb-4 rounded-md border border-app-danger bg-app-surface px-3 py-2 text-sm text-app-danger">
          {error}
        </div>
      )}

      {!jobs ? (
        <div className="text-sm text-app-text-muted">{t("common.loading")}</div>
      ) : jobs.length === 0 ? (
        <div className="text-sm text-app-text-muted">{t("admin.jobsEmpty")}</div>
      ) : (
        <div className="grid gap-4">
          {jobs.map((j) => (
            <section
              key={j.name}
              className="rounded-lg border border-app-border bg-app-surface p-4"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="min-w-0">
                  <div className="font-mono text-sm text-app-text">{j.name}</div>
                  <div className="text-xs text-app-text-muted">
                    Schedule: <code>{j.schedule}</code> · Timeout {Math.round(j.timeoutMs / 1000)}s
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={busy === j.name}
                    onClick={() => void runNow(j.name)}
                    className="rounded-md bg-app-primary px-3 py-1 text-sm text-white hover:bg-app-primary-hover disabled:opacity-50 transition-colors"
                  >
                    Run now
                  </button>
                  <button
                    type="button"
                    disabled={busy === j.name}
                    onClick={() => void toggle(j.name, !j.enabled)}
                    className="rounded-md border border-app-border bg-app-surface px-3 py-1 text-sm text-app-text hover:bg-app-surface-hover transition-colors"
                  >
                    {j.enabled ? "Disable" : "Enable"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-3">
                <Stat label="Status" value={j.enabled ? "enabled" : "disabled"} />
                <Stat
                  label="Last run"
                  value={j.lastRunAt ? new Date(j.lastRunAt).toLocaleString() : "—"}
                />
                <Stat
                  label="Last success"
                  value={j.lastSuccessAt ? new Date(j.lastSuccessAt).toLocaleString() : "—"}
                />
              </div>

              {j.lastError && (
                <div className="mb-3 rounded-md border border-app-danger bg-app-surface px-3 py-2 text-xs text-app-danger break-words">
                  {j.lastError}
                </div>
              )}

              {j.recentRuns.length > 0 && (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-app-text-muted">
                      <th className="py-1">Run</th>
                      <th className="py-1">Trigger</th>
                      <th className="py-1">Status</th>
                      <th className="py-1">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {j.recentRuns.map((r) => (
                      <tr key={r.id} className="border-t border-app-border">
                        <td className="py-1.5 text-app-text-muted">
                          {new Date(r.startedAt).toLocaleTimeString()}
                        </td>
                        <td className="py-1.5 text-app-text-muted">{r.triggeredBy}</td>
                        <td className={`py-1.5 ${statusColors[r.status]}`}>{r.status}</td>
                        <td className="py-1.5 text-app-text-muted">
                          {r.durationMs != null ? `${r.durationMs}ms` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          ))}
        </div>
      )}
    </PageLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-app-text-muted uppercase tracking-wide text-[10px]">{label}</div>
      <div className="text-app-text">{value}</div>
    </div>
  );
}
