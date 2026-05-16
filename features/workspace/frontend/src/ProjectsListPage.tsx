import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageLayout } from "@internal/shared-ui";
import { useApi } from "@internal/api-client/react";
import type { PlaneProjectDto } from "@internal/shared-types";

export function ProjectsListPage() {
  const api = useApi();
  const [items, setItems] = useState<PlaneProjectDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    api.workspace
      .listProjects({ archived: showArchived ? undefined : false })
      .then((res) => setItems(res.items))
      .catch((err) => setError(err.message ?? "Failed to load projects"));
  }, [api, showArchived]);

  return (
    <PageLayout
      title="Projects"
      description="All Plane projects mirrored into the platform."
      actions={
        <label className="flex items-center gap-2 text-xs text-app-text-muted">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Include archived
        </label>
      }
    >
      {error && <p className="mb-3 text-sm text-app-danger">{error}</p>}
      {!error && items === null && <p className="text-sm text-app-text-muted">Loading…</p>}
      {items && items.length === 0 && (
        <p className="text-sm text-app-text-muted">
          No projects yet. Connect Plane in Integrations to see your data here.
        </p>
      )}
      {items && items.length > 0 && (
        <ul className="divide-y divide-app-border rounded-md border border-app-border">
          {items.map((p) => (
            <li key={p.id} className="p-4">
              <Link to={`/workspace/projects/${p.id}`} className="block hover:text-app-primary">
                <div className="flex items-baseline justify-between">
                  <span className="font-medium text-app-text">
                    {p.emoji ? `${p.emoji} ` : ""}
                    {p.name}
                  </span>
                  <span className="text-xs text-app-text-muted">{p.identifier}</span>
                </div>
                {p.description && (
                  <p className="mt-1 text-xs text-app-text-muted line-clamp-2">{p.description}</p>
                )}
                <div className="mt-2 text-xs text-app-text-muted">
                  {p.openWorkItemCount ?? 0} open / {p.workItemCount ?? 0} total
                  {p.archivedAt && " · archived"}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageLayout>
  );
}
