import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageLayout } from "@internal/shared-ui";
import { useApi } from "@internal/api-client/react";
import type { Scorecard } from "@internal/shared-types";

export function ScorecardsPage() {
  const api = useApi();
  const nav = useNavigate();
  const [items, setItems] = useState<Scorecard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.scorecards
      .list()
      .then((res) => setItems(res.items))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed"));
  }, [api]);

  async function createBlank() {
    try {
      const slug = `new-scorecard-${Date.now()}`;
      const created = await api.scorecards.create({
        slug,
        name: "New Scorecard",
        appliesTo: [],
        tierStyle: "stage",
        enabled: true,
        rules: [],
      });
      nav(`/scorecards/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    }
  }

  return (
    <PageLayout
      title="Scorecards"
      description="Define rules that grade catalog entities. Tier styles: stage (bronze/silver/gold) or threshold (red/orange/yellow/green)."
      actions={
        <button
          type="button"
          onClick={createBlank}
          className="rounded-md bg-app-primary px-3 py-1.5 text-sm font-medium text-app-primary-on hover:opacity-90"
        >
          New scorecard
        </button>
      }
    >
      {error && (
        <div className="mb-4 rounded-md border border-app-danger bg-app-surface px-3 py-2 text-sm text-app-danger">
          {error}
        </div>
      )}
      {!items ? (
        <p className="text-sm text-app-text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-app-text-muted">
          No scorecards yet. Create one to start grading entities.
        </p>
      ) : (
        <ul className="divide-y divide-app-border rounded-lg border border-app-border bg-app-surface">
          {items.map((s) => (
            <li key={s.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <Link
                  to={`/scorecards/${s.id}`}
                  className="text-sm font-medium text-app-primary-on hover:underline"
                >
                  {s.name}
                </Link>
                {s.description && (
                  <div className="text-xs text-app-text-muted">{s.description}</div>
                )}
                <div className="text-[11px] text-app-text-muted mt-1">
                  {s.tierStyle} · {s.rules?.length ?? 0} rules ·{" "}
                  {s.appliesTo.length === 0 ? "all kinds" : s.appliesTo.join(", ")}
                </div>
              </div>
              <span className="text-xs text-app-text-muted">
                {s.enabled ? "enabled" : "disabled"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </PageLayout>
  );
}
