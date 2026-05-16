import { useEffect, useState } from "react";
import { PageLayout } from "@internal/shared-ui";
import { useApi } from "@internal/api-client/react";
import type { DoraMetricsSnapshot } from "@internal/shared-types";

export function DoraMetricsPage() {
  const api = useApi();
  const [items, setItems] = useState<DoraMetricsSnapshot[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.doraMetrics
      .list()
      .then((res) => setItems(res.items))
      .catch((err) => setError(err.message ?? "Failed to load metrics"));
  }, [api]);

  return (
    <PageLayout
      title="DORA Metrics"
      description="Deploy frequency, lead time, MTTR, change failure rate."
    >
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && items === null && <p className="text-sm text-gray-600">Loading…</p>}
      {items && items.length === 0 && <p className="text-sm text-gray-600">No snapshots yet.</p>}
      {items && items.length > 0 && (
        <ul className="divide-y divide-gray-200">
          {items.map((snapshot) => (
            <li key={snapshot.id} className="py-3 text-sm">
              <div className="text-gray-900">
                Deploys/day {snapshot.deployFrequencyPerDay.toFixed(2)} · Lead{" "}
                {snapshot.leadTimeHours.toFixed(1)}h · MTTR {snapshot.mttrHours.toFixed(1)}h · CFR{" "}
                {(snapshot.changeFailureRate * 100).toFixed(1)}%
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageLayout>
  );
}
