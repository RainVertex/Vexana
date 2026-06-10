import { useState } from "react";
import { useTranslation } from "@internal/i18n";
import type { ScorecardSummary } from "@internal/shared-types";
import { TierPill } from "../TierPill";
import { useEntityOverviewContext } from "../EntityOverviewContext";

export function ScorecardsWidget() {
  const { data } = useEntityOverviewContext();
  const { t } = useTranslation("catalog");
  const items = data.scorecards;
  if (items.length === 0) {
    return <p className="text-sm text-app-text-muted">{t("scorecards.widgetNoScorecards")}</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map((s) => (
        <ScorecardRow key={s.scorecard.id} summary={s} />
      ))}
    </ul>
  );
}

function ScorecardRow({ summary }: { summary: ScorecardSummary }) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation("catalog");
  return (
    <li className="rounded border border-app-border">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-app-surface-hover"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-sm font-medium text-app-text">{summary.scorecard.name}</span>
        <span className="flex items-center gap-3">
          <span className="text-xs text-app-text-muted">
            {t("scorecards.passing", { passed: summary.rulesPassed, total: summary.rulesTotal })}
          </span>
          <TierPill tier={summary.tier} tierStyle={summary.scorecard.tierStyle} />
        </span>
      </button>
      {expanded && (
        <ul className="border-t border-app-border divide-y divide-app-border">
          {summary.rules.map(({ rule, result }) => (
            <li key={rule.id} className="flex items-center justify-between px-3 py-2 text-xs">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true">{result?.passed ? "✓" : "✗"}</span>
                  <span className="text-app-text">{rule.label}</span>
                </div>
                <div className="text-app-text-muted truncate">
                  {result?.reason ?? t("scorecards.widgetNotEvaluated")}
                </div>
              </div>
              <span className="text-app-text-muted">{t(`scorecardTier.${rule.tier}`)}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
