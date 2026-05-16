import { useEffect, useState } from "react";
import type { MaintainerRequestDto } from "@internal/shared-types";

export interface RejectMaintainerRequestDialogProps {
  open: boolean;
  submitting: boolean;
  request: MaintainerRequestDto | null;
  onSubmit: (reason: string) => void;
  onClose: () => void;
}

export function RejectMaintainerRequestDialog({
  open,
  submitting,
  request,
  onSubmit,
  onClose,
}: RejectMaintainerRequestDialogProps) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  if (!open) return null;

  const trimmed = reason.trim();
  const canSubmit = trimmed.length > 0 && !submitting;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-app-border bg-app-surface p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-2 text-sm font-semibold text-app-text">
          Reject maintainer request
          {request ? `: ${request.requestedBy.displayName} → ${request.teamName}` : ""}
        </h3>
        <p className="mb-3 text-xs text-app-text-muted">
          The requester will be notified with the reason you provide.
        </p>
        <textarea
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          className="mb-3 w-full rounded border border-app-border bg-app-surface-hover px-2 py-1.5 text-sm"
          placeholder="Why is this request being rejected?"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1.5 text-sm text-app-text-muted hover:bg-app-surface-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => canSubmit && onSubmit(trimmed)}
            disabled={!canSubmit}
            className="rounded-md bg-app-primary px-3 py-1.5 text-sm font-medium text-app-primary-on hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Rejecting…" : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}
