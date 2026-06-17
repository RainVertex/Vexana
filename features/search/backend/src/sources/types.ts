import type { SearchHit } from "@feature/search-shared";

export interface SourceContext {
  userId: string;
  isAdmin: boolean;
}

export type SearchSource = (
  query: string,
  ctx: SourceContext,
  limit: number,
) => Promise<SearchHit[]>;
