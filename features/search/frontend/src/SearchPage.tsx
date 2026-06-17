// Global search page: runs queries against the search API and renders linked hits grouped by kind.
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageLayout } from "@internal/shared-ui";
import { useSearchApi } from "./client";
import type { SearchHit, SearchResults } from "@feature/search-shared";
import { useTranslation } from "@internal/i18n";

type Kind = SearchHit["kind"];

// Order groups are listed in; the user's own work surfaces before broader catalog content.
const KIND_ORDER: Kind[] = [
  "project",
  "task",
  "catalog",
  "team",
  "page",
  "chat",
  "agent",
  "devdoc",
];

function hrefFor(hit: SearchHit): string | null {
  if (hit.href) return hit.href;
  switch (hit.kind) {
    case "catalog":
      return `/catalog/${hit.id}`;
    case "project":
      return `/projects/${hit.id}`;
    case "task":
      return `/tasks/${hit.id}`;
    case "chat":
      return `/chat/${hit.id}`;
    case "page":
      return `/p/${hit.id}`;
    case "agent":
      return `/agents/${hit.id}`;
    case "team":
      return `/teams`;
    case "devdoc":
      return `/devdocs`;
    default:
      return null;
  }
}

function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function groupByKind(hits: SearchHit[]): Array<{ kind: Kind; hits: SearchHit[] }> {
  const buckets = new Map<Kind, SearchHit[]>();
  for (const hit of hits) {
    const list = buckets.get(hit.kind) ?? [];
    list.push(hit);
    buckets.set(hit.kind, list);
  }
  return KIND_ORDER.filter((kind) => buckets.has(kind)).map((kind) => ({
    kind,
    hits: buckets.get(kind)!,
  }));
}

export function SearchPage() {
  const { t } = useTranslation("search");
  const api = useSearchApi();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function execute(q: string) {
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      setResults(await api.query(q));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.searchFailed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialQuery) execute(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearchParams({ q });
    await execute(q);
  }

  const groups = results ? groupByKind(results.hits) : [];

  return (
    <PageLayout title={t("page.title")} description={t("page.description")}>
      <form onSubmit={run} className="flex gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("form.placeholder")}
          className="flex-1 rounded-lg border border-app-border bg-app-bg px-3 py-1.5 text-sm text-app-text placeholder:text-app-text-muted focus:outline-none focus:ring-2 focus:ring-app-primary focus:border-transparent"
        />
        <button
          type="submit"
          className="rounded-lg bg-app-primary px-3 py-1.5 text-sm font-medium text-app-primary-foreground hover:bg-app-primary-hover disabled:opacity-50"
          disabled={loading}
        >
          {loading ? t("form.submitting") : t("form.submit")}
        </button>
      </form>

      {error && <p className="text-sm text-app-danger">{error}</p>}

      {results && results.hits.length === 0 && (
        <p className="text-sm text-app-text-muted">
          {t("empty.noResults", { query: results.query })}
        </p>
      )}

      {groups.length > 0 && (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.kind}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                {t(`sections.${group.kind}`)}
              </h2>
              <ul className="divide-y divide-app-border border-t border-app-border">
                {group.hits.map((hit) => {
                  const href = hrefFor(hit);
                  let titleNode: ReactNode = (
                    <span className="font-medium text-app-text">{hit.title}</span>
                  );
                  if (href && isExternal(href)) {
                    titleNode = (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-app-text hover:text-app-primary hover:underline"
                      >
                        {hit.title}
                      </a>
                    );
                  } else if (href) {
                    titleNode = (
                      <Link
                        to={href}
                        className="font-medium text-app-text hover:text-app-primary hover:underline"
                      >
                        {hit.title}
                      </Link>
                    );
                  }
                  return (
                    <li key={`${hit.kind}:${hit.id}`} className="py-3">
                      <div>{titleNode}</div>
                      <div className="text-xs text-app-text-muted">{t(`kinds.${hit.kind}`)}</div>
                      {hit.snippet && <p className="mt-1 text-sm text-app-text">{hit.snippet}</p>}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
