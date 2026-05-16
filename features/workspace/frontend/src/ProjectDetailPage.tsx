// Project detail with tabbed sections (Overview, Board, List, Cycles,
// Modules). Tab state lives in the URL `?tab=` so deep links work.

import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { PageLayout } from "@internal/shared-ui";
import { useApi } from "@internal/api-client/react";
import type {
  PlaneCycleDto,
  PlaneLabelDto,
  PlaneModuleDto,
  PlaneProjectDto,
  PlaneStateDto,
  PlaneWorkItemSummaryDto,
} from "@internal/shared-types";

type Tab = "overview" | "board" | "list" | "cycles" | "modules";
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "board", label: "Board" },
  { id: "list", label: "List" },
  { id: "cycles", label: "Cycles" },
  { id: "modules", label: "Modules" },
];

interface ProjectDetail extends PlaneProjectDto {
  states: PlaneStateDto[];
  labels: PlaneLabelDto[];
  cycles: PlaneCycleDto[];
  modules: PlaneModuleDto[];
}

export function ProjectDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") as Tab) || "overview";
  const api = useApi();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [items, setItems] = useState<PlaneWorkItemSummaryDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.workspace
      .getProject(id)
      .then((p) => setProject(p as ProjectDetail))
      .catch((err) => setError(err.message ?? "Failed to load project"));
  }, [api, id]);

  useEffect(() => {
    api.workspace
      .listWorkItems(id)
      .then((res) => setItems(res.items))
      .catch((err) => setError(err.message ?? "Failed to load work items"));
  }, [api, id]);

  const itemsByStateGroup = useMemo(() => {
    const map = new Map<string, PlaneWorkItemSummaryDto[]>();
    if (!items) return map;
    for (const w of items) {
      const group = w.state?.group ?? "unstarted";
      const list = map.get(group) ?? [];
      list.push(w);
      map.set(group, list);
    }
    return map;
  }, [items]);

  return (
    <PageLayout
      title={project ? `${project.emoji ?? ""} ${project.name}` : "Project"}
      description={project?.description ?? undefined}
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

      <nav className="mb-4 flex gap-1 border-b border-app-border">
        {TABS.map((t) => (
          <button
            type="button"
            key={t.id}
            onClick={() =>
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.set("tab", t.id);
                return next;
              })
            }
            className={`px-3 py-2 text-sm ${
              tab === t.id
                ? "border-b-2 border-app-primary text-app-text"
                : "text-app-text-muted hover:text-app-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "overview" && project && (
        <div className="space-y-3 text-sm">
          <div>
            <span className="text-xs uppercase tracking-wide text-app-text-muted">Identifier</span>
            <div className="text-app-text">{project.identifier}</div>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wide text-app-text-muted">Last synced</span>
            <div className="text-app-text">
              {project.lastSyncedAt ? new Date(project.lastSyncedAt).toLocaleString() : "never"}
            </div>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wide text-app-text-muted">
              Open / total
            </span>
            <div className="text-app-text">
              {project.openWorkItemCount ?? 0} / {project.workItemCount ?? 0}
            </div>
          </div>
        </div>
      )}

      {tab === "board" && project && items && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {["backlog", "unstarted", "started", "completed", "cancelled"].map((group) => (
            <div key={group} className="rounded-md border border-app-border bg-app-surface p-2">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                {group} ({itemsByStateGroup.get(group)?.length ?? 0})
              </h4>
              <ul className="space-y-2">
                {(itemsByStateGroup.get(group) ?? []).map((w) => (
                  <li key={w.id} className="rounded border border-app-border bg-app-bg p-2 text-xs">
                    <Link
                      to={`/workspace/work-items/${w.id}`}
                      className="block hover:text-app-primary"
                    >
                      <span className="text-app-text-muted">
                        {project.identifier}-{w.sequenceId}
                      </span>{" "}
                      <span className="text-app-text">{w.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {tab === "list" && items && (
        <ul className="divide-y divide-app-border rounded-md border border-app-border">
          {items.map((w) => (
            <li key={w.id} className="p-3 text-sm">
              <Link to={`/workspace/work-items/${w.id}`} className="block hover:text-app-primary">
                <span className="text-xs text-app-text-muted">
                  {project?.identifier}-{w.sequenceId}
                </span>{" "}
                <span className="text-app-text">{w.name}</span>
              </Link>
              <div className="mt-1 text-xs text-app-text-muted">
                {w.state?.name ?? "—"} · {w.priority}
              </div>
            </li>
          ))}
        </ul>
      )}

      {tab === "cycles" && project && (
        <ul className="divide-y divide-app-border rounded-md border border-app-border">
          {project.cycles.length === 0 && (
            <li className="p-3 text-xs text-app-text-muted">No cycles.</li>
          )}
          {project.cycles.map((c) => (
            <li key={c.id} className="p-3 text-sm">
              <div className="font-medium text-app-text">{c.name}</div>
              <div className="text-xs text-app-text-muted">
                {c.startDate ? new Date(c.startDate).toLocaleDateString() : "—"} →{" "}
                {c.endDate ? new Date(c.endDate).toLocaleDateString() : "—"}
              </div>
            </li>
          ))}
        </ul>
      )}

      {tab === "modules" && project && (
        <ul className="divide-y divide-app-border rounded-md border border-app-border">
          {project.modules.length === 0 && (
            <li className="p-3 text-xs text-app-text-muted">No modules.</li>
          )}
          {project.modules.map((m) => (
            <li key={m.id} className="p-3 text-sm">
              <div className="font-medium text-app-text">{m.name}</div>
              {m.status && <div className="text-xs text-app-text-muted">{m.status}</div>}
            </li>
          ))}
        </ul>
      )}
    </PageLayout>
  );
}
