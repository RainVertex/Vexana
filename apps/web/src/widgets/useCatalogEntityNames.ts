import { useEffect, useState } from "react";
import { useApi } from "@internal/api-client/react";

/** Returns a Map of catalog-entity id → display name. */
export function useCatalogEntityNames(): Map<string, string> {
  const api = useApi();
  const [names, setNames] = useState<Map<string, string>>(() => new Map());

  useEffect(() => {
    let cancelled = false;
    api.catalog
      .list()
      .then((res) => {
        if (cancelled) return;
        const m = new Map<string, string>();
        for (const e of res.items) m.set(e.id, e.name);
        setNames(m);
      })
      .catch(() => {
        // Fall through with an empty map; formatPath uses its default
        // humanization when no name is found.
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  return names;
}
