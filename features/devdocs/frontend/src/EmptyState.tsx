import { useTranslation } from "@internal/i18n";
import type { DocSyncStateRow } from "@internal/shared-types";

export interface EmptyStateProps {
  syncState: DocSyncStateRow | null;
  onRunSync: () => void;
  syncing: boolean;
}

export function EmptyState({ syncState, onRunSync, syncing }: EmptyStateProps) {
  const { t } = useTranslation("devdocs");
  const lastErr = syncState?.lastError;
  return (
    <div className="rounded-lg border border-app-border bg-app-surface p-6">
      <h2 className="text-sm font-semibold text-app-text mb-2">{t("empty.heading")}</h2>
      <p className="text-sm text-app-text-muted mb-3">{t("empty.intro")}</p>
      <ol className="list-decimal list-inside text-sm text-app-text-muted space-y-2 mb-4">
        <li>{t("empty.step1")}</li>
        <li>{t("empty.step2")}</li>
        <li>{t("empty.step3")}</li>
      </ol>
      <pre className="rounded bg-app-surface-hover p-3 text-xs overflow-x-auto mb-3">
        {`# Option A: explicit folder inside this repo
#   (same conventions as the docs/ folder above)
spec:
  docs:
    path: ./docs

# Option B: external docs site (rendered as a link card,
#   no Markdown is fetched)
spec:
  docs:
    url: https://docs.example.com/your-service`}
      </pre>
      <p className="text-xs text-app-text-muted mb-4">{t("empty.schedule")}</p>
      {lastErr && (
        <div className="mb-3 rounded-md border border-app-danger bg-app-surface px-3 py-2 text-xs text-app-danger">
          {t("empty.lastSyncError", { error: lastErr })}
        </div>
      )}
      <button
        type="button"
        onClick={onRunSync}
        disabled={syncing}
        className="rounded-md bg-app-primary px-3 py-1.5 text-sm font-medium text-app-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {syncing ? t("empty.syncing") : t("empty.runSync")}
      </button>
    </div>
  );
}
