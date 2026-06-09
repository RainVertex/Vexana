import type { RouteObject } from "react-router-dom";
import { CatalogPage } from "./CatalogPage";
import { CatalogEntityPage } from "./entity-page/CatalogEntityPage";
import { OverviewTab } from "./entity-page/tabs/OverviewTab";
import { RelatedTab } from "./entity-page/tabs/RelatedTab";
import { ScorecardsTab } from "./entity-page/tabs/ScorecardsTab";
import { DocsTab } from "./entity-page/tabs/DocsTab";
import { ApisTab } from "./entity-page/tabs/ApisTab";
import { RunsTab } from "./entity-page/tabs/RunsTab";
import { AuditTab } from "./entity-page/tabs/AuditTab";

export const featureRoutes: RouteObject[] = [
  { path: "/catalog", element: <CatalogPage /> },
  {
    path: "/catalog/:id",
    element: <CatalogEntityPage />,
    children: [
      { index: true, element: <OverviewTab /> },
      { path: "related", element: <RelatedTab /> },
      { path: "scorecards", element: <ScorecardsTab /> },
      { path: "docs", element: <DocsTab /> },
      { path: "apis", element: <ApisTab /> },
      { path: "runs", element: <RunsTab /> },
      { path: "audit", element: <AuditTab /> },
    ],
  },
];
