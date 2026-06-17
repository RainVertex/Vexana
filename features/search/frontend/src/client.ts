import { useMemo } from "react";
import { useApiCore } from "@internal/api-client/react";
import type { ApiCore } from "@internal/api-client";
import type { SearchResults } from "@feature/search-shared";

export function createSearchClient(core: ApiCore) {
  return {
    query: (q: string) => core.request<SearchResults>(`/api/search?q=${encodeURIComponent(q)}`),
  };
}

export function useSearchApi() {
  const core = useApiCore();
  return useMemo(() => createSearchClient(core), [core]);
}
