import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "@internal/api-client/react";
import { useTranslation } from "@internal/i18n";
import type { CatalogRelation, CatalogRelationsResponse } from "@internal/shared-types";
import { useEntityContext } from "../outletContext";
import { LifecycleBadge } from "../../catalog-table/cells";

const API_TYPES = new Set(["consumesApi", "providesApi", "apiConsumedBy", "apiProvidedBy"]);

export function ApisTab() {
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
  if (!rels) return <p className="text-sm text-app-text-muted">{t("apis.loading")}</p>;

  const apis: Array<CatalogRelation & { direction: string }> = [];
  for (const r of rels.outgoing) {
    if (r.target?.kind !== "api") continue;
    if (r.type === "consumesApi") apis.push({ ...r, direction: t("apis.directionConsumes") });
    if (r.type === "providesApi") apis.push({ ...r, direction: t("apis.directionProvides") });
  }
  for (const r of rels.incoming) {
    if (r.target?.kind !== "api" || !API_TYPES.has(r.type as string)) continue;
    apis.push({
      ...r,
      direction:
        r.type === "apiConsumedBy" ? t("apis.directionConsumes") : t("apis.directionProvides"),
    });
  }

  if (apis.length === 0) {
    return <p className="text-sm text-app-text-muted">{t("apis.noApis")}</p>;
  }

  return (
    <section className="rounded-lg border border-app-border bg-app-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-app-text-muted">
            <th className="px-4 py-2 font-medium">{t("apis.colDirection")}</th>
            <th className="px-4 py-2 font-medium">{t("apis.colApi")}</th>
            <th className="px-4 py-2 font-medium">{t("apis.colLifecycle")}</th>
          </tr>
        </thead>
        <tbody>
          {apis.map((r, i) => (
            <tr key={`${r.rawRef}-${i}`} className="border-t border-app-border">
              <td className="px-4 py-2 text-app-text">{r.direction}</td>
              <td className="px-4 py-2">
                {r.target ? (
                  <Link
                    to={`/catalog/${r.target.id}`}
                    className="text-app-primary-on hover:underline"
                  >
                    {r.target.name}
                  </Link>
                ) : (
                  <span className="text-app-text-muted">{r.rawRef}</span>
                )}
              </td>
              <td className="px-4 py-2">
                {r.target && <LifecycleBadge value={r.target.lifecycle} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
