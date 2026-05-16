import type { DocFreshness } from "@internal/shared-types";

export interface FreshnessBannerProps {
  freshness: DocFreshness;
  lastCommitAt: string | null;
  lastCommitBy: string | null;
  verifiedAt: string | null;
  verifying: boolean;
  onVerify: () => void;
  onReportStale: () => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return "unknown";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown";
  const days = Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

function styleFor(state: DocFreshness): { wrap: string; label: string; text: string } {
  switch (state) {
    case "fresh":
      return {
        wrap: "border-emerald-300/60 bg-emerald-50 dark:bg-emerald-900/20",
        label: "Fresh",
        text: "text-emerald-800 dark:text-emerald-200",
      };
    case "aging":
      return {
        wrap: "border-amber-300/60 bg-amber-50 dark:bg-amber-900/20",
        label: "Aging",
        text: "text-amber-800 dark:text-amber-200",
      };
    case "stale":
      return {
        wrap: "border-red-300/60 bg-red-50 dark:bg-red-900/20",
        label: "Stale",
        text: "text-red-800 dark:text-red-200",
      };
    default:
      return {
        wrap: "border-app-border bg-app-surface",
        label: "Unknown freshness",
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
  const s = styleFor(freshness);
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs ${s.wrap} ${s.text}`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold uppercase tracking-wide">{s.label}</span>
        <span>
          Last edited {formatDate(lastCommitAt)}
          {lastCommitBy ? ` by ${lastCommitBy}` : ""}
        </span>
        {verifiedAt && (
          <span className="text-app-text-muted">· Verified {formatDate(verifiedAt)}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onVerify}
          disabled={verifying}
          className="rounded border border-current px-2 py-0.5 text-[11px] hover:bg-black/5 disabled:opacity-50"
        >
          {verifying ? "Saving…" : "Mark verified"}
        </button>
        <button
          type="button"
          onClick={onReportStale}
          className="rounded border border-current px-2 py-0.5 text-[11px] hover:bg-black/5"
        >
          Report stale
        </button>
      </div>
    </div>
  );
}
