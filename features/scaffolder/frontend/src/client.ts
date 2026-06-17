import { useMemo } from "react";
import { useApiCore } from "@internal/api-client/react";
import type { ApiCore, ListResponse } from "@internal/api-client";
import type {
  ScaffolderActionDoc,
  ScaffolderBinding,
  ScaffolderDriftSummaryDto,
  ScaffolderPlan,
  ScaffolderTask,
  ScaffolderTemplateDefPreview,
  ScaffolderTemplateDefRow,
  ScaffolderTemplateSummary,
} from "@feature/scaffolder-shared";

export interface ScaffolderTemplateDetail extends ScaffolderTemplateSummary {
  parametersJsonSchema: Record<string, unknown>;
  uiSchema: Record<string, unknown>;
  defaultTarget: { agent: "worktree"; human: "worktree" };
  planTtlSeconds: number;
}

export interface ScaffolderApplyResult {
  taskId: string;
  status: ScaffolderTask["status"];
  output: Record<string, unknown>;
  error: string | null;
  rolledBack: boolean;
}

export function createScaffolderClient(core: ApiCore) {
  return {
    listTemplates: () =>
      core.request<ListResponse<ScaffolderTemplateSummary>>(`/api/scaffolder/templates`),
    getTemplate: (id: string) =>
      core.request<ScaffolderTemplateDetail>(`/api/scaffolder/templates/${encodeURIComponent(id)}`),
    listActions: () => core.request<ListResponse<ScaffolderActionDoc>>(`/api/scaffolder/actions`),
    createPlan: (body: {
      templateId: string;
      params: Record<string, unknown>;
      catalogEntityId?: string;
    }) =>
      core.request<ScaffolderPlan>(`/api/scaffolder/plans`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    getPlan: (id: string) =>
      core.request<ScaffolderPlan>(`/api/scaffolder/plans/${encodeURIComponent(id)}`),
    applyPlan: (id: string, opts: { dryRun?: boolean } = {}) =>
      core.request<ScaffolderApplyResult>(`/api/scaffolder/plans/${encodeURIComponent(id)}/apply`, {
        method: "POST",
        body: JSON.stringify(opts),
      }),
    getTask: (id: string) =>
      core.request<ScaffolderTask>(`/api/scaffolder/tasks/${encodeURIComponent(id)}`),
    taskEventsUrl: (id: string) => `/api/scaffolder/tasks/${encodeURIComponent(id)}/events`,
    listBindings: () => core.request<ListResponse<ScaffolderBinding>>(`/api/scaffolder/bindings`),
    replanBinding: (id: string) =>
      core.request<ScaffolderPlan>(`/api/scaffolder/bindings/${encodeURIComponent(id)}/replan`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
    driftSummary: (filter: { bindingId?: string; templateId?: string } = {}) => {
      const qs = new URLSearchParams();
      if (filter.bindingId) qs.set("bindingId", filter.bindingId);
      if (filter.templateId) qs.set("templateId", filter.templateId);
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      return core.request<ScaffolderDriftSummaryDto>(`/api/scaffolder/drift/summary${suffix}`);
    },
    updateDrift: (id: string, status: "ignored" | "applied" | "superseded") =>
      core.request<{ id: string; status: string }>(
        `/api/scaffolder/drift/${encodeURIComponent(id)}`,
        { method: "PATCH", body: JSON.stringify({ status }) },
      ),
    listTemplateDefs: () =>
      core.request<ListResponse<ScaffolderTemplateDefRow>>(`/api/scaffolder/admin/template-defs`),
    createTemplateDef: (body: { source: string }) =>
      core.request<ScaffolderTemplateDefRow>(`/api/scaffolder/admin/template-defs`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    previewTemplateDef: (body: { source: string }) =>
      core.request<ScaffolderTemplateDefPreview>(`/api/scaffolder/admin/template-defs/preview`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    updateTemplateDef: (id: string, body: { source: string; enabled?: boolean }) =>
      core.request<ScaffolderTemplateDefRow>(
        `/api/scaffolder/admin/template-defs/${encodeURIComponent(id)}`,
        { method: "PUT", body: JSON.stringify(body) },
      ),
    deleteTemplateDef: (id: string) =>
      core.request<void>(`/api/scaffolder/admin/template-defs/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
  };
}

export function useScaffolderApi() {
  const core = useApiCore();
  return useMemo(() => createScaffolderClient(core), [core]);
}
