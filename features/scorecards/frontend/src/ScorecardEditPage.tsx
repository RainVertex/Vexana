import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageLayout } from "@internal/shared-ui";
import { useApi } from "@internal/api-client/react";
import type { Scorecard } from "@internal/shared-types";

export function ScorecardEditPage() {
  const { id = "" } = useParams<{ id: string }>();
  const api = useApi();
  const nav = useNavigate();
  const [sc, setSc] = useState<Scorecard | null>(null);
  const [draft, setDraft] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [evalResult, setEvalResult] = useState<string | null>(null);

  useEffect(() => {
    api.scorecards
      .get(id)
      .then((res) => {
        setSc(res);
        setDraft(JSON.stringify(res, null, 2));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed"));
  }, [api, id]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const parsed = JSON.parse(draft) as Partial<Scorecard>;
      const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = parsed as Record<string, unknown>;
      const updated = await api.scorecards.update(id, rest as Partial<Scorecard>);
      setSc(updated);
      setDraft(JSON.stringify(updated, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed (check JSON syntax)");
    } finally {
      setSaving(false);
    }
  }

  async function evaluate() {
    setEvalResult(null);
    try {
      const res = await api.scorecards.evaluate(id);
      setEvalResult(`Evaluated ${res.entities} entities, wrote ${res.results} new results.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evaluate failed");
    }
  }

  async function destroy() {
    if (!confirm("Delete this scorecard and all of its results?")) return;
    try {
      await api.scorecards.delete(id);
      nav("/scorecards");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <PageLayout
      title={sc?.name ?? "Scorecard"}
      description="JSON editor — full WYSIWYG rule builder is a follow-up."
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={evaluate}
            className="rounded-md border border-app-border bg-app-surface px-3 py-1.5 text-sm text-app-text hover:bg-app-surface-hover"
          >
            Evaluate now
          </button>
          <button
            type="button"
            onClick={destroy}
            className="rounded-md border border-app-danger px-3 py-1.5 text-sm text-app-danger hover:opacity-90"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-md bg-app-primary px-3 py-1.5 text-sm font-medium text-app-primary-on hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      }
    >
      {error && (
        <div className="mb-4 rounded-md border border-app-danger bg-app-surface px-3 py-2 text-sm text-app-danger">
          {error}
        </div>
      )}
      {evalResult && (
        <div className="mb-4 rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text">
          {evalResult}
        </div>
      )}
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        spellCheck={false}
        className="font-mono text-xs w-full min-h-[60vh] rounded-md border border-app-border bg-app-surface p-3 text-app-text focus:outline-none focus:ring-2 focus:ring-app-primary"
      />
    </PageLayout>
  );
}
