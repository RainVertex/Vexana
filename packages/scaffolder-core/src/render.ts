import nunjucks from "nunjucks";
import { stringHelpers } from "./plan-ctx";

// Backstage uses ${{ ... }} for parameter interpolation. Nunjucks ships with
// {{ ... }} by default; the tag overrides below switch it to the Backstage
// dialect so skeletons stay portable.
const TAGS = {
  blockStart: "${%",
  blockEnd: "%}",
  variableStart: "${{",
  variableEnd: "}}",
  commentStart: "${#",
  commentEnd: "#}",
};

function buildEnv(): nunjucks.Environment {
  const env = new nunjucks.Environment(null, {
    autoescape: false,
    throwOnUndefined: false,
    tags: TAGS,
  });
  env.addFilter("kebabCase", (s: string) => stringHelpers.toKebab(s));
  env.addFilter("camelCase", (s: string) => stringHelpers.toCamel(s));
  env.addFilter("pascalCase", (s: string) => stringHelpers.toPascal(s));
  env.addFilter("titleCase", (s: string) => stringHelpers.toTitle(s));
  env.addFilter("dump", (v: unknown) => JSON.stringify(v));
  return env;
}

const sharedEnv: nunjucks.Environment = buildEnv();

export function renderTemplate(source: string, values: Record<string, unknown>): string {
  return sharedEnv.renderString(source, { values });
}

// Returns true when the source contains any ${{ }} or ${% %} tag, so callers
// can short-circuit pure copies without an unnecessary render pass.
export function hasTemplating(source: string): boolean {
  return source.includes("${{") || source.includes("${%");
}
