import { createContext, useContext, useMemo, type PropsWithChildren } from "react";
import { createApiClient, createApiCore, type ApiClient, type ApiCore } from "./index";

const ApiContext = createContext<ApiClient | null>(null);
const ApiCoreContext = createContext<ApiCore | null>(null);

export interface ApiProviderProps extends PropsWithChildren {
  baseUrl?: string;
}

export function ApiProvider({ baseUrl = "", children }: ApiProviderProps) {
  const client = useMemo(() => createApiClient({ baseUrl }), [baseUrl]);
  const core = useMemo(() => createApiCore({ baseUrl }), [baseUrl]);
  return (
    <ApiCoreContext.Provider value={core}>
      <ApiContext.Provider value={client}>{children}</ApiContext.Provider>
    </ApiCoreContext.Provider>
  );
}

export function useApi(): ApiClient {
  const client = useContext(ApiContext);
  if (!client) throw new Error("useApi must be used inside <ApiProvider>");
  return client;
}

export function useApiCore(): ApiCore {
  const core = useContext(ApiCoreContext);
  if (!core) throw new Error("useApiCore must be used inside <ApiProvider>");
  return core;
}
