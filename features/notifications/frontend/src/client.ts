import { useMemo } from "react";
import { useApiCore } from "@internal/api-client/react";
import type { ApiCore, ListResponse } from "@internal/api-client";
import type { NotificationDto } from "@feature/notifications-shared";

export function createNotificationsClient(core: ApiCore) {
  return {
    list: (opts: { unread?: boolean; limit?: number } = {}) => {
      const qs = new URLSearchParams();
      if (opts.unread) qs.set("unread", "true");
      if (opts.limit) qs.set("limit", String(opts.limit));
      const q = qs.toString();
      return core.request<ListResponse<NotificationDto>>(`/api/notifications${q ? `?${q}` : ""}`);
    },
    unreadCount: () => core.request<{ count: number }>(`/api/notifications/unread-count`),
    markRead: (id: string) =>
      core.request<void>(`/api/notifications/${encodeURIComponent(id)}/read`, { method: "POST" }),
    markAllRead: () =>
      core.request<{ count: number }>(`/api/notifications/read-all`, { method: "POST" }),
  };
}

export function useNotificationsApi() {
  const core = useApiCore();
  return useMemo(() => createNotificationsClient(core), [core]);
}
