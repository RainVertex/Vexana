import { useMemo } from "react";
import { useApiCore } from "@internal/api-client/react";
import type { ApiCore, ListResponse } from "@internal/api-client";
import type { AuditEventRow } from "@internal/shared-types";
import type {
  CatalogEntityKind,
  CatalogEntityOverviewResponse,
  CatalogEntityWithOwners,
  CatalogListItem,
  CatalogRelationsResponse,
} from "@feature/catalog-shared";
import type { DoraMetricsSnapshot } from "@feature/observability-shared";
import type { ScorecardSummary } from "@feature/scorecards-shared";
import type { DeploymentRow, WorkflowRunRow } from "@feature/dora-metrics-shared";

export interface CreateCatalogEntityInput {
  kind: CatalogEntityKind;
  name: string;
  description?: string;
  ownerTeamIds?: string[];
  repoUrl?: string;
  tags?: string[];
  accountLogin: string;
}

export interface PatchCatalogEntityInput {
  description?: string | null;
  ownerTeamIds?: string[] | null;
  repoUrl?: string | null;
  tags?: string[];
  autoApply?: boolean;
}

export function createCatalogClient(core: ApiCore) {
  return {
    list: () => core.request<ListResponse<CatalogListItem>>(`/api/catalog`),
    get: (id: string) =>
      core.request<CatalogEntityWithOwners>(`/api/catalog/${encodeURIComponent(id)}`),
    overview: (id: string) =>
      core.request<CatalogEntityOverviewResponse>(
        `/api/catalog/${encodeURIComponent(id)}/overview`,
      ),
    relations: (id: string) =>
      core.request<CatalogRelationsResponse>(`/api/catalog/${encodeURIComponent(id)}/relations`),
    scorecardsFor: (id: string) =>
      core.request<ListResponse<ScorecardSummary>>(
        `/api/catalog/${encodeURIComponent(id)}/scorecards`,
      ),
    recomputeScorecards: (id: string) =>
      core.request<ListResponse<ScorecardSummary>>(
        `/api/catalog/${encodeURIComponent(id)}/scorecards/recompute`,
        { method: "POST" },
      ),
    auditFor: (id: string, limit = 200) =>
      core.request<ListResponse<AuditEventRow>>(
        `/api/catalog/${encodeURIComponent(id)}/audit?limit=${limit}`,
      ),
    create: (body: CreateCatalogEntityInput) =>
      core.request<CatalogEntityWithOwners & { action: "created" | "updated" | "noop" }>(
        `/api/catalog`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    update: (id: string, body: PatchCatalogEntityInput) =>
      core.request<CatalogEntityWithOwners & { action: "created" | "updated" | "noop" }>(
        `/api/catalog/${encodeURIComponent(id)}`,
        { method: "PATCH", body: JSON.stringify(body) },
      ),
    delete: (id: string) =>
      core.request<void>(`/api/catalog/${encodeURIComponent(id)}`, { method: "DELETE" }),
    listStars: () => core.request<ListResponse<string>>(`/api/catalog/stars`),
    star: (id: string) =>
      core.request<void>(`/api/catalog/${encodeURIComponent(id)}/star`, { method: "PUT" }),
    unstar: (id: string) =>
      core.request<void>(`/api/catalog/${encodeURIComponent(id)}/star`, { method: "DELETE" }),
    pipelineRuns: (id: string, opts?: { limit?: number; branch?: string }) => {
      const params = new URLSearchParams();
      if (opts?.limit) params.set("limit", String(opts.limit));
      if (opts?.branch) params.set("branch", opts.branch);
      const qs = params.toString();
      return core.request<ListResponse<WorkflowRunRow>>(
        `/api/catalog/${encodeURIComponent(id)}/pipeline-runs${qs ? `?${qs}` : ""}`,
      );
    },
    deployments: (id: string, opts?: { limit?: number; environment?: string }) => {
      const params = new URLSearchParams();
      if (opts?.limit) params.set("limit", String(opts.limit));
      if (opts?.environment) params.set("environment", opts.environment);
      const qs = params.toString();
      return core.request<ListResponse<DeploymentRow>>(
        `/api/catalog/${encodeURIComponent(id)}/deployments${qs ? `?${qs}` : ""}`,
      );
    },
    refreshPipelines: (id: string) =>
      core.request<{
        ok: boolean;
        entityId: string;
        runsUpserted: number;
        deploymentsUpserted: number;
        error: string | null;
      }>(`/api/catalog/${encodeURIComponent(id)}/pipelines/refresh`, { method: "POST" }),
    recomputeDora: (id: string) =>
      core.request<DoraMetricsSnapshot>(`/api/catalog/${encodeURIComponent(id)}/dora/recompute`, {
        method: "POST",
      }),
  };
}

export function useCatalogApi() {
  const core = useApiCore();
  return useMemo(() => createCatalogClient(core), [core]);
}
