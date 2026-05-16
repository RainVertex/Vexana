import { useCallback, useEffect, useState } from "react";
import { PageLayout } from "@internal/shared-ui";
import { useApi } from "@internal/api-client/react";
import type { CatalogDriftRow, CatalogDriftStatus } from "@internal/shared-types";

const FILTERS: CatalogDriftStatus[] = ["open", "applied", "ignored", "superseded"];

export function CatalogDriftInbox() {
  const api = useApi();
  const [rows, setRows] = useState<CatalogDriftRow[] | null>(null);
  const [filter, setFilter] = useState<CatalogDriftStatus>("open");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    setRows(null);
    setError(null);
    api.catalog
      .listDrifts(filter)
      .then((res) => setRows(res.items))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load drift"));
  }, [api, filter]);

  useEffect(load, [load]);

  async function applyDrift(row: CatalogDriftRow) {
    setBusy(row.id);
    try {
      await api.catalog.applyDrift(row.id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Apply failed");
    } finally {
      setBusy(null);
    }
  }

  async function ignoreDrift(row: CatalogDriftRow) {
    setBusy(row.id);
    try {
      await api.catalog.ignoreDrift(row.id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ignore failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <PageLayout
      title="Catalog drift inbox"
      description="Differences between live catalog entities and what discovery or the enricher agent observed."
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

      {error && <p className="mb-3 text-sm text-app-danger">{error}</p>}

      {rows === null ? (
        <p className="text-sm text-app-text-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-app-text-muted">No {filter} drift.</p>
      ) : (
        <ul className="divide-y divide-app-border rounded-md border border-app-border bg-app-surface">
          {rows.map((row) => {
            const diff = row.diff as {
              fields?: string[];
              before?: Record<string, unknown>;
              after?: Record<string, unknown>;
            } | null;
            return (
              <li key={row.id} className="px-3 py-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-app-text">
                      {row.entity?.kind}/{row.entity?.name ?? row.entityId}
                    </div>
                    <div className="text-xs text-app-text-muted">
                      {row.kind} · proposed by {row.proposedBy} · detected{" "}
                      {new Date(row.detectedAt).toLocaleString()}
                    </div>
                    {diff?.fields && diff.fields.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {diff.fields.map((f) => (
                          <span
                            key={f}
                            className="rounded bg-app-surface-hover px-1.5 py-0.5 font-mono text-[10px] text-app-text-muted"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                    {diff?.before && diff?.after && (
                      <details className="mt-2 text-xs">
                        <summary className="cursor-pointer text-app-text-muted hover:text-app-text">
                          View diff
                        </summary>
                        <div className="mt-1 grid grid-cols-2 gap-2">
                          <pre className="overflow-x-auto rounded bg-app-surface-hover p-2 text-[11px]">
                            {JSON.stringify(diff.before, null, 2)}
                          </pre>
                          <pre className="overflow-x-auto rounded bg-app-surface-hover p-2 text-[11px]">
                            {JSON.stringify(diff.after, null, 2)}
                          </pre>
                        </div>
                      </details>
                    )}
                  </div>
                  {row.status === "open" && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        disabled={busy === row.id}
                        onClick={() => applyDrift(row)}
                        className="rounded-md bg-app-primary px-3 py-1.5 text-xs font-medium text-app-primary-on disabled:opacity-50"
                      >
                        {busy === row.id ? "Applying…" : "Apply"}
                      </button>
                      <button
                        type="button"
                        disabled={busy === row.id}
                        onClick={() => ignoreDrift(row)}
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
