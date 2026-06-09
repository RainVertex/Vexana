import type { RouteObject } from "react-router-dom";
import { ScorecardsPage } from "./ScorecardsPage";
import { ScorecardEditPage } from "./ScorecardEditPage";
import { ScorecardReportPage } from "./ScorecardReportPage";

export const featureRoutes: RouteObject[] = [
  { path: "/scorecards", element: <ScorecardsPage /> },
  { path: "/scorecards/:id", element: <ScorecardEditPage /> },
  { path: "/scorecards/:id/report", element: <ScorecardReportPage /> },
];
