import type { RouteObject } from "react-router-dom";
import { WebhookSettingsPage } from "./WebhookSettingsPage";

export const featureRoutes: RouteObject[] = [
  { path: "/settings/webhooks", element: <WebhookSettingsPage scope="user" /> },
  { path: "/teams/:slug/webhooks", element: <WebhookSettingsPage scope="team" /> },
];
