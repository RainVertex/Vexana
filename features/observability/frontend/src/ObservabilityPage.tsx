import { useEffect, useState } from "react";
import { PageLayout } from "@internal/shared-ui";
import { useApi } from "@internal/api-client/react";
import type { ServiceHealthSample } from "@internal/shared-types";

export function ObservabilityPage() {
  const api = useApi();
  const [items, setItems] = useState<ServiceHealthSample[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.observability
      .healthSamples()
      .then((res) => setItems(res.items))
      .catch((err) => setError(err.message ?? "Failed to load samples"));
  }, [api]);

  return (
    <PageLayout title="Observability" description="Health samples, latency, error rates.">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && items === null && <p className="text-sm text-gray-600">Loading…</p>}
      {items && items.length === 0 && <p className="text-sm text-gray-600">No samples yet.</p>}
      {items && items.length > 0 && (
        <ul className="divide-y divide-gray-200">
          {items.map((sample) => (
            <li key={sample.id} className="py-3 text-sm">
              <span className="font-medium">{sample.status}</span>
              {sample.latencyMs != null && (
                <span className="ml-2 text-gray-500">{sample.latencyMs}ms</span>
              )}
              {sample.errorRate != null && (
                <span className="ml-2 text-gray-500">
                  err {(sample.errorRate * 100).toFixed(2)}%
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </PageLayout>
  );
}
