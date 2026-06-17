import type { ID } from "@internal/shared-types";

export interface SearchHit {
  id: ID;
  kind: "catalog" | "team" | "agent" | "devdoc" | "project" | "task" | "chat" | "page";
  title: string;
  snippet?: string;
  // For devdoc hits, routes to the entity's docs tab and page slug.
  href?: string;
  // Relevance score used to rank hits; clients may ignore it.
  score?: number;
}

export interface SearchResults {
  query: string;
  hits: SearchHit[];
}
