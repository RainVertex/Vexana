import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "@internal/i18n";
import type { DocSearchHit } from "@internal/shared-types";

export interface DocsSearchBoxProps {
  hits: DocSearchHit[];
  loading: boolean;
  error: string | null;
  onSearch: (q: string) => void;
  onClear: () => void;
  onSelect: (slug: string) => void;
}

export function DocsSearchBox({
  hits,
  loading,
  error,
  onSearch,
  onClear,
  onSelect,
}: DocsSearchBoxProps) {
  const { t } = useTranslation("devdocs");
  const [q, setQ] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!q.trim()) {
      onClear();
      return;
    }
    onSearch(q);
  }

  return (
    <div className="space-y-2">
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("search.placeholder")}
          className="flex-1 rounded border border-app-border bg-app-surface px-2 py-1 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-app-primary px-3 py-1 text-xs font-medium text-app-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {loading ? t("search.searching") : t("search.button")}
        </button>
        <Link
          to={`/search?q=${encodeURIComponent(q)}`}
          className="self-center text-[11px] text-app-text-muted hover:underline"
        >
          {t("search.searchAll")}
        </Link>
      </form>
      {error && <p className="text-xs text-app-danger">{error}</p>}
      {hits.length > 0 && (
        <ul className="rounded border border-app-border bg-app-surface divide-y divide-app-border max-h-60 overflow-auto">
          {hits.map((hit) => (
            <li key={hit.pageId}>
              <button
                type="button"
                onClick={() => onSelect(hit.slug)}
                className="block w-full px-3 py-2 text-left text-xs hover:bg-app-surface-hover"
              >
                <div className="text-app-text font-medium">{hit.title}</div>
                {hit.snippet && (
                  <div className="text-app-text-muted line-clamp-2">{hit.snippet}</div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
