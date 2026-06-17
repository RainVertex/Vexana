import { useEffect, useState } from "react";
import { PageLayout } from "@internal/shared-ui";
import { useTranslation } from "@internal/i18n";
import type { DoraMetricsSnapshot } from "@feature/observability-shared";
import { useDoraMetricsApi } from "./client";

export function DoraMetricsPage() {
  const api = useDoraMetricsApi();
  const { t } = useTranslation("dora-metrics");
  const [items, setItems] = useState<DoraMetricsSnapshot[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .list()
      .then((res) => setItems(res.items))
      .catch((err) => setError(err.message ?? t("errors.loadFailed")));
  }, [api, t]);

  return (
    <PageLayout title={t("page.title")} description={t("page.description")}>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && items === null && <p className="text-sm text-gray-600">{t("status.loading")}</p>}
      {items && items.length === 0 && (
        <p className="text-sm text-gray-600">{t("status.noSnapshots")}</p>
      )}
      {items && items.length > 0 && (
        <ul className="divide-y divide-gray-200">
          {items.map((snapshot) => (
            <li key={snapshot.id} className="py-3 text-sm">
              <div className="text-gray-900">
                {t("snapshot.deploysPerDay")} {snapshot.deployFrequencyPerDay.toFixed(2)} ·{" "}
                {t("snapshot.lead")} {snapshot.leadTimeHours.toFixed(1)}h · {t("snapshot.mttr")}{" "}
                {snapshot.mttrHours.toFixed(1)}h · {t("snapshot.cfr")}{" "}
                {(snapshot.changeFailureRate * 100).toFixed(1)}%
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageLayout>
  );
}
