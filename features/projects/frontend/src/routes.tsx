import type { RouteObject } from "react-router-dom";
import { ProjectsPage } from "./ProjectsPage";
import { ProjectDetailPage } from "./ProjectDetailPage";
import { TaskDetailPage } from "./TaskDetailPage";

export const featureRoutes: RouteObject[] = [
  { path: "/projects", element: <ProjectsPage /> },
  { path: "/projects/:id", element: <ProjectDetailPage /> },
  { path: "/tasks/:id", element: <TaskDetailPage /> },
];
