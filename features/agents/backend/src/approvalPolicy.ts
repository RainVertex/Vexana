import type { ToolApprovalMode, ToolApprovalPolicy } from "@internal/shared-types";

// Per-tool approval policy lookup. Resolution order:
//   1. Per-tool entry: policy[toolName]
//   2. Section default: policy._sectionDefaults[section]
//   3. Global default: "requires_approval"
//
// The global default deliberately errs on the cautious side: a brand-new
// agent with an empty policy ({}) effectively forbids autonomous writes
// until the operator opts specific tools into "auto". For chat-driven runs
// the existing prepare→submit confirmation IS the approval, so any
// policy of "requires_approval" passes through that flow unchanged.
//
// Note on backward compat: existing seeded agents (Platform Assistant,
// Catalog Enricher) have toolApprovalPolicy = {} from the migration. To
// preserve their pre-Pass-3 behavior the streamExecutor only enforces the
// gate for "forbidden" outcomes — chat already gates writes via
// *_prepare/*_submit. autonomous executor.ts paths enforce all three
// outcomes, since cron runs have no in-session human to confirm.

const GLOBAL_DEFAULT: ToolApprovalMode = "requires_approval";

export function decidePolicy(
  policy: ToolApprovalPolicy | null | undefined,
  toolName: string,
): ToolApprovalMode {
  if (!policy) return GLOBAL_DEFAULT;

  // Per-tool entry first.
  const direct = (policy as Record<string, unknown>)[toolName];
  if (isMode(direct)) return direct;

  // Section default. Tool naming convention: <section>_<verb>(_<phase>?)
  // e.g. "catalog_search", "team_request_prepare". The leading token
  // before the first underscore IS the section in every case the
  // platform's tool registry produces today.
  const section = sectionFromToolName(toolName);
  const sectionDef = policy._sectionDefaults?.[section];
  if (isMode(sectionDef)) return sectionDef;

  return GLOBAL_DEFAULT;
}

function sectionFromToolName(toolName: string): string {
  const idx = toolName.indexOf("_");
  return idx === -1 ? toolName : toolName.slice(0, idx);
}

function isMode(value: unknown): value is ToolApprovalMode {
  return value === "auto" || value === "requires_approval" || value === "forbidden";
}
