import { useState } from "react";
import { useApi } from "@internal/api-client/react";
import type { ScorecardSummary } from "@internal/shared-types";
import { useEntityContext } from "../outletContext";
import { TierPill } from "../TierPill";

export function ScorecardsTab() {
  const { data, reload } = useEntityContext();
  const api = useApi();
  const [items, setItems] = useState<ScorecardSummary[]>(data.scorecards);
  const [recomputing, setRecomputing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function recompute() {
    setRecomputing(true);
    setError(null);
    try {
      const res = await api.catalog.recomputeScorecards(data.entity.id);
      setItems(res.items);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setRecomputing(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-app-border bg-app-surface p-6">
        <p className="text-sm text-app-text-muted">No scorecards apply to this entity.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-app-text-muted">
          {items.length} scorecard{items.length === 1 ? "" : "s"} apply to this entity.
        </p>
        <button
          type="button"
          onClick={recompute}
          disabled={recomputing}
          className="rounded-md bg-app-primary px-3 py-1.5 text-sm font-medium text-app-primary-on hover:opacity-90 disabled:opacity-60"
        >
          {recomputing ? "Recomputing…" : "Recompute now"}
        </button>
      </div>
      {error && (
        <div className="rounded-md border border-app-danger bg-app-surface px-3 py-2 text-sm text-app-danger">
          {error}
        </div>
      )}
      {items.map((s) => (
        <section
          key={s.scorecard.id}
          className="rounded-lg border border-app-border bg-app-surface"
        >
          <header className="flex items-center justify-between px-4 py-3 border-b border-app-border">
            <h2 className="text-sm font-semibold text-app-text">{s.scorecard.name}</h2>
            <span className="flex items-center gap-3">
              <span className="text-xs text-app-text-muted">
                {s.rulesPassed}/{s.rulesTotal} passing
              </span>
              <TierPill tier={s.tier} tierStyle={s.scorecard.tierStyle} />
            </span>
          </header>
          <ul className="divide-y divide-app-border">
            {s.rules.map(({ rule, result }) => (
              <li key={rule.id} className="px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true">{result?.passed ? "✓" : "✗"}</span>
                    <span className="text-app-text">{rule.label}</span>
                    <code className="text-[10px] text-app-text-muted">{rule.kind}</code>
                  </div>
                  <span className="text-xs text-app-text-muted capitalize">{rule.tier}</span>
                </div>
                <div className="mt-1 text-xs text-app-text-muted">
                  {result?.reason ?? "Not yet evaluated"}
                </div>
                {result?.evidence && (
                  <details className="mt-1 text-xs">
                    <summary className="text-app-text-muted cursor-pointer">Evidence</summary>
                    <pre className="mt-1 rounded bg-app-surface-hover p-2 overflow-x-auto text-[11px]">
                      {JSON.stringify(result.evidence, null, 2)}
                    </pre>
                  </details>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
