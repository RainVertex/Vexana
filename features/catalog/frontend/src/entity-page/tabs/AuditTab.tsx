import { useEffect, useState } from "react";
import { useApi } from "@internal/api-client/react";
import { useTranslation } from "@internal/i18n";
import type { AuditEventRow } from "@internal/shared-types";
import { useEntityContext } from "../outletContext";

export function AuditTab() {
  const { data } = useEntityContext();
  const api = useApi();
  const { t } = useTranslation("catalog");
  const [rows, setRows] = useState<AuditEventRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.catalog
      .auditFor(data.entity.id, 200)
      .then((res) => {
        if (!cancelled) setRows(res.items);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : t("errors.generic"));
      });
    return () => {
      cancelled = true;
    };
  }, [api, data.entity.id, t]);

  if (error) return <p className="text-sm text-app-danger">{error}</p>;
  if (!rows) return <p className="text-sm text-app-text-muted">{t("audit.loading")}</p>;
  if (rows.length === 0) {
    return <p className="text-sm text-app-text-muted">{t("audit.noEvents")}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-app-border bg-app-surface">
      <table className="w-full text-sm">
        <thead className="border-b border-app-border">
          <tr className="text-left text-xs uppercase tracking-wide text-app-text-muted">
            <th className="px-4 py-3">{t("audit.colWhen")}</th>
            <th className="px-4 py-3">{t("audit.colKind")}</th>
            <th className="px-4 py-3">{t("audit.colActor")}</th>
            <th className="px-4 py-3">{t("audit.colPayload")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id} className="border-t border-app-border align-top">
              <td className="px-4 py-3 text-app-text-muted whitespace-nowrap">
                {new Date(e.createdAt).toLocaleString()}
                {e.requestId && (
                  <div className="text-xs text-app-text-muted">
                    {t("audit.requestId", { id: e.requestId })}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 font-mono text-xs">{e.kind}</td>
              <td className="px-4 py-3">
                {e.actor ? (
                  e.actor.displayName
                ) : (
                  <span className="text-app-text-muted">{t("audit.system")}</span>
                )}
              </td>
              <td className="px-4 py-3">
                <pre className="text-xs text-app-text-muted whitespace-pre-wrap break-all max-w-md">
                  {JSON.stringify(e.payload, null, 0)}
                </pre>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
