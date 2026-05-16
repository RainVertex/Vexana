import { z } from "zod";
import { defineTemplate } from "@internal/scaffolder-core";
import { skeletonPath } from "./paths";

const Params = z.object({
  name: z
    .string()
    .regex(/^[a-z][a-z0-9-]*$/, "widget name must be kebab-case starting with a letter"),
});

export const inRepoWidgetTemplate = defineTemplate({
  metadata: {
    id: "in-repo-widget",
    version: "1.0.0",
    name: "Home-page widget",
    description: "Scaffolds a home-page widget under apps/web/src/widgets.",
    tags: ["widget", "monorepo"],
    icon: "layout",
    audience: ["human"],
    requiredRole: "member",
  },
  parameters: Params,
  capabilities: ["fs:write", "fs:write:main"],
  plan: (params, ctx) => {
    const pascal = ctx.toPascal(params.name);
    return [
      {
        action: "fetch:template",
        input: {
          skeletonPath: skeletonPath("in-repo-widget"),
          values: { name: params.name, pascal },
          pathSubstitutions: { __PASCAL__: pascal },
        },
      },
      {
        action: "repo:scaffold",
        input: { targetDir: `apps/web/src/widgets/${params.name}` },
      },
    ];
  },
});
