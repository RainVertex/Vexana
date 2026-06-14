import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "@internal/api-client/react";
import { useTranslation } from "@internal/i18n";
import type { CatalogRelation, CatalogRelationsResponse } from "@internal/shared-types";
import { useEntityContext } from "../outletContext";
import { KindBadge, LifecycleBadge } from "../../catalog-table/cells";

function RelationsTable({ title, rows }: { title: string; rows: CatalogRelation[] }) {
  const { t } = useTranslation("catalog");
  if (rows.length === 0) {
    return (
      <section className="rounded-lg border border-app-border bg-app-surface p-4">
        <h2 className="text-sm font-semibold text-app-text mb-2">{title}</h2>
        <p className="text-sm text-app-text-muted">{t("related.none")}</p>
      </section>
    );
  }
  return (
    <section className="rounded-lg border border-app-border bg-app-surface">
      <h2 className="text-sm font-semibold text-app-text px-4 py-3 border-b border-app-border">
        {title} ({rows.length})
      </h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-app-text-muted">
            <th className="px-4 py-2 font-medium">{t("related.colType")}</th>
            <th className="px-4 py-2 font-medium">{t("related.colTarget")}</th>
            <th className="px-4 py-2 font-medium">{t("related.colKind")}</th>
            <th className="px-4 py-2 font-medium">{t("related.colLifecycle")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.type}-${r.rawRef}-${i}`} className="border-t border-app-border">
              <td className="px-4 py-2 text-app-text">{r.type}</td>
              <td className="px-4 py-2">
                {r.target ? (
                  <Link to={`/catalog/${r.target.id}`} className="text- hover:underline">
                    {r.target.name}
                  </Link>
                ) : (
                  <span className="text-app-text-muted">
                    {t("related.unresolved", { ref: r.rawRef })}
                  </span>
                )}
              </td>
              <td className="px-4 py-2">
                {r.target ? <KindBadge value={r.target.kind} /> : <span>—</span>}
              </td>
              <td className="px-4 py-2">
                {r.target ? <LifecycleBadge value={r.target.lifecycle} /> : <span>—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function RelatedTab() {
  const { data } = useEntityContext();
  const api = useApi();
  const { t } = useTranslation("catalog");
  const [rels, setRels] = useState<CatalogRelationsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.catalog
      .relations(data.entity.id)
      .then((res) => {
        if (!cancelled) setRels(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : t("errors.generic"));
      });
    return () => {
      cancelled = true;
    };
  }, [api, data.entity.id, t]);

  if (error) return <p className="text-sm text-app-danger">{error}</p>;
  if (!rels) return <p className="text-sm text-app-text-muted">{t("related.loading")}</p>;
  if (rels.outgoing.length === 0 && rels.incoming.length === 0) {
    return <p className="text-sm text-app-text-muted">{t("related.noRelations")}</p>;
  }
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <RelationsTable title={t("related.outgoing")} rows={rels.outgoing} />
      <RelationsTable title={t("related.incoming")} rows={rels.incoming} />
    </div>
  );
}
