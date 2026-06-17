import { useMemo } from "react";
import { useApiCore } from "@internal/api-client/react";
import type { ApiCore, ListResponse } from "@internal/api-client";
import type { Scorecard, ScorecardReport, ScorecardHistoryPoint } from "@feature/scorecards-shared";

export function createScorecardsClient(core: ApiCore) {
  return {
    list: () => core.request<ListResponse<Scorecard>>(`/api/scorecards`),
    get: (id: string) => core.request<Scorecard>(`/api/scorecards/${encodeURIComponent(id)}`),
    create: (body: Partial<Scorecard>) =>
      core.request<Scorecard>(`/api/scorecards`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: Partial<Scorecard>) =>
      core.request<Scorecard>(`/api/scorecards/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      core.request<void>(`/api/scorecards/${encodeURIComponent(id)}`, { method: "DELETE" }),
    evaluate: (id: string) =>
      core.request<{ entities: number; results: number }>(
        `/api/scorecards/${encodeURIComponent(id)}/evaluate`,
        { method: "POST" },
      ),
    report: (id: string, opts?: { kind?: string; ownerTeamId?: string }) => {
      const params = new URLSearchParams();
      if (opts?.kind) params.set("kind", opts.kind);
      if (opts?.ownerTeamId) params.set("ownerTeamId", opts.ownerTeamId);
      const qs = params.toString();
      return core.request<ScorecardReport>(
        `/api/scorecards/${encodeURIComponent(id)}/report${qs ? `?${qs}` : ""}`,
      );
    },
    history: (id: string, entityId: string) =>
      core.request<ListResponse<ScorecardHistoryPoint>>(
        `/api/scorecards/${encodeURIComponent(id)}/history?entityId=${encodeURIComponent(entityId)}`,
      ),
  };
}

export function useScorecardsApi() {
  const core = useApiCore();
  return useMemo(() => createScorecardsClient(core), [core]);
}
