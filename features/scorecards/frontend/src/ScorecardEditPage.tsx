import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageLayout } from "@internal/shared-ui";
import { useApi } from "@internal/api-client/react";
import type { Scorecard, ScorecardRuleKind, ScorecardTierStyle } from "@internal/shared-types";
import {
  DORA_METRICS,
  DORA_OPS,
  DORA_WINDOWS,
  ENTITY_KINDS,
  LIFECYCLES,
  RULE_KINDS,
  ruleKindDef,
  tiersFor,
  type RuleFieldDef,
} from "./ruleKinds";

interface DraftRule {
  key: string;
  label: string;
  kind: ScorecardRuleKind;
  config: Record<string, unknown>;
  weight: number;
  tier: string;
}

interface Draft {
  name: string;
  description: string;
  appliesTo: string[];
  tierStyle: ScorecardTierStyle;
  enabled: boolean;
  rules: DraftRule[];
}

function toDraft(sc: Scorecard): Draft {
  return {
    name: sc.name,
    description: sc.description ?? "",
    appliesTo: sc.appliesTo,
    tierStyle: sc.tierStyle,
    enabled: sc.enabled,
    rules: (sc.rules ?? []).map((r) => ({
      key: r.key,
      label: r.label,
      kind: r.kind,
      config: r.config ?? {},
      weight: r.weight,
      tier: r.tier,
    })),
  };
}

function toPayload(draft: Draft): Partial<Scorecard> {
  return {
    name: draft.name,
    description: draft.description.trim() === "" ? null : draft.description,
    appliesTo: draft.appliesTo as Scorecard["appliesTo"],
    tierStyle: draft.tierStyle,
    enabled: draft.enabled,
    rules: draft.rules.map((r) => ({
      key: r.key,
      label: r.label,
      kind: r.kind,
      config: r.config,
      weight: r.weight,
      tier: r.tier,
    })) as Scorecard["rules"],
  };
}

