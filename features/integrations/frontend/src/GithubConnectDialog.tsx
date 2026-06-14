// GitHub App connect dialog: a redirect flow to GitHub, not a form (callback records the Integration).

import { useState } from "react";
import { useTranslation } from "@internal/i18n";

export interface GithubConnectDialogProps {
  open: boolean;
  onClose: () => void;
  onConnected: () => void;
}

const INSTALL_URL = "/api/integrations/github/install";

export function GithubConnectDialog({ open, onClose }: GithubConnectDialogProps) {
  const { t } = useTranslation("integrations");
  const [redirecting, setRedirecting] = useState(false);

  if (!open) return null;

  function handleInstall() {
    setRedirecting(true);
    window.location.href = INSTALL_URL;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg border border-app-border bg-app-surface p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-app-text">{t("githubConnect.title")}</h3>
        <p className="mt-2 text-xs text-app-text-muted">{t("githubConnect.description")}</p>
        <ul className="mt-3 space-y-1 text-xs text-app-text-muted">
          <li>
            <span className="font-medium text-app-text">{t("githubConnect.itemRepositories")}</span>{" "}
            &mdash; {t("githubConnect.itemRepositoriesDetail")}
          </li>
          <li>
            <span className="font-medium text-app-text">{t("githubConnect.itemTeams")}</span>{" "}
            &mdash; {t("githubConnect.itemTeamsDetail")}
          </li>
        </ul>
        <p className="mt-3 text-xs text-app-text-muted">{t("githubConnect.ongoingNote")}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1.5 text-sm text-app-text-muted hover:bg-app-surface-hover"
          >
            {t("githubConnect.cancel")}
          </button>
          <button
            type="button"
            onClick={handleInstall}
            disabled={redirecting}
            className="rounded bg-app-primary px-3 py-1.5 text-sm font-medium text- disabled:opacity-50"
          >
            {redirecting ? t("githubConnect.redirecting") : t("githubConnect.installButton")}
          </button>
        </div>
      </div>
    </div>
  );
}
