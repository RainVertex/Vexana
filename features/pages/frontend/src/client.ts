import { useMemo } from "react";
import { useApiCore } from "@internal/api-client/react";
import type { ApiCore, ListResponse } from "@internal/api-client";
import type {
  PageDto,
  PageScope,
  PageSection,
  PageType,
  PageWidgetInstance,
} from "@feature/pages-shared";

export function createPagesClient(core: ApiCore) {
  return {
    list: (section: PageSection) =>
      core.request<ListResponse<PageDto>>(`/api/pages?section=${encodeURIComponent(section)}`),
    get: (id: string) => core.request<PageDto>(`/api/pages/${encodeURIComponent(id)}`),
    create: (body: {
      section: PageSection;
      title: string;
      parentId?: string | null;
      icon?: string | null;
      url?: string;
      isFolder?: boolean;
      type?: PageType;
      scope?: PageScope;
      afterId?: string;
    }) =>
      core.request<PageDto>(`/api/pages`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: { title?: string; icon?: string | null; url?: string | null }) =>
      core.request<PageDto>(`/api/pages/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    updateLayout: (id: string, layout: PageWidgetInstance[]) =>
      core.request<PageDto>(`/api/pages/${encodeURIComponent(id)}/layout`, {
        method: "PATCH",
        body: JSON.stringify({ layout }),
      }),
    move: (id: string, body: { parentId?: string | null; afterId?: string; beforeId?: string }) =>
      core.request<PageDto>(`/api/pages/${encodeURIComponent(id)}/move`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      core.request<void>(`/api/pages/${encodeURIComponent(id)}`, { method: "DELETE" }),
  };
}

export function usePagesApi() {
  const core = useApiCore();
  return useMemo(() => createPagesClient(core), [core]);
}
