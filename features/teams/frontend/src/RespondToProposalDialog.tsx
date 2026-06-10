import { useState } from "react";
import { useApi } from "@internal/api-client/react";
import { useTranslation } from "@internal/i18n";
import type { TeamRequestDto } from "@internal/shared-types";
import { RequestEditForm, toEditError, type RequestEdit } from "./RequestEditForm";

interface RespondToProposalDialogProps {
  request: TeamRequestDto | null;
  onClose: () => void;
  onResponded: (next: TeamRequestDto) => void;
}

// Requester-side dialog for countering an admin's team-request proposal.
export function RespondToProposalDialog({
  request,
  onClose,
  onResponded,
}: RespondToProposalDialogProps) {
  const api = useApi();
  const { t } = useTranslation("teams");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ReturnType<typeof toEditError> | null>(null);

  if (!request) return null;

  async function submit(edit: RequestEdit) {
    if (!request) return;
    setBusy(true);
    setError(null);
    try {
      const next = await api.teamRequests.respond(request.id, {
        action: "counter",
        ...edit,
      });
      onResponded(next);
      onClose();
    } catch (err) {
      setError(toEditError(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
    >
      <div className="w-full max-w-md rounded-lg border border-app-border bg-app-surface p-5 shadow-lg">
        <h2 className="text-lg font-semibold text-app-text">{t("dialogs.counterProposeTitle")}</h2>
        <p className="mt-1 text-xs text-app-text-muted">{t("dialogs.counterProposeDescription")}</p>
        <RequestEditForm
          request={request}
          busy={busy}
          nextRound={request.roundCount + 1}
          onSubmit={submit}
          onCancel={onClose}
          submitLabel={t("actions.sendCounterProposal")}
          error={error}
        />
      </div>
    </div>
  );
}
