import { useCallback, useEffect, useState } from "react";
import { useApi } from "@internal/api-client/react";
import type { PlaneOAuthStatusDto } from "@internal/shared-types";

export function PlaneOAuthCard() {
  const api = useApi();
  const [status, setStatus] = useState<PlaneOAuthStatusDto | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setStatus(await api.workspace.getMyPlaneOAuth());
    } catch {
      // hide card on error
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!status || !status.integrationId) return null;

  const disconnect = async () => {
    setBusy(true);
    try {
      await api.workspace.disconnectPlaneOAuth();
      await load();
    } finally {
      setBusy(false);
    }
  };

  const connect = () => {
    window.location.href = `/auth/plane?integrationId=${encodeURIComponent(status.integrationId!)}&returnUrl=/settings`;
  };

  return (
    <section className="rounded-xl border border-app-border bg-app-surface p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-app-text">Plane account</h2>
        <p className="mt-1 text-sm text-app-text-muted">
          Link your Plane identity so work items you create are attributed to you.
        </p>
      </div>

      {status.connected ? (
        <div className="flex items-center justify-between">
          <span className="text-sm text-app-text">
            Connected as <span className="font-medium">{status.planeEmail}</span>
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => void disconnect()}
            className="text-sm text-app-text-muted hover:text-app-danger transition-colors disabled:opacity-50"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={connect}
          className="inline-flex items-center rounded-md bg-app-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-app-primary-hover transition-colors"
        >
          Connect to Plane
        </button>
      )}
    </section>
  );
}
