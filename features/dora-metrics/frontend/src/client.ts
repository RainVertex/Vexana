import { useMemo } from "react";
import { useApiCore } from "@internal/api-client/react";
import type { ApiCore, ListResponse } from "@internal/api-client";
import type { DoraMetricsSnapshot } from "@feature/observability-shared";

export function createDoraMetricsClient(core: ApiCore) {
  return {
    list: () => core.request<ListResponse<DoraMetricsSnapshot>>(`/api/dora-metrics`),
    forEntity: (entityId: string) =>
      core.request<ListResponse<DoraMetricsSnapshot>>(
        `/api/dora-metrics/entity/${encodeURIComponent(entityId)}`,
      ),
  };
}

export function useDoraMetricsApi() {
  const core = useApiCore();
  return useMemo(() => createDoraMetricsClient(core), [core]);
}
