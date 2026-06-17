import { useMemo } from "react";
import { useApiCore } from "@internal/api-client/react";
import type { ApiCore, ListResponse } from "@internal/api-client";
import type { UserTaskDto } from "@feature/onboarding-shared";

export function createOnboardingClient(core: ApiCore) {
  return {
    listTasks: () => core.request<ListResponse<UserTaskDto>>(`/api/onboarding/tasks`),
    completeTask: (id: string) =>
      core.request<UserTaskDto>(`/api/onboarding/tasks/${encodeURIComponent(id)}/complete`, {
        method: "POST",
      }),
    dismissTask: (id: string) =>
      core.request<UserTaskDto>(`/api/onboarding/tasks/${encodeURIComponent(id)}/dismiss`, {
        method: "POST",
      }),
  };
}

export function useOnboardingApi() {
  const core = useApiCore();
  return useMemo(() => createOnboardingClient(core), [core]);
}
