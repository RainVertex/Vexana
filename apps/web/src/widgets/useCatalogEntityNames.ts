// Hook that loads catalog entities and returns a Map of id to display name.
import { useEffect, useState } from "react";
import { useCatalogApi } from "@feature/catalog-frontend";

export function useCatalogEntityNames(): Map<string, string> {
  const api = useCatalogApi();
  const [names, setNames] = useState<Map<string, string>>(() => new Map());

  useEffect(() => {
    let cancelled = false;
    api
      .list()
      .then((res) => {
        if (cancelled) return;
        const m = new Map<string, string>();
        for (const e of res.items) m.set(e.id, e.name);
        setNames(m);
      })
      .catch(() => {
        // On failure leave the map empty; callers fall back to humanized paths.
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  return names;
}
