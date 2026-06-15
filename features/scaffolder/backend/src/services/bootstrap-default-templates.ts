// Seeds the curated DEFAULT_TEMPLATES into ScaffoldTemplateDef on boot, idempotent by identifier.
import { prisma } from "@internal/db";
import { DEFAULT_TEMPLATES } from "../default-templates";
import { getActionRegistry, invalidateTemplateCache } from "./registry";
import { createTemplateDef } from "./template-defs";

export async function seedDefaultTemplates(): Promise<{ created: number; skipped: number }> {
  const identifiers = DEFAULT_TEMPLATES.map((t) => t.identifier);
  const existing = await prisma.scaffoldTemplateDef.findMany({
    where: { identifier: { in: identifiers } },
    select: { identifier: true },
  });
  const have = new Set(existing.map((r) => r.identifier));
  const missing = DEFAULT_TEMPLATES.filter((t) => !have.has(t.identifier));
  if (missing.length === 0) return { created: 0, skipped: DEFAULT_TEMPLATES.length };

  // Templates need a creator (FK to User). Use a human admin as the platform owner; if none
  // exists yet (fresh DB before first login) defer, the next boot retries.
  const owner = await prisma.user.findFirst({
    where: { role: "admin", userKind: "human" },
    select: { id: true },
  });
  if (!owner) return { created: 0, skipped: DEFAULT_TEMPLATES.length };

  const actions = getActionRegistry();
  let created = 0;
  for (const tpl of missing) {
    await createTemplateDef({ source: tpl.source, userId: owner.id, actions });
    created++;
  }
  invalidateTemplateCache();
  return { created, skipped: DEFAULT_TEMPLATES.length - created };
}
