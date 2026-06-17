import { useMemo } from "react";
import { useApiCore } from "@internal/api-client/react";
import type { ApiCore, ListResponse } from "@internal/api-client";
import type {
  DocCommentRow,
  DocPageDetail,
  DocSearchHit,
  DocStaleReportRow,
  DocsTabResponse,
} from "@feature/devdocs-shared";

export function createDevdocsClient(core: ApiCore) {
  return {
    list: (entityId: string) =>
      core.request<DocsTabResponse>(`/api/catalog/${encodeURIComponent(entityId)}/docs`),
    get: (entityId: string, slug: string) =>
      core.request<DocPageDetail>(
        `/api/catalog/${encodeURIComponent(entityId)}/docs/${encodeURIComponent(slug)}`,
      ),
    sync: (entityId: string) =>
      core.request<{
        entityId: string;
        status: "ok" | "partial" | "failed" | "skipped";
        pageCount: number;
      }>(`/api/catalog/${encodeURIComponent(entityId)}/docs/sync`, { method: "POST" }),
    verify: (pageId: string) =>
      core.request<{ pageId: string; verifiedAt: string | null; verifiedBy: string | null }>(
        `/api/devdocs/pages/${encodeURIComponent(pageId)}/verify`,
        { method: "POST" },
      ),
    listComments: (pageId: string) =>
      core.request<ListResponse<DocCommentRow>>(
        `/api/devdocs/pages/${encodeURIComponent(pageId)}/comments`,
      ),
    postComment: (pageId: string, body: { body: string; anchor?: string }) =>
      core.request<DocCommentRow>(`/api/devdocs/pages/${encodeURIComponent(pageId)}/comments`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    deleteComment: (id: string) =>
      core.request<void>(`/api/devdocs/comments/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    reportStale: (pageId: string, reason?: string) =>
      core.request<DocStaleReportRow>(
        `/api/devdocs/pages/${encodeURIComponent(pageId)}/stale-reports`,
        { method: "POST", body: JSON.stringify({ reason }) },
      ),
    search: (q: string, opts: { entityId?: string; limit?: number } = {}) => {
      const qs = new URLSearchParams();
      qs.set("q", q);
      if (opts.entityId) qs.set("entityId", opts.entityId);
      if (opts.limit) qs.set("limit", String(opts.limit));
      return core.request<{ query: string; hits: DocSearchHit[] }>(
        `/api/devdocs/search?${qs.toString()}`,
      );
    },
  };
}

export function useDevdocsApi() {
  const core = useApiCore();
  return useMemo(() => createDevdocsClient(core), [core]);
}
