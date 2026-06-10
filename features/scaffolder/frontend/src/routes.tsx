import type { RouteObject } from "react-router-dom";
import { ScaffolderPage } from "./ScaffolderPage";
import { TemplatePage } from "./TemplatePage";
import { PlanPage } from "./PlanPage";
import { TaskPage } from "./TaskPage";
import { BindingsPage } from "./BindingsPage";
import { TemplateEditorPage } from "./TemplateEditorPage";

export const featureRoutes: RouteObject[] = [
  { path: "/scaffolder", element: <ScaffolderPage /> },
  { path: "/scaffolder/bindings", element: <BindingsPage /> },
  { path: "/scaffolder/editor", element: <TemplateEditorPage /> },
  { path: "/scaffolder/plans/:planId", element: <PlanPage /> },
  { path: "/scaffolder/tasks/:taskId", element: <TaskPage /> },
  { path: "/scaffolder/:templateId", element: <TemplatePage /> },
];
