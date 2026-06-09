import type { ComponentProps } from "react";
import type { RouteObject } from "react-router-dom";
import { AgentsPage } from "./AgentsPage";
import { AgentFormPage } from "./AgentFormPage";
import { AgentDetailPage } from "./AgentDetailPage";
import { AgentRunPage } from "./AgentRunPage";

// avatarPresets is shell-provided (a build-time virtual module), injected by the app shell.
export function featureRoutes(ctx: {
  avatarPresets: ComponentProps<typeof AgentFormPage>["avatarPresets"];
}): RouteObject[] {
  return [
    { path: "/agents", element: <AgentsPage /> },
    { path: "/agents/new", element: <AgentFormPage avatarPresets={ctx.avatarPresets} /> },
    { path: "/agents/:id", element: <AgentDetailPage /> },
    { path: "/agents/:id/edit", element: <AgentFormPage avatarPresets={ctx.avatarPresets} /> },
    { path: "/agents/:id/runs/:runId", element: <AgentRunPage /> },
  ];
}
