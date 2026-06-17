import { useEffect, useState } from "react";
import { Trans, useTranslation } from "@internal/i18n";
import type { MaintainerRequestDto } from "@feature/teams-shared";
import { useTeamsApi } from "./client";

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
  const api = useTeamsApi();
  const { t } = useTranslation("teams");
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
      setError(err instanceof Error ? err.message : t("errors.submissionFailed"));
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
        <h2 className="text-lg font-semibold text-app-text">
          {t("dialogs.requestMaintainerTitle")}
        </h2>
        <p className="mt-1 text-xs text-app-text-muted">
          <Trans
            ns="teams"
            i18nKey="dialogs.requestMaintainerDescription"
            values={{ teamName }}
            components={{ b: <b /> }}
          />
        </p>

        <div className="mt-4 space-y-3 text-sm">
          <label className="block">
            <span className="text-xs text-app-text-muted">{t("form.whyOptionalLabel")}</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={busy}
              rows={4}
              maxLength={1000}
              placeholder={t("form.whyPlaceholder")}
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
            {t("actions.cancel")}
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={busy}
            className="rounded-md bg-app-primary px-3 py-1 text-app-primary-foreground disabled:opacity-50"
          >
            {busy ? t("actions.submitting") : t("actions.submit")}
          </button>
        </div>
      </div>
    </div>
  );
}
