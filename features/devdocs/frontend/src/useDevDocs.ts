import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@internal/i18n";
import { useApi } from "@internal/api-client/react";
import type {
  DocCommentRow,
  DocPageDetail,
  DocSearchHit,
  DocsTabResponse,
} from "@internal/shared-types";

export interface UseDocsListResult {
  data: DocsTabResponse | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

export function useDocsList(entityId: string): UseDocsListResult {
  const api = useApi();
  const { t } = useTranslation("devdocs");
  const [data, setData] = useState<DocsTabResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    api.devdocs
      .list(entityId)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t("errors.failedLoadDocs"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, entityId, t]);

  useEffect(() => load(), [load]);
  return { data, error, loading, reload: load };
}

export interface UseDocPageResult {
  page: DocPageDetail | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

export function useDocPage(entityId: string, slug: string | null): UseDocPageResult {
  const api = useApi();
  const { t } = useTranslation("devdocs");
  const [page, setPage] = useState<DocPageDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!slug) {
      setPage(null);
      setError(null);
      setLoading(false);
      return () => {};
    }
    let cancelled = false;
    setLoading(true);
    api.devdocs
      .get(entityId, slug)
      .then((res) => {
        if (cancelled) return;
        setPage(res);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t("errors.failedLoadPage"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, entityId, slug, t]);

  useEffect(() => load(), [load]);
  return { page, error, loading, reload: load };
}

export interface UseCommentsResult {
  items: DocCommentRow[];
  error: string | null;
  loading: boolean;
  post: (body: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reload: () => void;
}

export function useComments(pageId: string | null): UseCommentsResult {
  const api = useApi();
  const { t } = useTranslation("devdocs");
  const [items, setItems] = useState<DocCommentRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!pageId) {
      setItems([]);
      return;
    }
    setLoading(true);
    api.devdocs
      .listComments(pageId)
      .then((res) => {
        setItems(res.items);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : t("errors.failedLoadComments")))
      .finally(() => setLoading(false));
  }, [api, pageId, t]);

  useEffect(() => load(), [load]);

  const post = useCallback(
    async (body: string) => {
      if (!pageId) return;
      const created = await api.devdocs.postComment(pageId, { body });
      setItems((current) => [...current, created]);
    },
    [api, pageId],
  );

  const remove = useCallback(
    async (id: string) => {
      await api.devdocs.deleteComment(id);
      setItems((current) => current.filter((c) => c.id !== id));
    },
    [api],
  );

  return { items, error, loading, post, remove, reload: load };
}

export interface UseDocsSearchResult {
  hits: DocSearchHit[];
  error: string | null;
  loading: boolean;
  search: (q: string) => Promise<void>;
  clear: () => void;
}

export function useDocsSearch(entityId: string | undefined): UseDocsSearchResult {
  const api = useApi();
  const { t } = useTranslation("devdocs");
  const [hits, setHits] = useState<DocSearchHit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const search = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) {
        setHits([]);
        return;
      }
      setLoading(true);
      try {
        const res = await api.devdocs.search(trimmed, { entityId, limit: 20 });
        setHits(res.hits);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("errors.searchFailed"));
      } finally {
        setLoading(false);
      }
    },
    [api, entityId, t],
  );

  const clear = useCallback(() => {
    setHits([]);
    setError(null);
  }, []);

  return { hits, error, loading, search, clear };
}
