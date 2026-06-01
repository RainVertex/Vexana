import type {
  CatalogEntity,
  CatalogEntityKind,
  DoraMetricsSnapshot,
  Lifecycle,
} from "@internal/db";
import type { ScorecardRuleKind } from "@internal/shared-types";

export interface RuleContext {
  entity: CatalogEntity;
  ownerTeamIds: string[];
  dora: DoraMetricsSnapshot[];
}

export interface RuleOutcome {
  passed: boolean;
  reason: string;
  evidence: Record<string, unknown> | null;
}

type Rule = { kind: ScorecardRuleKind; config: Record<string, unknown> };

export function evaluateRule(rule: Rule, ctx: RuleContext): RuleOutcome {
  switch (rule.kind) {
    case "field_present":
      return fieldPresent(rule.config, ctx.entity);
    case "has_owner":
      return ctx.ownerTeamIds.length > 0
        ? {
            passed: true,
            reason: "Has an owner team",
            evidence: { ownerTeamIds: ctx.ownerTeamIds },
          }
        : { passed: false, reason: "No owner team set", evidence: null };
    case "lifecycle_in":
      return lifecycleIn(rule.config, ctx.entity);
    case "tag_present":
      return tagPresent(rule.config, ctx.entity);
    case "dora_threshold":
      return doraThreshold(rule.config, ctx.dora);
    default: {
      const exhaustive: never = rule.kind;
      return { passed: false, reason: `Unknown rule kind: ${exhaustive}`, evidence: null };
    }
  }
}

function fieldPresent(config: Record<string, unknown>, entity: CatalogEntity): RuleOutcome {
  const field = String(config.field ?? "");
  const value = (entity as unknown as Record<string, unknown>)[field];
  const isEmpty =
    value === null || value === undefined || (typeof value === "string" && value.trim() === "");
  if (isEmpty) {
    return { passed: false, reason: `Field "${field}" is empty`, evidence: { field, value: null } };
  }
  return { passed: true, reason: `Field "${field}" is set`, evidence: { field } };
}

function lifecycleIn(config: Record<string, unknown>, entity: CatalogEntity): RuleOutcome {
  const values = Array.isArray(config.values) ? (config.values as Lifecycle[]) : [];
  const ok = values.includes(entity.lifecycle);
  return {
    passed: ok,
    reason: ok
      ? `Lifecycle "${entity.lifecycle}" is allowed`
      : `Lifecycle "${entity.lifecycle}" is not in [${values.join(", ")}]`,
    evidence: { lifecycle: entity.lifecycle, allowed: values },
  };
}

function tagPresent(config: Record<string, unknown>, entity: CatalogEntity): RuleOutcome {
  const tag = String(config.tag ?? "");
  const ok = entity.tags.includes(tag);
  return {
    passed: ok,
    reason: ok ? `Tag "${tag}" is present` : `Tag "${tag}" is missing`,
    evidence: { tag, tags: entity.tags },
  };
}

const DORA_FIELDS = [
  "deployFrequencyPerDay",
  "leadTimeHours",
  "changeFailureRate",
  "mttrHours",
] as const;
type DoraField = (typeof DORA_FIELDS)[number];

function doraThreshold(config: Record<string, unknown>, dora: DoraMetricsSnapshot[]): RuleOutcome {
  const metric = String(config.metric ?? "") as DoraField;
  const op = String(config.op ?? "") as "gte" | "lte";
  const value = Number(config.value);
  const window = String(config.window ?? "latest") as "latest" | "30d";
  if (!DORA_FIELDS.includes(metric) || (op !== "gte" && op !== "lte") || Number.isNaN(value)) {
    return { passed: false, reason: "Invalid dora_threshold config", evidence: { config } };
  }
  if (dora.length === 0) {
    return { passed: false, reason: "No DORA snapshots yet", evidence: { metric } };
  }
  const sorted = [...dora].sort((a, b) => b.periodEnd.getTime() - a.periodEnd.getTime());
  let measured: number;
  if (window === "latest") {
    measured = sorted[0]![metric] as number;
  } else {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = sorted.filter((s) => s.periodEnd.getTime() >= cutoff);
    if (recent.length === 0) {
      return { passed: false, reason: "No DORA snapshots in last 30 days", evidence: { metric } };
    }
    measured = recent.reduce((sum, s) => sum + (s[metric] as number), 0) / recent.length;
  }
  const passed = op === "gte" ? measured >= value : measured <= value;
  return {
    passed,
    reason: `${metric} ${window === "30d" ? "(30d avg) " : ""}${measured.toFixed(2)} ${op} ${value}: ${passed ? "pass" : "fail"}`,
    evidence: { metric, op, threshold: value, measured, window },
  };
}

export function appliesToKind(appliesTo: CatalogEntityKind[], kind: CatalogEntityKind): boolean {
  return appliesTo.length === 0 || appliesTo.includes(kind);
}
