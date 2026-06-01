import type { RegisteredTool } from "@internal/llm-core";
import { requireUserId } from "../core";
import { findTeamDetail, findTeamIdentity, isTeamMember, listTeamMembers } from "./queries";

export const getTeam: RegisteredTool = {
  id: "teams_get",
  openaiDef: {
    type: "function",
    function: {
      name: "teams_get",
      description: "Fetch a single team by slug. Public — any authenticated user can read.",
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
    const team = await findTeamDetail(slug);
    return team ?? { error: "Not found" };
  },
};

export const listMembers: RegisteredTool = {
  id: "teams_list_members",
  openaiDef: {
    type: "function",
    function: {
      name: "teams_list_members",
      description:
        "List the members of a team by slug, including each member's role (lead or member). The caller must be a member of the team or an admin.",
      parameters: {
        type: "object",
        properties: { slug: { type: "string" } },
        required: ["slug"],
      },
    },
  },
  handler: async (args, ctx) => {
    const userId = requireUserId(ctx);
    const { slug } = args as { slug: string };
    const team = await findTeamIdentity(slug);
    if (!team) return { error: "Not found" };
    if (!ctx.isAdmin && !(await isTeamMember(team.id, userId))) {
      return { error: "Not authorized to view this team's members" };
    }
    return { team, members: await listTeamMembers(team.id) };
  },
};
