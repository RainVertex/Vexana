import { useMemo } from "react";
import type {
  AgentToolDescriptor,
  ToolApprovalMode,
  ToolApprovalPolicy,
} from "@internal/shared-types";

// ToolApprovalMatrix, composes the per-agent toolApprovalPolicy JSON. Two
// rows of controls:
//
// 1. Section defaults, one mode per top-level section ("catalog"
// "scaffolder", etc.). The mode applies to every tool in that section
// unless overridden.
// 2. Per-tool overrides, for each tool the agent has in its allowlist
// a select that overrides the section default. "(default)" means the
// section default applies.
//
// The shape we emit matches what the backend's decidePolicy() reads:
// { _sectionDefaults: { catalog: "auto", ... }, "catalog_search": "auto", ... }

const MODES: ReadonlyArray<{ value: ToolApprovalMode; label: string; description: string }> = [
  { value: "auto", label: "auto", description: "Run without prompting" },
  {
    value: "requires_approval",
    label: "requires approval",
    description: "Chat: prepare/submit confirms; autonomous: pending inbox row",
  },
  { value: "forbidden", label: "forbidden", description: "Refused outright" },
];

export interface ToolApprovalMatrixProps {
  policy: ToolApprovalPolicy;
  /** Tools the agent is allowed to call at all (Agent.toolIds). */
  enabledToolIds: string[];
  /** All tool descriptors so we can show human-readable names. */
  tools: AgentToolDescriptor[];
  onChange: (next: ToolApprovalPolicy) => void;
}

function sectionFor(toolId: string): string {
  const idx = toolId.indexOf("_");
  return idx === -1 ? toolId : toolId.slice(0, idx);
}

export function ToolApprovalMatrix({
  policy,
  enabledToolIds,
  tools,
  onChange,
}: ToolApprovalMatrixProps) {
  // Derive the unique sections present in the enabled tool list.
  const sections = useMemo(() => {
    const set = new Set<string>();
    for (const id of enabledToolIds) set.add(sectionFor(id));
    return [...set].sort();
  }, [enabledToolIds]);

  const sectionDefaults = (policy._sectionDefaults ?? {}) as Record<string, ToolApprovalMode>;

  function setSectionDefault(section: string, mode: ToolApprovalMode | "") {
    const nextDefaults = { ...sectionDefaults };
    if (mode === "") delete nextDefaults[section];
    else nextDefaults[section] = mode;
    onChange({ ...policy, _sectionDefaults: nextDefaults });
  }

  function setToolOverride(toolId: string, mode: ToolApprovalMode | "") {
    const next = { ...policy } as Record<string, unknown>;
    if (mode === "") delete next[toolId];
    else next[toolId] = mode;
    onChange(next as ToolApprovalPolicy);
  }

  function toolMode(toolId: string): ToolApprovalMode | "" {
    const direct = (policy as Record<string, unknown>)[toolId];
    if (direct === "auto" || direct === "requires_approval" || direct === "forbidden") {
      return direct;
    }
    return "";
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-app-text-muted">
          Section defaults
        </h4>
        <p className="mb-2 text-xs text-app-text-muted">
          Applied when no per-tool override matches. Falls back to{" "}
          <code className="text-app-text">requires_approval</code> if neither is set.
        </p>
        <div className="space-y-1.5">
          {sections.length === 0 && (
            <p className="text-xs text-app-text-muted">
              No tools selected yet. Add tools above to configure approval defaults.
            </p>
          )}
          {sections.map((section) => (
            <div key={section} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-sm text-app-text">{section}</span>
              <select
                value={sectionDefaults[section] ?? ""}
                onChange={(e) =>
                  setSectionDefault(section, e.target.value as ToolApprovalMode | "")
                }
                className="rounded-md border border-app-border bg-app-surface px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary"
              >
                <option value="">(global default — requires_approval)</option>
                {MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-app-text-muted">
          Per-tool overrides
        </h4>
        {enabledToolIds.length === 0 ? (
          <p className="text-xs text-app-text-muted">No tools selected.</p>
        ) : (
          <div className="rounded-md border border-app-border">
            <table className="w-full text-sm">
              <thead className="border-b border-app-border bg-app-surface-hover">
                <tr className="text-left text-xs uppercase tracking-wide text-app-text-muted">
                  <th className="px-3 py-2">Tool</th>
                  <th className="px-3 py-2">Mode</th>
                </tr>
              </thead>
              <tbody>
                {enabledToolIds.map((toolId) => {
                  const tool = tools.find((t) => t.id === toolId);
                  return (
                    <tr key={toolId} className="border-t border-app-border">
                      <td className="px-3 py-2">
                        <div className="text-app-text">{tool?.name ?? toolId}</div>
                        {tool?.description && (
                          <div className="text-xs text-app-text-muted">{tool.description}</div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={toolMode(toolId)}
                          onChange={(e) =>
                            setToolOverride(toolId, e.target.value as ToolApprovalMode | "")
                          }
                          className="rounded-md border border-app-border bg-app-surface px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary"
                        >
                          <option value="">(use section default)</option>
                          {MODES.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
