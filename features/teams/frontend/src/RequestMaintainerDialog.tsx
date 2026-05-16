import { useEffect, useState } from "react";
import { useApi } from "@internal/api-client/react";
import type { MaintainerRequestDto } from "@internal/shared-types";

interface RequestMaintainerDialogProps {
  open: boolean;
  teamSlug: string;
  teamName: string;
  onClose: () => void;
  onSubmitted: (request: MaintainerRequestDto) => void;
}

export function RequestMaintainerDialog({
  open,
  teamSlug,
  teamName,
  onClose,
  onSubmitted,
}: RequestMaintainerDialogProps) {
  const api = useApi();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setReason("");
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.maintainerRequests.submit({
        teamSlug,
        reason: reason.trim() || undefined,
      });
      onSubmitted(res);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-app-border bg-app-surface p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-app-text">Request to become a maintainer</h2>
        <p className="mt-1 text-xs text-app-text-muted">
          Submit a request for an admin or a current maintainer of <b>{teamName}</b> to review.
          You&apos;ll be notified when the request is approved or rejected.
        </p>

        <div className="mt-4 space-y-3 text-sm">
          <label className="block">
            <span className="text-xs text-app-text-muted">Why? (optional)</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={busy}
              rows={4}
              maxLength={1000}
              placeholder="Context that will help the approver decide."
              className="mt-1 w-full rounded-md border border-app-border bg-app-surface px-2 py-1 text-app-text"
            />
          </label>
          {error && <div className="text-xs text-app-danger">{error}</div>}
        </div>

        <div className="mt-5 flex justify-end gap-2 text-sm">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md px-3 py-1 text-app-text-muted hover:bg-app-surface-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={busy}
            className="rounded-md bg-app-primary px-3 py-1 text-app-primary-on disabled:opacity-50"
          >
            {busy ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