export function ScorecardEditPage() {
  const { id = "" } = useParams<{ id: string }>();
  const api = useApi();
  const nav = useNavigate();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [evalResult, setEvalResult] = useState<string | null>(null);

  useEffect(() => {
    api.scorecards
      .get(id)
      .then((sc) => setDraft(toDraft(sc)))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed"));
  }, [api, id]);

  function patchDraft(patch: Partial<Draft>) {
    setDraft((d) => (d ? { ...d, ...patch } : d));
  }

  function patchRule(index: number, patch: Partial<DraftRule>) {
    setDraft((d) => {
      if (!d) return d;
      const rules = d.rules.map((r, i) => (i === index ? { ...r, ...patch } : r));
      return { ...d, rules };
    });
  }

  function changeKind(index: number, kind: ScorecardRuleKind) {
    const def = ruleKindDef(kind);
    patchRule(index, { kind, config: { ...(def?.defaultConfig ?? {}) } });
  }

  function changeTierStyle(tierStyle: ScorecardTierStyle) {
    setDraft((d) => {
      if (!d) return d;
      const allowed = tiersFor(tierStyle);
      const rules = d.rules.map((r) =>
        allowed.includes(r.tier as (typeof allowed)[number]) ? r : { ...r, tier: allowed[0]! },
      );
      return { ...d, tierStyle, rules };
    });
  }

  function addRule() {
    setDraft((d) => {
      if (!d) return d;
      const rule: DraftRule = {
        key: `rule-${d.rules.length + 1}`,
        label: "New rule",
        kind: "has_owner",
        config: {},
        weight: 1,
        tier: tiersFor(d.tierStyle)[0]!,
      };
      return { ...d, rules: [...d.rules, rule] };
    });
  }

  function removeRule(index: number) {
    setDraft((d) => (d ? { ...d, rules: d.rules.filter((_, i) => i !== index) } : d));
  }

  function toggleAppliesTo(kind: string) {
    setDraft((d) => {
      if (!d) return d;
      const appliesTo = d.appliesTo.includes(kind)
        ? d.appliesTo.filter((k) => k !== kind)
        : [...d.appliesTo, kind];
      return { ...d, appliesTo };
    });
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.scorecards.update(id, toPayload(draft));
      setDraft(toDraft(updated));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
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

  if (!draft) {
    return (
      <PageLayout title="Scorecard" description="Loading…">
        {error && (
          <div className="rounded-md border border-app-danger bg-app-surface px-3 py-2 text-sm text-app-danger">
            {error}
          </div>
        )}
      </PageLayout>
    );
  }

  const tiers = tiersFor(draft.tierStyle);

  return (
    <PageLayout
      title={draft.name || "Scorecard"}
      description="Define the rules that grade catalog entities."
      actions={
        <div className="flex items-center gap-2">
          <Link
            to={`/scorecards/${id}/report`}
            className="rounded-md border border-app-border bg-app-surface px-3 py-1.5 text-sm text-app-text hover:bg-app-surface-hover"
          >
            View report
          </Link>
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

      <div className="space-y-6">
        <section className="rounded-lg border border-app-border bg-app-surface p-4 space-y-4">
          <Field label="Name">
            <input
              value={draft.name}
              onChange={(e) => patchDraft({ name: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Description">
            <input
              value={draft.description}
              onChange={(e) => patchDraft({ description: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Tier style">
            <select
              value={draft.tierStyle}
              onChange={(e) => changeTierStyle(e.target.value as ScorecardTierStyle)}
              className={inputClass}
            >
              <option value="stage">stage (bronze / silver / gold)</option>
              <option value="threshold">threshold (red / orange / yellow / green)</option>
            </select>
          </Field>
          <Field label="Applies to">
            <div className="flex flex-wrap gap-2">
              {ENTITY_KINDS.map((k) => (
                <label key={k} className="flex items-center gap-1 text-sm text-app-text">
                  <input
                    type="checkbox"
                    checked={draft.appliesTo.includes(k)}
                    onChange={() => toggleAppliesTo(k)}
                  />
                  {k}
                </label>
              ))}
              <span className="text-xs text-app-text-muted self-center">
                {draft.appliesTo.length === 0 ? "(empty = all kinds)" : ""}
              </span>
            </div>
          </Field>
          <Field label="Enabled">
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(e) => patchDraft({ enabled: e.target.checked })}
            />
          </Field>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-app-text">Rules</h2>
            <button
              type="button"
              onClick={addRule}
              className="rounded-md border border-app-border bg-app-surface px-3 py-1.5 text-sm text-app-text hover:bg-app-surface-hover"
            >
              Add rule
            </button>
          </div>
          {draft.rules.length === 0 && (
            <p className="text-sm text-app-text-muted">No rules yet. Add one to start grading.</p>
          )}
          {draft.rules.map((rule, i) => (
            <div
              key={i}
              className="rounded-lg border border-app-border bg-app-surface p-4 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Label">
                  <input
                    value={rule.label}
                    onChange={(e) => patchRule(i, { label: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Key">
                  <input
                    value={rule.key}
                    onChange={(e) => patchRule(i, { key: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Kind">
                  <select
                    value={rule.kind}
                    onChange={(e) => changeKind(i, e.target.value as ScorecardRuleKind)}
                    className={inputClass}
                  >
                    {RULE_KINDS.map((k) => (
                      <option key={k.kind} value={k.kind}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Tier">
                  <select
                    value={rule.tier}
                    onChange={(e) => patchRule(i, { tier: e.target.value })}
                    className={inputClass}
                  >
                    {tiers.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Weight">
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={rule.weight}
                    onChange={(e) => patchRule(i, { weight: Number(e.target.value) || 1 })}
                    className={inputClass}
                  />
                </Field>
              </div>

              {(ruleKindDef(rule.kind)?.fields ?? []).length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-app-border pt-3">
                  {ruleKindDef(rule.kind)!.fields.map((field) => (
                    <ConfigField
                      key={field.key}
                      field={field}
                      value={rule.config[field.key]}
                      onChange={(value) =>
                        patchRule(i, { config: { ...rule.config, [field.key]: value } })
                      }
                    />
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => removeRule(i)}
                  className="text-xs text-app-danger hover:underline"
                >
                  Remove rule
                </button>
              </div>
            </div>
          ))}
        </section>

        <details className="rounded-lg border border-app-border bg-app-surface p-4">
          <summary className="cursor-pointer text-sm text-app-text-muted">
            Advanced: view JSON
          </summary>
          <pre className="mt-2 overflow-x-auto rounded bg-app-surface-hover p-3 text-[11px] text-app-text">
            {JSON.stringify(toPayload(draft), null, 2)}
          </pre>
        </details>
      </div>
    </PageLayout>
  );
}

const inputClass =
  "w-full rounded-md border border-app-border bg-app-surface px-2 py-1.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-app-primary";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-app-text-muted">{label}</span>
      {children}
    </label>
  );
}

function ConfigField({
  field,
  value,
  onChange,
}: {
  field: RuleFieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (field.type === "lifecycles") {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <Field label={field.label}>
        <div className="flex flex-wrap gap-2">
          {LIFECYCLES.map((l) => (
            <label key={l} className="flex items-center gap-1 text-sm text-app-text">
              <input
                type="checkbox"
                checked={selected.includes(l)}
                onChange={() =>
                  onChange(
                    selected.includes(l) ? selected.filter((x) => x !== l) : [...selected, l],
                  )
                }
              />
              {l}
            </label>
          ))}
        </div>
      </Field>
    );
  }
  if (field.type === "doraMetric") {
    return (
      <Field label={field.label}>
        <select
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        >
          {DORA_METRICS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </Field>
    );
  }
  if (field.type === "op") {
    return (
      <Field label={field.label}>
        <select
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        >
          {DORA_OPS.map((o) => (
            <option key={o} value={o}>
              {o === "gte" ? "at least (>=)" : "at most (<=)"}
            </option>
          ))}
        </select>
      </Field>
    );
  }
  if (field.type === "window") {
    return (
      <Field label={field.label}>
        <select
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        >
          {DORA_WINDOWS.map((w) => (
            <option key={w} value={w}>
              {w === "latest" ? "latest snapshot" : "30 day average"}
            </option>
          ))}
        </select>
      </Field>
    );
  }
  if (field.type === "number") {
    return (
      <Field label={field.label}>
        <input
          type="number"
          value={value === undefined || value === null ? "" : Number(value)}
          onChange={(e) => onChange(Number(e.target.value))}
          className={inputClass}
        />
      </Field>
    );
  }
  // text and tag
  return (
    <Field label={field.label}>
      <input
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </Field>
  );
}
