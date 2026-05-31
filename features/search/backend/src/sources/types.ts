import type { SearchHit } from "@internal/shared-types";

export interface SourceContext {
  userId: string;
  isAdmin: boolean;
}

export type SearchSource = (
  query: string,
  ctx: SourceContext,
  limit: number,
) => Promise<SearchHit[]>;
