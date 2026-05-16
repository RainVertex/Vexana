import { RequestTeamForm } from "./RequestTeamForm";

interface RequestTeamDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmitted: (createdTeamSlug: string | null) => void;
}

export function RequestTeamDialog({ open, onClose, onSubmitted }: RequestTeamDialogProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
    >
      <div className="w-full max-w-md rounded-lg border border-app-border bg-app-surface p-5 shadow-lg">
        <h2 className="text-lg font-semibold text-app-text">Request a team</h2>
        <p className="mt-1 text-xs text-app-text-muted">
          Submit a request for an admin to review. You can also mirror the team to a connected
          GitHub org.
        </p>
        <div className="mt-4">
          <RequestTeamForm
            onCancel={onClose}
            onSubmitted={(slug) => {
              onSubmitted(slug);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
