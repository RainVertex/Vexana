import { useTranslation } from "@internal/i18n";
import type { DocFreshness } from "@feature/devdocs-shared";

export interface FreshnessBannerProps {
  freshness: DocFreshness;
  lastCommitAt: string | null;
  lastCommitBy: string | null;
  verifiedAt: string | null;
  verifying: boolean;
  onVerify: () => void;
  onReportStale: () => void;
}

function formatDate(iso: string | null, t: ReturnType<typeof useTranslation>["t"]): string {
  if (!iso) return t("time.unknown");
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return t("time.unknown");
  const days = Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return t("time.today");
  if (days === 1) return t("time.yesterday");
  if (days < 30) return t("time.daysAgo", { count: days });
  if (days < 365) return t("time.monthsAgo", { count: Math.floor(days / 30) });
  return t("time.yearsAgo", { count: Math.floor(days / 365) });
}

function styleFor(state: DocFreshness): { wrap: string; labelKey: string; text: string } {
  switch (state) {
    case "fresh":
      return {
        wrap: "border-emerald-300/60 bg-emerald-50 dark:bg-emerald-900/20",
        labelKey: "freshness.fresh",
        text: "text-emerald-800 dark:text-emerald-200",
      };
    case "aging":
      return {
        wrap: "border-amber-300/60 bg-amber-50 dark:bg-amber-900/20",
        labelKey: "freshness.aging",
        text: "text-amber-800 dark:text-amber-200",
      };
    case "stale":
      return {
        wrap: "border-red-300/60 bg-red-50 dark:bg-red-900/20",
        labelKey: "freshness.stale",
        text: "text-red-800 dark:text-red-200",
      };
    default:
      return {
        wrap: "border-app-border bg-app-surface",
        labelKey: "freshness.unknown",
        text: "text-app-text-muted",
      };
  }
}

export function FreshnessBanner({
  freshness,
  lastCommitAt,
  lastCommitBy,
  verifiedAt,
  verifying,
  onVerify,
  onReportStale,
}: FreshnessBannerProps) {
  const { t } = useTranslation("devdocs");
  const s = styleFor(freshness);
  const when = formatDate(lastCommitAt, t);
  const editedText = lastCommitBy
    ? t("freshness.lastEditedBy", { when, who: lastCommitBy })
    : t("freshness.lastEdited", { when });

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs ${s.wrap} ${s.text}`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold uppercase tracking-wide">{t(s.labelKey)}</span>
        <span>{editedText}</span>
        {verifiedAt && (
          <span className="text-app-text-muted">
            {t("freshness.verified", { when: formatDate(verifiedAt, t) })}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onVerify}
          disabled={verifying}
          className="rounded border border-current px-2 py-0.5 text-[11px] hover:bg-black/5 disabled:opacity-50"
        >
          {verifying ? t("freshness.saving") : t("freshness.markVerified")}
        </button>
        <button
          type="button"
          onClick={onReportStale}
          className="rounded border border-current px-2 py-0.5 text-[11px] hover:bg-black/5"
        >
          {t("freshness.reportStale")}
        </button>
      </div>
    </div>
  );
}
