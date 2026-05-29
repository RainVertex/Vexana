import { useEffect, useState } from "react";
import { useApi } from "@internal/api-client/react";

export interface RequestsSummary {
  myRequestsPending: number;
  myApprovalsPending: number;
  /** True if the user is admin or a current lead of any team. */
  canApprove: boolean;
}

const POLL_INTERVAL_MS = 30_000;

/** Polls the `/api/requests/pending-summary` endpoint. */
export function useRequestsSummary(): RequestsSummary | null {
  const api = useApi();
  const [summary, setSummary] = useState<RequestsSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const next = await api.requests.pendingSummary();
        if (!cancelled) setSummary(next);
      } catch {
        // best-effort. keep last good value
      }
    }
    void tick();
    const handle = setInterval(() => void tick(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  }, [api]);

  return summary;
}
