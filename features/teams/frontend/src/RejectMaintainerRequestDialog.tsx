import { useEffect, useState } from "react";
import { useTranslation } from "@internal/i18n";
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
  const { t } = useTranslation("teams");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  if (!open) return null;

  const trimmed = reason.trim();
  const canSubmit = trimmed.length > 0 && !submitting;

  const title = request
    ? t("dialogs.rejectMaintainerRequestTitleWithInfo", {
        requester: request.requestedBy.displayName,
        team: request.teamName,
      })
    : t("dialogs.rejectMaintainerRequestTitle");

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
        <h3 className="mb-2 text-sm font-semibold text-app-text">{title}</h3>
        <p className="mb-3 text-xs text-app-text-muted">{t("dialogs.rejectNotification")}</p>
        <textarea
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          className="mb-3 w-full rounded border border-app-border bg-app-surface-hover px-2 py-1.5 text-sm"
          placeholder={t("form.reasonPlaceholder")}
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1.5 text-sm text-app-text-muted hover:bg-app-surface-hover"
          >
            {t("actions.cancel")}
          </button>
          <button
            type="button"
            onClick={() => canSubmit && onSubmit(trimmed)}
            disabled={!canSubmit}
            className="rounded-md bg-app-primary px-3 py-1.5 text-sm font-medium text-app-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? t("actions.rejecting") : t("actions.reject")}
          </button>
        </div>
      </div>
    </div>
  );
}
