import type { RouteObject } from "react-router-dom";
import { DoraMetricsPage } from "./DoraMetricsPage";

export const featureRoutes: RouteObject[] = [
  { path: "/dora-metrics", element: <DoraMetricsPage /> },
];
