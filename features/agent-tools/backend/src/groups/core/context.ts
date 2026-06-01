import type { ToolContext } from "@internal/llm-core";

export function requireUserId(ctx: ToolContext): string {
  if (!ctx.userId) throw new Error("Not authenticated");
  return ctx.userId;
}
