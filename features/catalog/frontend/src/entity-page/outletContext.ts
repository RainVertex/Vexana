import { useOutletContext } from "react-router-dom";
import type { CatalogEntityOverview } from "@internal/shared-types";

export interface EntityOutletContext {
  data: CatalogEntityOverview;
  reload: () => void;
}

export function useEntityContext(): EntityOutletContext {
  return useOutletContext<EntityOutletContext>();
}
