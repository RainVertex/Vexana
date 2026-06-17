import { useMemo } from "react";
import { useApiCore } from "@internal/api-client/react";
import type { ApiCore, ListResponse } from "@internal/api-client";
import type {
  Integration,
  IntegrationDetail,
  GithubReconciliationRunDto,
  GithubDriftSummaryDto,
  GithubInstallationSummary,
} from "@feature/integrations-shared";

export function createIntegrationsClient(core: ApiCore) {
  return {
    list: () => core.request<ListResponse<Integration>>(`/api/integrations`),
    get: (id: string) =>
      core.request<IntegrationDetail>(`/api/integrations/${encodeURIComponent(id)}`),
    probeGrafana: (body: { baseUrl: string; apiToken: string }) =>
      core.request<{
        datasources: {
          prometheus: Array<{ uid: string; name: string; isDefault: boolean }>;
          loki: Array<{ uid: string; name: string; isDefault: boolean }>;
          tempo: Array<{ uid: string; name: string; isDefault: boolean }>;
        };
        imageRendererAvailable: boolean;
      }>(`/api/integrations/grafana/probe`, { method: "POST", body: JSON.stringify(body) }),
    connectGrafana: (body: {
      name: string;
      baseUrl: string;
      apiToken: string;
      dsUid: { prometheus: string; loki?: string; tempo?: string };
      alertRefireSuppressionMs?: number;
    }) =>
      core.request<{
        integration: Integration;
        dsUid: { prometheus: string; loki?: string; tempo?: string };
        imageRendererAvailable: boolean;
        webhookSecret: string;
        webhookUrl: string;
      }>(`/api/integrations/grafana`, { method: "POST", body: JSON.stringify(body) }),
    rotateGrafanaToken: (id: string, body: { apiToken: string }) =>
      core.request<Integration>(`/api/integrations/grafana/${encodeURIComponent(id)}/credentials`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    reprobeGrafana: (id: string) =>
      core.request<{
        datasources: {
          prometheus: Array<{ uid: string; name: string; isDefault: boolean }>;
          loki: Array<{ uid: string; name: string; isDefault: boolean }>;
          tempo: Array<{ uid: string; name: string; isDefault: boolean }>;
        };
        imageRendererAvailable: boolean;
      }>(`/api/integrations/grafana/${encodeURIComponent(id)}/probe`),
    updateGrafanaConfig: (
      id: string,
      body: {
        dsUid?: { prometheus: string; loki?: string; tempo?: string };
        alertRefireSuppressionMs?: number;
      },
    ) =>
      core.request<void>(`/api/integrations/grafana/${encodeURIComponent(id)}/config`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    rotateGrafanaWebhookSecret: (id: string) =>
      core.request<{ webhookSecret: string; webhookUrl: string }>(
        `/api/integrations/grafana/${encodeURIComponent(id)}/rotate-webhook-secret`,
        { method: "POST" },
      ),
    disconnect: (id: string) =>
      core.request<void>(`/api/integrations/${encodeURIComponent(id)}`, { method: "DELETE" }),
    setEnabled: (id: string, enabled: boolean) =>
      core.request<Integration>(`/api/integrations/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      }),
    setWebhookSecret: (id: string, webhookSecret: string) =>
      core.request<void>(`/api/integrations/${encodeURIComponent(id)}/webhook-secret`, {
        method: "PATCH",
        body: JSON.stringify({ webhookSecret }),
      }),
    githubResync: (id: string) =>
      core.request<GithubReconciliationRunDto>(
        `/api/integrations/github/${encodeURIComponent(id)}/resync`,
        { method: "POST" },
      ),
    githubDrift: (id: string) =>
      core.request<GithubDriftSummaryDto>(
        `/api/integrations/github/${encodeURIComponent(id)}/drift`,
      ),
    githubInstallations: () =>
      core.request<ListResponse<GithubInstallationSummary>>(
        `/api/integrations/github/installations`,
      ),
  };
}

export function useIntegrationsApi() {
  const core = useApiCore();
  return useMemo(() => createIntegrationsClient(core), [core]);
}
