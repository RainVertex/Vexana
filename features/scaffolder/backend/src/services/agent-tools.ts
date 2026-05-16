import { toAnthropicTool, type Actor, type AnthropicToolDef } from "@internal/scaffolder-core";
import { getTemplateRegistry } from "./registry";
import { filterByTemplateAcl } from "./acl";

export async function getScaffolderTools(
  actor: Actor,
  isAdmin: boolean,
): Promise<AnthropicToolDef[]> {
  const templates = getTemplateRegistry().list();
  const visible = await filterByTemplateAcl(templates, actor, isAdmin);
  return visible
    .filter((t) => t.metadata.audience.includes("agent"))
    .map((t) =>
      toAnthropicTool({
        name: `scaffolder_${t.metadata.id.replace(/-/g, "_")}`,
        description: `${t.metadata.name}. ${t.metadata.description} Returns a Plan that must be applied separately.`,
        schema: t.parameters,
      }),
    );
}
