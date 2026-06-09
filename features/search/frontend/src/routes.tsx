import type { RouteObject } from "react-router-dom";
import { SearchPage } from "./SearchPage";

export const featureRoutes: RouteObject[] = [{ path: "/search", element: <SearchPage /> }];
