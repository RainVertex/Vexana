// Data-driven descriptors for the rule builder: which config fields each rule kind needs.
import type { ScorecardRuleKind, ScorecardTierStyle } from "@feature/scorecards-shared";

export const ENTITY_KINDS = [
  "service",
  "api",
  "library",
  "website",
  "database",
  "infrastructure",
] as const;

export const LIFECYCLES = ["experimental", "production", "deprecated", "development"] as const;

export const STAGE_TIERS = ["bronze", "silver", "gold"] as const;
export const THRESHOLD_TIERS = ["red", "orange", "yellow", "green"] as const;

export const DORA_METRICS = [
  "deployFrequencyPerDay",
  "leadTimeHours",
  "changeFailureRate",
  "mttrHours",
] as const;

export const DORA_OPS = ["gte", "lte"] as const;
export const DORA_WINDOWS = ["latest", "30d"] as const;

export type RuleFieldType =
  | "text"
  | "tag"
  | "lifecycles"
  | "doraMetric"
  | "op"
  | "number"
  | "window";

export interface RuleFieldDef {
  key: string;
  label: string;
  type: RuleFieldType;
}

export interface RuleKindDef {
  kind: ScorecardRuleKind;
  label: string;
  fields: RuleFieldDef[];
  defaultConfig: Record<string, unknown>;
}

export const RULE_KINDS: RuleKindDef[] = [
  { kind: "has_owner", label: "Has an owner team", fields: [], defaultConfig: {} },
  {
    kind: "field_present",
    label: "Field present",
    fields: [{ key: "field", label: "Entity field", type: "text" }],
    defaultConfig: { field: "description" },
  },
  {
    kind: "lifecycle_in",
    label: "Lifecycle is one of",
    fields: [{ key: "values", label: "Allowed lifecycles", type: "lifecycles" }],
    defaultConfig: { values: ["production"] },
  },
  {
    kind: "tag_present",
    label: "Tag present",
    fields: [{ key: "tag", label: "Required tag", type: "tag" }],
    defaultConfig: { tag: "" },
  },
  {
    kind: "dora_threshold",
    label: "DORA threshold",
    fields: [
      { key: "metric", label: "Metric", type: "doraMetric" },
      { key: "op", label: "Comparison", type: "op" },
      { key: "value", label: "Value", type: "number" },
      { key: "window", label: "Window", type: "window" },
    ],
    defaultConfig: { metric: "deployFrequencyPerDay", op: "gte", value: 1, window: "latest" },
  },
];

export function ruleKindDef(kind: string): RuleKindDef | undefined {
  return RULE_KINDS.find((k) => k.kind === kind);
}

export function tiersFor(tierStyle: ScorecardTierStyle): readonly string[] {
  return tierStyle === "stage" ? STAGE_TIERS : THRESHOLD_TIERS;
}
