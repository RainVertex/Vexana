import { useMemo } from "react";
import { useApiCore } from "@internal/api-client/react";
import type { ApiCore, ListResponse } from "@internal/api-client";
import type {
  NotificationCategory,
  NotificationDto,
  NotificationPreferenceDto,
} from "@feature/notifications-shared";

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
    preferences: () =>
      core.request<ListResponse<NotificationPreferenceDto>>(`/api/notifications/preferences`),
    setPreference: (category: NotificationCategory, muted: boolean) =>
      core.request<NotificationPreferenceDto>(`/api/notifications/preferences`, {
        method: "PUT",
        body: JSON.stringify({ category, muted }),
      }),
  };
}

export function useNotificationsApi() {
  const core = useApiCore();
  return useMemo(() => createNotificationsClient(core), [core]);
}
