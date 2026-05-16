// Workspace landing page. Aggregates "my open work items" + "recent
// projects" from /api/workspace/my-work in a single round-trip. When no
// Plane integration is configured yet (or the current user has no Plane
// member mapping), the empty state explains how to fix it.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageLayout } from "@internal/shared-ui";
import { useApi } from "@internal/api-client/react";
import type { MyWorkDto } from "@internal/shared-types";

export function WorkspacePage() {
  const api = useApi();
  const [data, setData] = useState<MyWorkDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.workspace
      .myWork()
      .then(setData)
      .catch((err) => setError(err.message ?? "Failed to load workspace"));
  }, [api]);

  return (
    <PageLayout
      title="Workspace"
      description="Projects, work items, and notes from your integrated task manager."
      actions={
        <Link
          to="/workspace/projects"
          className="rounded-md border border-app-border px-3 py-1 text-sm text-app-text hover:bg-app-surface-hover"
        >
          All projects
        </Link>
      }
    >
      {error && <p className="mb-3 text-sm text-app-danger">{error}</p>}
      {!error && data === null && <p className="text-sm text-app-text-muted">Loading…</p>}

      {data?.needsIntegration && (
        <div className="rounded-md border border-app-border bg-app-surface p-4">
          <h3 className="text-sm font-semibold text-app-text">No task manager connected</h3>
          <p className="mt-1 text-xs text-app-text-muted">
            The Workspace module mirrors data from a self-hosted Plane instance.
          </p>
          <Link
            to="/integrations"
            className="mt-3 inline-block rounded-md bg-app-primary px-3 py-1.5 text-xs font-medium text-app-primary-on"
          >
            Connect Plane
          </Link>
        </div>
      )}

      {data && !data.needsIntegration && data.needsUserMapping && (
        <div className="mb-4 rounded-md border border-app-border bg-app-surface p-3">
          <p className="text-xs text-app-text-muted">
            Your platform account isn&apos;t mapped to a Plane member, so the &quot;my work&quot;
            list is empty. Ask a workspace admin to map your account, or sign in with the email
            registered in Plane.
          </p>
        </div>
      )}

      {data && !data.needsIntegration && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section>
            <h3 className="mb-2 text-sm font-semibold text-app-text">My open work items</h3>
            {data.myOpenWorkItems.length === 0 ? (
              <p className="text-xs text-app-text-muted">Nothing assigned to you.</p>
            ) : (
              <ul className="divide-y divide-app-border rounded-md border border-app-border">
                {data.myOpenWorkItems.map((w) => (
                  <li key={w.id} className="p-3 text-sm">
                    <Link
                      to={`/workspace/work-items/${w.id}`}
                      className="block hover:text-app-primary"
                    >
                      <span className="text-xs text-app-text-muted">
                        {w.project?.identifier}-{w.sequenceId}
                      </span>{" "}
                      <span className="text-app-text">{w.name}</span>
                    </Link>
                    <div className="mt-1 text-xs text-app-text-muted">
                      {w.state?.name ?? "no state"} · {w.priority}
                      {w.targetDate && ` · due ${new Date(w.targetDate).toLocaleDateString()}`}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-app-text">Recent projects</h3>
            {data.recentProjects.length === 0 ? (
              <p className="text-xs text-app-text-muted">No projects yet.</p>
            ) : (
              <ul className="divide-y divide-app-border rounded-md border border-app-border">
                {data.recentProjects.map((p) => (
                  <li key={p.id} className="p-3 text-sm">
                    <Link
                      to={`/workspace/projects/${p.id}`}
                      className="block hover:text-app-primary"
                    >
                      <span className="font-medium text-app-text">
                        {p.emoji ? `${p.emoji} ` : ""}
                        {p.name}
                      </span>
                      <span className="ml-2 text-xs text-app-text-muted">{p.identifier}</span>
                    </Link>
                    {p.description && (
                      <p className="mt-1 text-xs text-app-text-muted line-clamp-2">
                        {p.description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </PageLayout>
  );
}
