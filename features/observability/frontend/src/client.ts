import { useMemo } from "react";
import { useApiCore } from "@internal/api-client/react";
import type { ApiCore, ListResponse } from "@internal/api-client";
import type {
  ServiceHealthSample,
  LokiLogLine,
  TempoTrace,
  EntityObservabilityConfigDto,
} from "@feature/observability-shared";

export function createObservabilityClient(core: ApiCore) {
  return {
    healthSamples: () =>
      core.request<ListResponse<ServiceHealthSample>>(`/api/observability/health-samples`),
    healthSamplesForEntity: (entityId: string) =>
      core.request<ListResponse<ServiceHealthSample>>(
        `/api/observability/health-samples/${encodeURIComponent(entityId)}`,
      ),
    logs: (entityId: string, opts: { minutes?: number; limit?: number } = {}) => {
      const qs = new URLSearchParams({ entityId });
      if (opts.minutes !== undefined) qs.set("minutes", String(opts.minutes));
      if (opts.limit !== undefined) qs.set("limit", String(opts.limit));
      return core.request<ListResponse<LokiLogLine>>(`/api/observability/logs?${qs.toString()}`);
    },
    trace: (traceId: string, opts: { entityId: string }) => {
      const qs = new URLSearchParams({ entityId: opts.entityId });
      return core.request<TempoTrace>(
        `/api/observability/traces/${encodeURIComponent(traceId)}?${qs.toString()}`,
      );
    },
    // URL only; the <img> fetch carries the backend-held token. Non-admins must pass entityId to authorize.
    dashboardImageUrl: (params: {
      dashboardUid: string;
      panelId: number;
      from?: string;
      to?: string;
      w?: number;
      h?: number;
      entityId?: string;
    }) => {
      const qs = new URLSearchParams({
        dashboardUid: params.dashboardUid,
        panelId: String(params.panelId),
      });
      if (params.from) qs.set("from", params.from);
      if (params.to) qs.set("to", params.to);
      if (params.w) qs.set("w", String(params.w));
      if (params.h) qs.set("h", String(params.h));
      if (params.entityId) qs.set("entityId", params.entityId);
      return `/api/observability/dashboard-image?${qs.toString()}`;
    },
    getEntityConfig: (entityId: string) =>
      core.request<EntityObservabilityConfigDto>(
        `/api/observability/entities/${encodeURIComponent(entityId)}/config`,
      ),
    putEntityConfig: (
      entityId: string,
      body: {
        integrationId: string;
        upQuery?: string | null;
        latencyQuery?: string | null;
        errorQuery?: string | null;
        logsSelector?: string | null;
        dashboardUid?: string | null;
        traceIdRegex?: string | null;
      },
    ) =>
      core.request<EntityObservabilityConfigDto>(
        `/api/observability/entities/${encodeURIComponent(entityId)}/config`,
        { method: "PUT", body: JSON.stringify(body) },
      ),
    deleteEntityConfig: (entityId: string) =>
      core.request<void>(`/api/observability/entities/${encodeURIComponent(entityId)}/config`, {
        method: "DELETE",
      }),
  };
}

export function useObservabilityApi() {
  const core = useApiCore();
  return useMemo(() => createObservabilityClient(core), [core]);
}
