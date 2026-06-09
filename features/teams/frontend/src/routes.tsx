import { Navigate, type RouteObject } from "react-router-dom";
import { TeamsPage } from "./TeamsPage";
import { TeamDetailPage } from "./TeamDetailPage";
import { AdminTeamRequestsPage } from "./AdminTeamRequestsPage";
import { AdminTeamPoliciesPage } from "./AdminTeamPoliciesPage";
import { RequestTeamPage } from "./RequestTeamPage";
import { RequestMaintainerPickerPage } from "./RequestMaintainerPickerPage";

export const featureRoutes: RouteObject[] = [
  { path: "/teams", element: <TeamsPage /> },
  { path: "/teams/requests", element: <Navigate to="/requests/team" replace /> },
  { path: "/teams/maintainer-requests", element: <Navigate to="/requests/team" replace /> },
  { path: "/teams/maintainer-approvals", element: <Navigate to="/approvals/team" replace /> },
  { path: "/teams/:slug", element: <TeamDetailPage /> },
  { path: "/self-service/request-team", element: <RequestTeamPage /> },
  { path: "/self-service/request-maintainer", element: <RequestMaintainerPickerPage /> },
  { path: "/admin/team-requests", element: <AdminTeamRequestsPage /> },
  { path: "/admin/team-policies", element: <AdminTeamPoliciesPage /> },
];
