import { useEffect, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useScorecardsApi } from "@feature/scorecards-frontend";
import { useTranslation } from "@internal/i18n";
import type { ScorecardHistoryPoint } from "@feature/scorecards-shared";

// Weighted score over time for one scorecard on one entity; hidden until there are two points.
export function TierTrend({ scorecardId, entityId }: { scorecardId: string; entityId: string }) {
  const api = useScorecardsApi();
  const { t } = useTranslation("catalog");
  const [points, setPoints] = useState<ScorecardHistoryPoint[] | null>(null);

  useEffect(() => {
    api
      .history(scorecardId, entityId)
      .then((res) => setPoints(res.items))
      .catch(() => setPoints([]));
  }, [api, scorecardId, entityId]);

  if (!points || points.length < 2) return null;

  const series = points.map((p) => ({
    label: new Date(p.capturedAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    scorePercent: p.scorePercent,
  }));

  return (
    <div className="border-t border-app-border px-4 py-3">
      <div className="mb-1 text-xs text-app-text-muted">{t("scoreTrend.label")}</div>
      <div className="h-20">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <XAxis dataKey="label" hide />
            <YAxis hide domain={[0, 100]} />
            <Tooltip
              contentStyle={{
                background: "var(--color-app-surface)",
                border: "1px solid var(--color-app-border)",
                fontSize: 11,
              }}
            />
            <Line
              type="monotone"
              dataKey="scorePercent"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
