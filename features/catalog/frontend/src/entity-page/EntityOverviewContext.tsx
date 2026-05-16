import { createContext, useContext, type PropsWithChildren } from "react";
import type { CatalogEntityOverview } from "@internal/shared-types";

interface EntityOverviewContextValue {
  data: CatalogEntityOverview;
  reload: () => void;
}

const EntityOverviewContext = createContext<EntityOverviewContextValue | null>(null);

interface EntityOverviewProviderProps extends PropsWithChildren {
  value: EntityOverviewContextValue;
}

export function EntityOverviewProvider({ value, children }: EntityOverviewProviderProps) {
  return <EntityOverviewContext.Provider value={value}>{children}</EntityOverviewContext.Provider>;
}

export function useEntityOverviewContext(): EntityOverviewContextValue {
  const ctx = useContext(EntityOverviewContext);
  if (!ctx) {
    throw new Error("useEntityOverviewContext must be used inside EntityOverviewProvider");
  }
  return ctx;
}
