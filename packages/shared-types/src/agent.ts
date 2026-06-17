// LLM provider kind and tool-approval primitives. These stay in shared-types because the
// llm-core package consumes them, and shared packages cannot import feature packages.
export type ProviderKind = "openai_compat" | "openai_responses" | "anthropic" | "gemini";

export type ToolApprovalMode = "auto" | "requires_approval" | "forbidden";

export interface ToolApprovalPolicy {
  [toolName: string]: ToolApprovalMode | Record<string, ToolApprovalMode> | undefined;
  _sectionDefaults?: Record<string, ToolApprovalMode>;
}
