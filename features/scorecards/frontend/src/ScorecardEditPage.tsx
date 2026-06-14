import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageLayout } from "@internal/shared-ui";
import { useApi } from "@internal/api-client/react";
import { useTranslation } from "@internal/i18n";
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
  const { t } = useTranslation("scorecards");
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
      .catch((err) => setError(err instanceof Error ? err.message : t("errors.loadFailed")));
  }, [api, id, t]);

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
        label: t("edit.newRuleLabel"),
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
      setError(err instanceof Error ? err.message : t("errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function evaluate() {
    setEvalResult(null);
    try {
      const res = await api.scorecards.evaluate(id);
      setEvalResult(t("edit.evalResult", { entities: res.entities, results: res.results }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.evaluateFailed"));
    }
  }

  async function destroy() {
    if (!confirm(t("edit.deleteConfirm"))) return;
    try {
      await api.scorecards.delete(id);
      nav("/scorecards");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.deleteFailed"));
    }
  }

  if (!draft) {
    return (
      <PageLayout title={t("edit.titleFallback")} description={t("edit.loadingDescription")}>
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
      title={draft.name || t("edit.titleFallback")}
      description={t("edit.description")}
      actions={
        <div className="flex items-center gap-2">
          <Link
            to={`/scorecards/${id}/report`}
            className="rounded-md border border-app-border bg-app-surface px-3 py-1.5 text-sm text-app-text hover:bg-app-surface-hover"
          >
            {t("edit.viewReport")}
          </Link>
          <button
            type="button"
            onClick={evaluate}
            className="rounded-md border border-app-border bg-app-surface px-3 py-1.5 text-sm text-app-text hover:bg-app-surface-hover"
          >
            {t("edit.evaluateNow")}
          </button>
          <button
            type="button"
            onClick={destroy}
            className="rounded-md border border-app-danger px-3 py-1.5 text-sm text-app-danger hover:opacity-90"
          >
            {t("edit.delete")}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-md bg-app-primary px-3 py-1.5 text-sm font-medium text- hover:opacity-90 disabled:opacity-60"
          >
            {saving ? t("edit.saving") : t("edit.save")}
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
          <Field label={t("form.name")}>
            <input
              value={draft.name}
              onChange={(e) => patchDraft({ name: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label={t("form.description")}>
            <input
              value={draft.description}
              onChange={(e) => patchDraft({ description: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label={t("form.tierStyle")}>
            <select
              value={draft.tierStyle}
              onChange={(e) => changeTierStyle(e.target.value as ScorecardTierStyle)}
              className={inputClass}
            >
              <option value="stage">{t("form.tierStyleStage")}</option>
              <option value="threshold">{t("form.tierStyleThreshold")}</option>
            </select>
          </Field>
          <Field label={t("form.appliesTo")}>
            <div className="flex flex-wrap gap-2">
              {ENTITY_KINDS.map((k) => (
                <label key={k} className="flex items-center gap-1 text-sm text-app-text">
                  <input
                    type="checkbox"
                    checked={draft.appliesTo.includes(k)}
                    onChange={() => toggleAppliesTo(k)}
                  />
                  {t(`entityKindLabel.${k}` as Parameters<typeof t>[0])}
                </label>
              ))}
              <span className="text-xs text-app-text-muted self-center">
                {draft.appliesTo.length === 0 ? t("edit.emptyAppliesToHint") : ""}
              </span>
            </div>
          </Field>
          <Field label={t("form.enabled")}>
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(e) => patchDraft({ enabled: e.target.checked })}
            />
          </Field>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-app-text">{t("edit.rulesHeading")}</h2>
            <button
              type="button"
              onClick={addRule}
              className="rounded-md border border-app-border bg-app-surface px-3 py-1.5 text-sm text-app-text hover:bg-app-surface-hover"
            >
              {t("edit.addRule")}
            </button>
          </div>
          {draft.rules.length === 0 && (
            <p className="text-sm text-app-text-muted">{t("edit.noRules")}</p>
          )}
          {draft.rules.map((rule, i) => (
            <div
              key={i}
              className="rounded-lg border border-app-border bg-app-surface p-4 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label={t("form.label")}>
                  <input
                    value={rule.label}
                    onChange={(e) => patchRule(i, { label: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label={t("form.key")}>
                  <input
                    value={rule.key}
                    onChange={(e) => patchRule(i, { key: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label={t("form.kind")}>
                  <select
                    value={rule.kind}
                    onChange={(e) => changeKind(i, e.target.value as ScorecardRuleKind)}
                    className={inputClass}
                  >
                    {RULE_KINDS.map((k) => (
                      <option key={k.kind} value={k.kind}>
                        {t(`ruleKind.${k.kind}` as Parameters<typeof t>[0])}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("form.tier")}>
                  <select
                    value={rule.tier}
                    onChange={(e) => patchRule(i, { tier: e.target.value })}
                    className={inputClass}
                  >
                    {tiers.map((tier) => (
                      <option key={tier} value={tier}>
                        {t(`tierLabel.${tier}` as Parameters<typeof t>[0])}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("form.weight")}>
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
                  {t("edit.removeRule")}
                </button>
              </div>
            </div>
          ))}
        </section>

        <details className="rounded-lg border border-app-border bg-app-surface p-4">
          <summary className="cursor-pointer text-sm text-app-text-muted">
            {t("edit.advancedJson")}
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
  const { t } = useTranslation("scorecards");

  const fieldLabel = t(
    `ruleField.${field.key === "field" ? "entityField" : field.key === "values" ? "allowedLifecycles" : field.key === "tag" ? "requiredTag" : field.key}` as Parameters<
      typeof t
    >[0],
  );

  if (field.type === "lifecycles") {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <Field label={fieldLabel}>
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
              {t(`lifecycleLabel.${l}` as Parameters<typeof t>[0])}
            </label>
          ))}
        </div>
      </Field>
    );
  }
  if (field.type === "doraMetric") {
    return (
      <Field label={fieldLabel}>
        <select
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        >
          {DORA_METRICS.map((m) => (
            <option key={m} value={m}>
              {t(`doraMetricLabel.${m}` as Parameters<typeof t>[0])}
            </option>
          ))}
        </select>
      </Field>
    );
  }
  if (field.type === "op") {
    return (
      <Field label={fieldLabel}>
        <select
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        >
          {DORA_OPS.map((o) => (
            <option key={o} value={o}>
              {o === "gte" ? t("ruleField.opGte") : t("ruleField.opLte")}
            </option>
          ))}
        </select>
      </Field>
    );
  }
  if (field.type === "window") {
    return (
      <Field label={fieldLabel}>
        <select
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        >
          {DORA_WINDOWS.map((w) => (
            <option key={w} value={w}>
              {w === "latest" ? t("ruleField.windowLatest") : t("ruleField.window30d")}
            </option>
          ))}
        </select>
      </Field>
    );
  }
  if (field.type === "number") {
    return (
      <Field label={fieldLabel}>
        <input
          type="number"
          value={value === undefined || value === null ? "" : Number(value)}
          onChange={(e) => onChange(Number(e.target.value))}
          className={inputClass}
        />
      </Field>
    );
  }
  return (
    <Field label={fieldLabel}>
      <input
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </Field>
  );
}
