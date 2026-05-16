import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@internal/shared-ui";
import { useApi } from "@internal/api-client/react";
import type { ScaffolderBinding } from "@internal/shared-types";

interface DriftRow {
  id: string;
  bindingId: string;
  fromVersion: string;
  toVersion: string;
  diffSummary: unknown;
  status: "open" | "ignored" | "applied" | "superseded";
  prUrl: string | null;
  detectedAt: string;
  resolvedAt: string | null;
  binding?: ScaffolderBinding;
}

type Filter = "open" | "ignored" | "applied" | "superseded";

const FILTERS: Filter[] = ["open", "applied", "ignored", "superseded"];

export function DriftInboxPage() {
  const api = useApi();
  const navigate = useNavigate();
  const [rows, setRows] = useState<DriftRow[] | null>(null);
  const [filter, setFilter] = useState<Filter>("open");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    setRows(null);
    api.scaffolder
      .listDrift(filter)
      .then((res) => setRows(res.items as DriftRow[]))
      .catch((err) => setError(err.message ?? "Failed to load drift"));
  }, [api, filter]);

  useEffect(load, [load]);

  async function replan(row: DriftRow) {
    setBusy(row.id);
    setError(null);
    try {
      const plan = await api.scaffolder.replanBinding(row.bindingId);
      navigate(`/scaffolder/plans/${plan.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Replan failed");
    } finally {
      setBusy(null);
    }
  }

  async function setStatus(row: DriftRow, status: "ignored") {
    setBusy(row.id);
    setError(null);
    try {
      await api.scaffolder.updateDrift(row.id, status);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <PageLayout
      title="Drift inbox"
      description="Generated artifacts whose template has changed since they were applied."
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={chipClass(filter === f)}
          >
            {f}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {rows === null ? (
        <p className="text-sm text-app-text-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-app-text-muted">No {filter} drift.</p>
      ) : (
        <ul className="divide-y divide-app-border rounded-md border border-app-border bg-app-surface">
          {rows.map((row) => {
            const summary = row.diffSummary as {
              stepCount?: number;
              actions?: string[];
              mutationKinds?: string[];
            } | null;
            return (
              <li key={row.id} className="px-3 py-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-app-text">
                      {row.binding?.targetRef ?? row.bindingId}
                    </div>
                    <div className="text-xs text-app-text-muted">
                      {row.binding?.templateId} · {row.fromVersion} → {row.toVersion} · detected{" "}
                      {new Date(row.detectedAt).toLocaleString()}
                    </div>
                    {summary?.actions && summary.actions.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {summary.actions.map((a, i) => (
                          <span
                            key={`${a}-${i}`}
                            className="rounded bg-app-surface-hover px-1.5 py-0.5 text-[10px] font-mono text-app-text-muted"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {row.status === "open" && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        disabled={busy === row.id}
                        onClick={() => replan(row)}
                        className="rounded-md bg-app-primary px-3 py-1.5 text-xs font-medium text-app-primary-on disabled:opacity-50"
                      >
                        {busy === row.id ? "Replanning…" : "Replan"}
                      </button>
                      <button
                        type="button"
                        disabled={busy === row.id}
                        onClick={() => setStatus(row, "ignored")}
                        className="rounded-md border border-app-border px-3 py-1.5 text-xs text-app-text-muted hover:bg-app-surface-hover disabled:opacity-50"
                      >
                        Ignore
                      </button>
                    </div>
                  )}
                  {row.resolvedAt && (
                    <div className="text-right text-xs text-app-text-muted">
                      resolved {new Date(row.resolvedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PageLayout>
  );
}

function chipClass(active: boolean): string {
  return `rounded-full border px-3 py-1 text-xs transition-colors ${
    active
      ? "border-app-primary bg-app-primary-soft text-app-primary-on"
      : "border-app-border text-app-text-muted hover:bg-app-surface-hover"
  }`;
}
