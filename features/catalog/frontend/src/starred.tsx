import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { useCatalogApi } from "./client";

interface StarredContextValue {
  starredIds: string[];
  loading: boolean;
  toggle: (id: string) => void;
  isStarred: (id: string) => boolean;
}

const StarredContext = createContext<StarredContextValue | null>(null);

export function StarredProvider({ children }: PropsWithChildren) {
  const api = useCatalogApi();
  const [ids, setIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .listStars()
      .then((res) => {
        if (!cancelled) setIds(res.items);
      })
      .catch((err) => {
        if (!cancelled) console.error("Failed to load starred entities", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  const toggle = useCallback(
    (id: string) => {
      const wasStarred = ids.includes(id);
      setIds((prev) => (wasStarred ? prev.filter((x) => x !== id) : [...prev, id]));
      const op = wasStarred ? api.unstar(id) : api.star(id);
      op.catch((err) => {
        console.error("Failed to toggle star", err);
        setIds((prev) =>
          wasStarred ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id),
        );
      });
    },
    [api, ids],
  );

  const isStarred = useCallback((id: string) => ids.includes(id), [ids]);

  const value = useMemo<StarredContextValue>(
    () => ({ starredIds: ids, loading, toggle, isStarred }),
    [ids, loading, toggle, isStarred],
  );
  return <StarredContext.Provider value={value}>{children}</StarredContext.Provider>;
}

export function useStarred(): StarredContextValue {
  const ctx = useContext(StarredContext);
  if (!ctx) throw new Error("useStarred must be used inside <StarredProvider>");
  return ctx;
}
