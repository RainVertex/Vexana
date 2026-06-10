import { useState } from "react";
import { useTranslation } from "@internal/i18n";

export interface ReportStaleDialogProps {
  open: boolean;
  submitting: boolean;
  onSubmit: (reason: string) => void;
  onClose: () => void;
}

export function ReportStaleDialog({ open, submitting, onSubmit, onClose }: ReportStaleDialogProps) {
  const { t } = useTranslation("devdocs");
  const [reason, setReason] = useState("");
  if (!open) return null;
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
        <h3 className="text-sm font-semibold text-app-text mb-2">{t("reportDialog.title")}</h3>
        <p className="text-xs text-app-text-muted mb-3">{t("reportDialog.description")}</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          className="mb-3 w-full rounded border border-app-border bg-app-surface-hover px-2 py-1.5 text-sm"
          placeholder={t("reportDialog.placeholder")}
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1.5 text-sm text-app-text-muted hover:bg-app-surface-hover"
          >
            {t("reportDialog.cancel")}
          </button>
          <button
            type="button"
            onClick={() => onSubmit(reason)}
            disabled={submitting}
            className="rounded-md bg-app-primary px-3 py-1.5 text-sm font-medium text-app-primary-on hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? t("reportDialog.submitting") : t("reportDialog.submit")}
          </button>
        </div>
      </div>
    </div>
  );
}
