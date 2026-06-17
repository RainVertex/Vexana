import { useTranslation } from "@internal/i18n";
import type { ScorecardTier, ScorecardTierStyle } from "@feature/scorecards-shared";

const STAGE_STYLES: Record<string, string> = {
  bronze: "bg-amber-700/20 text-amber-800 dark:text-amber-300",
  silver: "bg-slate-300/40 text-slate-700 dark:text-slate-200",
  gold: "bg-yellow-400/30 text-yellow-800 dark:text-yellow-300",
  none: "bg-app-surface-hover text-app-text-muted",
};

const THRESHOLD_STYLES: Record<string, string> = {
  red: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  orange: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  none: "bg-app-surface-hover text-app-text-muted",
};

const STAGE_TIERS = new Set(["bronze", "silver", "gold"]);

function MedalIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M5 1h6l-1.5 4h-3L5 1zm3 5a4 4 0 100 8 4 4 0 000-8zm0 1.5a2.5 2.5 0 110 5 2.5 2.5 0 010-5z" />
    </svg>
  );
}

function DotIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
      <circle cx="4" cy="4" r="3" fill="currentColor" />
    </svg>
  );
}

export function TierPill({
  tier,
  tierStyle,
  size = "md",
}: {
  tier: ScorecardTier;
  tierStyle: ScorecardTierStyle;
  size?: "sm" | "md";
}) {
  const { t } = useTranslation("catalog");
  const styles = tierStyle === "stage" ? STAGE_STYLES : THRESHOLD_STYLES;
  const cls = styles[tier] ?? styles.none;
  const isStage = STAGE_TIERS.has(tier);
  const padding = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]";
  const display = tier === "none" ? "—" : t(`scorecardTier.${tier}`);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${padding} ${cls}`}>
      {tier !== "none" && (isStage ? <MedalIcon /> : <DotIcon />)}
      {display}
    </span>
  );
}
