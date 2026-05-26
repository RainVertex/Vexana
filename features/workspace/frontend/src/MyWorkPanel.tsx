import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "@internal/api-client/react";
import type { MyWorkDto } from "@internal/shared-types";

export interface MyWorkPanelProps {
  limit?: number;
}

export function MyWorkPanel({ limit = 8 }: MyWorkPanelProps) {
  const api = useApi();
  const [data, setData] = useState<MyWorkDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.workspace
      .myWork()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [api]);

  if (error) {
    return <p className="text-sm text-app-danger">{error}</p>;
  }
  if (data === null) {
    return <p className="text-sm text-app-text-muted">Loading...</p>;
  }
  if (data.needsIntegration) {
    return (
      <div className="flex h-full flex-col items-start justify-center gap-2 text-sm">
        <p className="text-app-text-muted">No task manager connected.</p>
        <Link
          to="/integrations"
          className="rounded-md bg-app-primary px-3 py-1.5 text-xs font-medium text-app-primary-on"
        >
          Connect Plane
        </Link>
      </div>
    );
  }
  if (data.needsUserMapping) {
    return (
      <p className="text-xs text-app-text-muted">
        Your account is not mapped to a Plane member yet. Ask an admin to map it.
      </p>
    );
  }
  if (data.myOpenWorkItems.length === 0) {
    return <p className="text-sm text-app-text-muted">Nothing assigned to you.</p>;
  }

  const items = data.myOpenWorkItems.slice(0, limit);
  const hidden = data.myOpenWorkItems.length - items.length;

  return (
    <div className="flex h-full flex-col">
      <ul className="flex-1 divide-y divide-app-border overflow-y-auto">
        {items.map((w) => (
          <li key={w.id}>
            <Link
              to={`/workspace/work-items/${w.id}`}
              className="block py-2 hover:text-app-primary"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm text-app-text">
                  <span className="text-xs text-app-text-muted">
                    {w.project?.identifier}-{w.sequenceId}
                  </span>{" "}
                  {w.name}
                </span>
                {w.targetDate && (
                  <span className="shrink-0 text-xs text-app-text-muted">
                    {new Date(w.targetDate).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 text-xs text-app-text-muted">
                <span>
                  {w.state?.name ?? "no state"} ({w.priority})
                </span>
                {w.planeUrl && (
                  <a
                    href={w.planeUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 hover:text-app-primary"
                  >
                    Open in Plane &rarr;
                  </a>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex justify-between text-xs text-app-text-muted">
        {hidden > 0 ? <span>+{hidden} more</span> : <span />}
        <Link to="/workspace" className="hover:text-app-primary">
          Open Workspace
        </Link>
      </div>
    </div>
  );
}
