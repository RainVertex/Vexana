// Wire shapes for scorecards: tier definitions, rules, and per-entity evaluation results.
import type { ID, ISODateString, Timestamped } from "./common";
import type { CatalogEntityKind } from "./catalog";

export type ScorecardTierStyle = "stage" | "threshold";

// Stage-style ordering: bronze < silver < gold.
export type ScorecardTier =
  | "bronze"
  | "silver"
  | "gold"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "none";

export type ScorecardRuleKind =
  | "field_present"
  | "has_owner"
  | "lifecycle_in"
  | "tag_present"
  | "dora_threshold";

export interface Scorecard extends Timestamped {
  id: ID;
  slug: string;
  name: string;
  description: string | null;
  appliesTo: CatalogEntityKind[];
  tierStyle: ScorecardTierStyle;
  enabled: boolean;
  rules?: ScorecardRule[];
}

export interface ScorecardRule {
  id: ID;
  scorecardId: ID;
  key: string;
  label: string;
  kind: ScorecardRuleKind;
  config: Record<string, unknown>;
  weight: number;
  tier: Exclude<ScorecardTier, "none">;
}

export interface ScorecardResultRow {
  id: ID;
  scorecardId: ID;
  ruleId: ID;
  entityId: ID;
  passed: boolean;
  reason: string | null;
  evidence: Record<string, unknown> | null;
  evaluatedAt: ISODateString;
}

export interface ScorecardSummary {
  scorecard: Pick<Scorecard, "id" | "slug" | "name" | "tierStyle">;
  tier: ScorecardTier;
  // Weighted pass ratio (sum of passed rule weights over total weight), 0 to 100.
  scorePercent: number;
  rulesPassed: number;
  rulesTotal: number;
  rules: Array<{
    rule: Pick<ScorecardRule, "id" | "key" | "label" | "kind" | "tier">;
    result: ScorecardResultRow | null;
  }>;
}

// One entity's standing in a scorecard leaderboard.
export interface ScorecardReportRow {
  entity: { id: ID; name: string; kind: CatalogEntityKind };
  ownerTeamIds: ID[];
  tier: ScorecardTier;
  scorePercent: number;
  rulesPassed: number;
  rulesTotal: number;
}

export interface ScorecardReport {
  scorecard: Pick<Scorecard, "id" | "slug" | "name" | "tierStyle">;
  rows: ScorecardReportRow[];
}

// A single point in an entity's tier and score history for a scorecard.
export interface ScorecardHistoryPoint {
  tier: ScorecardTier;
  scorePercent: number;
  rulesPassed: number;
  rulesTotal: number;
  capturedAt: ISODateString;
}
