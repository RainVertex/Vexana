import type { RouteObject } from "react-router-dom";
import { NotificationsPage } from "./NotificationsPage";

export const featureRoutes: RouteObject[] = [
  { path: "/notifications", element: <NotificationsPage /> },
];
