import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DoraMetricsSnapshot } from "@internal/shared-types";
import { useEntityOverviewContext } from "../EntityOverviewContext";

const METRICS: Array<{
  key: keyof Pick<
    DoraMetricsSnapshot,
    "deployFrequencyPerDay" | "leadTimeHours" | "changeFailureRate" | "mttrHours"
  >;
  label: string;
  color: string;
}> = [
  { key: "deployFrequencyPerDay", label: "Deploy Freq / day", color: "#10b981" },
  { key: "leadTimeHours", label: "Lead Time (h)", color: "#6366f1" },
  { key: "changeFailureRate", label: "CFR", color: "#ef4444" },
  { key: "mttrHours", label: "MTTR (h)", color: "#f59e0b" },
];

export function DoraChartWidget() {
  const { data } = useEntityOverviewContext();
  const dora = data.dora;
  if (dora.length < 2) {
    return <p className="text-sm text-app-text-muted">Not enough DORA data yet.</p>;
  }

  const series = [...dora]
    .sort((a, b) => new Date(a.periodEnd).getTime() - new Date(b.periodEnd).getTime())
    .map((s) => ({
      label: new Date(s.periodEnd).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      deployFrequencyPerDay: s.deployFrequencyPerDay,
      leadTimeHours: s.leadTimeHours,
      changeFailureRate: s.changeFailureRate,
      mttrHours: s.mttrHours,
    }));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {METRICS.map((m) => (
        <div key={m.key} className="rounded border border-app-border p-2">
          <div className="text-xs text-app-text-muted mb-1">{m.label}</div>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="label" hide />
                <YAxis hide domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-app-surface)",
                    border: "1px solid var(--color-app-border)",
                    fontSize: 11,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey={m.key}
                  stroke={m.color}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="text-right text-sm text-app-text">
            {series[series.length - 1]![m.key].toFixed(2)}
          </div>
        </div>
      ))}
    </div>
  );
}
