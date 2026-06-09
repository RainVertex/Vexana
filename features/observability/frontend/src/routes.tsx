import type { RouteObject } from "react-router-dom";
import { ObservabilityPage } from "./ObservabilityPage";
import { ObservabilityConfigPage } from "./ObservabilityConfigPage";

export const featureRoutes: RouteObject[] = [
  { path: "/observability", element: <ObservabilityPage /> },
  { path: "/observability/config", element: <ObservabilityConfigPage /> },
];
