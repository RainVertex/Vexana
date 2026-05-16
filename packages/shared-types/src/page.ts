import type { ID, ISODateString } from "./common";

export type PageSection =
  | "catalog"
  | "selfservice"
  | "requests"
  | "workspace"
  | "teams"
  | "observability"
  | "admin"
  | "agents";

export type PageType = "LINK" | "DASHBOARD";
export type PageScope = "PERSONAL" | "SHARED";

/** Single widget on a dashboard page. */
export interface PageWidgetInstance {
  i: string;
  widgetId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  config?: Record<string, unknown>;
}

export interface PageDto {
  id: ID;
  ownerUserId: ID;
  section: PageSection;
  parentId: ID | null;
  title: string;
  icon: string | null;
  // Null for DASHBOARD pages and folders. LINK pages always have a url.
  url: string | null;
  order: number;
  isFolder: boolean;
  type: PageType;
  scope: PageScope;
  // Populated for DASHBOARD pages; null otherwise.
  layout: PageWidgetInstance[] | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
