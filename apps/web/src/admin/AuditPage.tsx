import { useCallback, useEffect, useState } from "react";
import { PageLayout } from "@internal/shared-ui";
import { useApi } from "@internal/api-client/react";
import type { AuditEventRow } from "@internal/shared-types";
import { useCurrentUser } from "../auth";
import { ProfileAvatar } from "../profile";

export function AuditPage() {
  const client = useApi();
  const me = useCurrentUser();
  const [rows, setRows] = useState<AuditEventRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await client.adminAudit.list({ kind: kindFilter || undefined, limit: 200 });
      setRows(res.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit log");
    }
  }, [client, kindFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  if (me.role !== "admin") {
    return (
      <PageLayout title="Audit log" description="Admin only.">
        <div className="text-sm text-app-text-muted">
          You need the <strong>admin</strong> role to view this page.
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Audit log" description="Recent privileged actions on the platform.">
      <div className="mb-4 flex items-center gap-3">
        <input
          type="text"
          placeholder="Filter by kind (e.g. user.role.changed)"
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value)}
          className="flex-1 max-w-md rounded-md border border-app-border bg-app-surface px-3 py-1.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-app-primary"
        />
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md border border-app-border bg-app-surface px-3 py-1.5 text-sm text-app-text hover:bg-app-surface-hover transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-app-danger bg-app-surface px-3 py-2 text-sm text-app-danger">
          {error}
        </div>
      )}

      {!rows ? (
        <div className="text-sm text-app-text-muted">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-app-text-muted">No events match.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-app-border bg-app-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-app-border">
              <tr className="text-left text-xs uppercase tracking-wide text-app-text-muted">
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Payload</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="border-t border-app-border align-top">
                  <td className="px-4 py-3 text-app-text-muted whitespace-nowrap">
                    {new Date(e.createdAt).toLocaleString()}
                    {e.requestId && (
                      <div className="text-xs text-app-text-muted">req: {e.requestId}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{e.kind}</td>
                  <td className="px-4 py-3">
                    {e.actor ? (
                      <div className="flex items-center gap-2 min-w-0">
                        <ProfileAvatar
                          name={e.actor.displayName}
                          avatarUrl={e.actor.avatarUrl}
                          size="sm"
                        />
                        <span className="truncate">{e.actor.displayName}</span>
                      </div>
                    ) : (
                      <span className="text-app-text-muted">system</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-app-text-muted">
                    {e.targetKind ? (
                      <span className="font-mono text-xs">
                        {e.targetKind}/{e.targetId}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <pre className="text-xs text-app-text-muted whitespace-pre-wrap break-all max-w-md">
                      {JSON.stringify(e.payload, null, 0)}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageLayout>
  );
}
