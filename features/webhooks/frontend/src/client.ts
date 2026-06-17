import { useMemo } from "react";
import { useApiCore } from "@internal/api-client/react";
import type { ApiCore, ListResponse } from "@internal/api-client";
import type { WebhookSubscriptionDto, WebhookDeliveryDto } from "@feature/webhooks-shared";

export function createWebhooksClient(core: ApiCore) {
  return {
    list: (opts: { teamSlug?: string } = {}) => {
      const qs = opts.teamSlug ? `?teamSlug=${encodeURIComponent(opts.teamSlug)}` : "";
      return core.request<ListResponse<WebhookSubscriptionDto>>(`/api/webhooks${qs}`);
    },
    create: (body: { url: string; eventKinds: string[]; teamSlug?: string }) =>
      core.request<WebhookSubscriptionDto>(`/api/webhooks`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: { active?: boolean; eventKinds?: string[] }) =>
      core.request<WebhookSubscriptionDto>(`/api/webhooks/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      core.request<void>(`/api/webhooks/${encodeURIComponent(id)}`, { method: "DELETE" }),
    test: (id: string) =>
      core.request<{ deliveryId: string }>(`/api/webhooks/${encodeURIComponent(id)}/test`, {
        method: "POST",
      }),
    deliveries: (id: string) =>
      core.request<ListResponse<WebhookDeliveryDto>>(
        `/api/webhooks/${encodeURIComponent(id)}/deliveries`,
      ),
  };
}

export function useWebhooksApi() {
  const core = useApiCore();
  return useMemo(() => createWebhooksClient(core), [core]);
}
