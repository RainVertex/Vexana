import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageLayout } from "@internal/shared-ui";
import { useApi } from "@internal/api-client/react";
import { useTranslation } from "@internal/i18n";
import type {
  ScorecardReport,
  ScorecardTier,
  ScorecardTierStyle,
  TeamSummary,
} from "@internal/shared-types";
import { ENTITY_KINDS } from "./ruleKinds";

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

// Local badge so the scorecards feature does not import from catalog-frontend.
function TierBadge({ tier, tierStyle }: { tier: ScorecardTier; tierStyle: ScorecardTierStyle }) {
  const { t } = useTranslation("scorecards");
  const styles = tierStyle === "stage" ? STAGE_STYLES : THRESHOLD_STYLES;
  const cls = styles[tier] ?? styles.none;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}
    >
      {tier === "none" ? "—" : t(`tierLabel.${tier}` as Parameters<typeof t>[0])}
    </span>
  );
}

const selectClass =
  "rounded-md border border-app-border bg-app-surface px-2 py-1.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-app-primary";

export function ScorecardReportPage() {
  const { t } = useTranslation("scorecards");
  const { id = "" } = useParams<{ id: string }>();
  const api = useApi();
  const [report, setReport] = useState<ScorecardReport | null>(null);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [kind, setKind] = useState<string>("");
  const [ownerTeamId, setOwnerTeamId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.teams
      .list()
      .then((res) => setTeams(res.items))
      .catch(() => {});
  }, [api]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.scorecards
      .report(id, { kind: kind || undefined, ownerTeamId: ownerTeamId || undefined })
      .then((r) => setReport(r))
      .catch((err) => setError(err instanceof Error ? err.message : t("errors.loadFailed")))
      .finally(() => setLoading(false));
  }, [api, id, kind, ownerTeamId, t]);

  const teamName = useMemo(() => {
    const byId = new Map(teams.map((tm) => [tm.id, tm.name]));
    return (tid: string) => byId.get(tid) ?? tid;
  }, [teams]);

  const tierStyle = report?.scorecard.tierStyle ?? "stage";

  return (
    <PageLayout
      title={
        report ? t("report.title", { name: report.scorecard.name }) : t("report.titleFallback")
      }
      description={t("report.description")}
      actions={
        <Link
          to={`/scorecards/${id}`}
          className="rounded-md border border-app-border bg-app-surface px-3 py-1.5 text-sm text-app-text hover:bg-app-surface-hover"
        >
          {t("report.backToScorecard")}
        </Link>
      }
    >
      {error && (
        <div className="mb-4 rounded-md border border-app-danger bg-app-surface px-3 py-2 text-sm text-app-danger">
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-app-text-muted">
          {t("report.filterKind")}
          <select value={kind} onChange={(e) => setKind(e.target.value)} className={selectClass}>
            <option value="">{t("report.filterAll")}</option>
            {ENTITY_KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`entityKindLabel.${k}` as Parameters<typeof t>[0])}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-app-text-muted">
          {t("report.filterOwnerTeam")}
          <select
            value={ownerTeamId}
            onChange={(e) => setOwnerTeamId(e.target.value)}
            className={selectClass}
          >
            <option value="">{t("report.filterAll")}</option>
            {teams.map((tm) => (
              <option key={tm.id} value={tm.id}>
                {tm.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading || !report ? (
        <p className="text-sm text-app-text-muted">{t("report.loading")}</p>
      ) : report.rows.length === 0 ? (
        <p className="text-sm text-app-text-muted">{t("report.noEntities")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-app-border bg-app-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-app-border text-left text-xs text-app-text-muted">
                <th className="px-3 py-2 w-10">{t("report.colNumber")}</th>
                <th className="px-3 py-2">{t("report.colEntity")}</th>
                <th className="px-3 py-2">{t("report.colKind")}</th>
                <th className="px-3 py-2">{t("report.colTier")}</th>
                <th className="px-3 py-2">{t("report.colScore")}</th>
                <th className="px-3 py-2">{t("report.colRules")}</th>
                <th className="px-3 py-2">{t("report.colOwners")}</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row, i) => (
                <tr key={row.entity.id} className="border-b border-app-border last:border-0">
                  <td className="px-3 py-2 text-app-text-muted">{i + 1}</td>
                  <td className="px-3 py-2">
                    <Link
                      to={`/catalog/${row.entity.id}`}
                      className="font-medium text-app-primary hover:underline"
                    >
                      {row.entity.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-app-text-muted">
                    {t(`entityKindLabel.${row.entity.kind}` as Parameters<typeof t>[0])}
                  </td>
                  <td className="px-3 py-2">
                    <TierBadge tier={row.tier} tierStyle={tierStyle} />
                  </td>
                  <td className="px-3 py-2 text-app-text">{row.scorePercent}%</td>
                  <td className="px-3 py-2 text-app-text-muted">
                    {row.rulesPassed}/{row.rulesTotal}
                  </td>
                  <td className="px-3 py-2 text-app-text-muted">
                    {row.ownerTeamIds.length === 0
                      ? "—"
                      : row.ownerTeamIds.map(teamName).join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageLayout>
  );
}
