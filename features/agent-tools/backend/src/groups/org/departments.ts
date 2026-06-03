import type { RegisteredTool } from "@internal/llm-core";
import { requireUserId } from "../core";
import { listDepartmentsQuery, getDepartmentBySlug } from "./queries";

export const listDepartments: RegisteredTool = {
  id: "org_list_departments",
  openaiDef: {
    type: "function",
    function: {
      name: "org_list_departments",
      description: "List all departments with their slug, name, and team count.",
      parameters: { type: "object", properties: {} },
    },
  },
  handler: async (_args, ctx) => {
    requireUserId(ctx);
    return { departments: await listDepartmentsQuery() };
  },
};

export const getDepartment: RegisteredTool = {
  id: "org_get_department",
  openaiDef: {
    type: "function",
    function: {
      name: "org_get_department",
      description: "Fetch a single department by slug, including its teams (slugs and names).",
      parameters: {
        type: "object",
        properties: { slug: { type: "string" } },
        required: ["slug"],
      },
    },
  },
  handler: async (args, ctx) => {
    requireUserId(ctx);
    const { slug } = args as { slug: string };
    const dept = await getDepartmentBySlug(slug);
    return dept ?? { error: "Not found" };
  },
};
