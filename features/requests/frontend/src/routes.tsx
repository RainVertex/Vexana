import type { RouteObject } from "react-router-dom";
import { MyRequestsTeamPage } from "./MyRequestsTeamPage";
import { MyApprovalsTeamPage } from "./MyApprovalsTeamPage";

export const featureRoutes: RouteObject[] = [
  { path: "/requests/team", element: <MyRequestsTeamPage /> },
  { path: "/approvals/team", element: <MyApprovalsTeamPage /> },
];
