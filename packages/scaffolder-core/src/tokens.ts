// Backstage-style ${{ }} step-input templating with two-phase resolution.
// Plan phase resolves parameters/user/entity, apply phase additionally resolves
// steps.<id>.output.* once prior step outputs exist.
import { renderWithContext } from "./render";

export interface StepTemplateContext {
  parameters: Record<string, unknown>;
  user: Record<string, unknown> | null;
  entity: Record<string, unknown> | null;
  steps?: Record<string, { output: unknown }>;
}

const TOKEN_RE = /\$\{\{([\s\S]+?)\}\}/g;
const HAS_TOKEN_RE = /\$\{\{[\s\S]+?\}\}/;
const FULL_TOKEN_RE = /^\$\{\{([\s\S]+?)\}\}$/;
const STEPS_REF_RE = /(^|[^\w.])steps\s*[.[]/;

export function containsToken(value: unknown): boolean {
  if (typeof value === "string") return HAS_TOKEN_RE.test(value);
  if (Array.isArray(value)) return value.some(containsToken);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(containsToken);
  }
  return false;
}

function buildContext(ctx: StepTemplateContext): Record<string, unknown> {
  return {
    parameters: ctx.parameters,
    user: ctx.user,
    entity: ctx.entity,
    steps: ctx.steps ?? {},
  };
}

// Full-token strings keep their native type by piping through the dump filter.
function renderNative(expression: string, context: Record<string, unknown>): unknown {
  const rendered = renderWithContext(`\${{ ( ${expression} ) | dump }}`, context);
  if (rendered.trim() === "") return null;
  try {
    return JSON.parse(rendered);
  } catch {
    return rendered;
  }
}

function resolveString(value: string, ctx: StepTemplateContext, phase: "plan" | "apply"): unknown {
  const context = buildContext(ctx);

  const full = FULL_TOKEN_RE.exec(value.trim());
  if (full) {
    const expression = full[1]!.trim();
    if (phase === "plan" && STEPS_REF_RE.test(expression)) return value;
    return renderNative(expression, context);
  }

  if (phase === "plan") {
    // Mask steps-referencing expressions so they survive the render verbatim for the apply pass.
    const deferred: string[] = [];
    const masked = value.replace(TOKEN_RE, (token, expression: string) => {
      if (!STEPS_REF_RE.test(expression)) return token;
      deferred.push(token);
      return `__SCAFFOLDER_DEFER_${deferred.length - 1}__`;
    });
    const rendered = renderWithContext(masked, context);
    return rendered.replace(/__SCAFFOLDER_DEFER_(\d+)__/g, (_m, index: string) => {
      return deferred[Number(index)]!;
    });
  }

  return renderWithContext(value, context);
}

export function resolveTokens(
  value: unknown,
  ctx: StepTemplateContext,
  phase: "plan" | "apply",
): unknown {
  if (typeof value === "string") return resolveString(value, ctx, phase);
  if (Array.isArray(value)) return value.map((v) => resolveTokens(v, ctx, phase));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = resolveTokens(v, ctx, phase);
    }
    return out;
  }
  return value;
}
