// Backstage-style template.yaml definitions: validation, compilation and CRUD over ScaffoldTemplateDef.
import { prisma } from "@internal/db";
import type { ActionRegistry, Capability, CompiledTemplate } from "@internal/scaffolder-core";
import {
  compileYamlTemplate,
  parseYamlTemplate,
  wizardSchemaFromYaml,
  yamlTemplateSchema,
  YamlTemplateError,
  type YamlTemplate,
} from "@internal/scaffolder-templates-yaml-adapter";
import { EVERYONE_SUBJECT_ID } from "./acl";

export { wizardSchemaFromYaml, yamlTemplateSchema, type YamlTemplate };

export class TemplateDefValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TemplateDefValidationError";
  }
}

function assertActionsExist(template: YamlTemplate, actions: ActionRegistry): void {
  for (const step of template.spec.steps) {
    try {
      actions.require(step.action);
    } catch {
      throw new TemplateDefValidationError(`Unknown action: ${step.action}`);
    }
  }
}

// The declared capability set is the union of what the template's actions need.
function deriveCapabilities(template: YamlTemplate, actions: ActionRegistry): Capability[] {
  const out = new Set<Capability>();
  for (const step of template.spec.steps) {
    for (const capability of actions.require(step.action).capabilities) {
      out.add(capability);
    }
  }
  return [...out];
}

// Shared by CRUD, the registry and the editor preview. Throws YamlTemplateError,
// ZodError or TemplateDefValidationError on invalid sources.
export function validateTemplateSource(
  source: string,
  actions: ActionRegistry,
): { parsed: YamlTemplate; compiled: CompiledTemplate<Record<string, unknown>> } {
  const parsed = parseYamlTemplate(source);
  assertActionsExist(parsed, actions);
  const compiled = compileYamlTemplate(parsed);
  compiled.capabilities = deriveCapabilities(parsed, actions);
  return { parsed, compiled };
}

async function ensureDefaultAcl(templateId: string): Promise<void> {
  const existing = await prisma.templateAcl.findFirst({ where: { templateId } });
  if (existing) return;
  await prisma.templateAcl.create({
    data: {
      templateId,
      subjectType: "everyone",
      subjectId: EVERYONE_SUBJECT_ID,
      canView: true,
      canExecute: true,
    },
  });
}

export async function listTemplateDefs() {
  return prisma.scaffoldTemplateDef.findMany({ orderBy: { identifier: "asc" } });
}

export async function createTemplateDef(input: {
  source: string;
  userId: string;
  actions: ActionRegistry;
}) {
  const { parsed } = validateTemplateSource(input.source, input.actions);
  const row = await prisma.scaffoldTemplateDef.create({
    data: {
      identifier: parsed.metadata.name,
      source: input.source,
      createdByUserId: input.userId,
    },
  });
  await ensureDefaultAcl(parsed.metadata.name);
  return row;
}

export async function updateTemplateDef(input: {
  id: string;
  source: string;
  actions: ActionRegistry;
  enabled?: boolean;
}) {
  const existing = await prisma.scaffoldTemplateDef.findUnique({ where: { id: input.id } });
  if (!existing) return null;
  const { parsed } = validateTemplateSource(input.source, input.actions);
  if (parsed.metadata.name !== existing.identifier) {
    // Bindings, plans and ACLs key on the identifier, renaming would orphan them.
    throw new TemplateDefValidationError("metadata.name cannot be changed");
  }
  return prisma.scaffoldTemplateDef.update({
    where: { id: input.id },
    data: {
      source: input.source,
      ...(input.enabled === undefined ? {} : { enabled: input.enabled }),
    },
  });
}

export async function deleteTemplateDef(id: string): Promise<boolean> {
  const deleted = await prisma.scaffoldTemplateDef.deleteMany({ where: { id } });
  return deleted.count > 0;
}

export { YamlTemplateError };
