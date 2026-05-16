import { prisma } from "@internal/db";
import type { RegisteredTool } from "@feature/agents-backend";
import { requireUserId } from "./core";

// Workspace (Plane mirror) read tools. Mirror the MyWorkDto query at
// features/workspace/backend/src/routes.ts:429 — we don't re-implement the
// join, just call it through Prisma with the same predicates so the chatbot
// sees what the user sees in /workspace.

const myWork: RegisteredTool = {
  id: "workspace_my_work",
  openaiDef: {
    type: "function",
    function: {
      name: "workspace_my_work",
      description:
        "List the current user's open work items in the linked Plane integration. Optionally filter by date range. Returns name, project, state, priority, target date, and id for each. Use this for 'what do I need to do today/this week' questions.",
      parameters: {
        type: "object",
        properties: {
          dueOnOrBefore: {
            type: "string",
            description:
              "Optional ISO date (YYYY-MM-DD). If set, only items whose targetDate is on or before this date are returned.",
          },
        },
      },
    },
  },
  handler: async (args, ctx) => {
    const userId = requireUserId(ctx);
    const { dueOnOrBefore } = (args as { dueOnOrBefore?: string }) ?? {};
    const mappings = await prisma.planeUserMapping.findMany({
      where: { platformUserId: userId },
      include: { member: { select: { externalId: true } } },
    });
    if (mappings.length === 0) {
      return { needsUserMapping: true, items: [] };
    }
    const externalIds = mappings.map((m) => m.member.externalId);
    const where: Record<string, unknown> = {
      assigneeIds: { hasSome: externalIds },
      completedAt: null,
    };
    if (dueOnOrBefore) {
      const cutoff = new Date(`${dueOnOrBefore}T23:59:59.999Z`);
      where.targetDate = { lte: cutoff };
    }
    const items = await prisma.planeWorkItem.findMany({
      where,
      include: {
        state: { select: { name: true, group: true } },
        project: { select: { id: true, identifier: true, name: true } },
      },
      orderBy: [{ targetDate: "asc" }, { externalUpdatedAt: "desc" }],
      take: 50,
    });
    return {
      items: items.map((w) => ({
        id: w.id,
        sequenceId: w.sequenceId,
        name: w.name,
        priority: w.priority,
        state: w.state ? { name: w.state.name, group: w.state.group } : null,
        targetDate: w.targetDate?.toISOString().slice(0, 10) ?? null,
        project: w.project,
      })),
    };
  },
};

const myOpenItems: RegisteredTool = {
  id: "workspace_my_open_items",
  openaiDef: {
    type: "function",
    function: {
      name: "workspace_my_open_items",
      description:
        "List ALL of the current user's open work items (no date filter). Use when the user asks about their full backlog.",
      parameters: { type: "object", properties: {} },
    },
  },
  handler: myWork.handler, // same implementation; the date filter is optional
};

const getWorkItem: RegisteredTool = {
  id: "workspace_get_workitem",
  openaiDef: {
    type: "function",
    function: {
      name: "workspace_get_workitem",
      description: "Fetch a single work item by id (the cuid, not the sequence id).",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
  },
  handler: async (args, ctx) => {
    const userId = requireUserId(ctx);
    const { id } = args as { id: string };
    const item = await prisma.planeWorkItem.findUnique({
      where: { id },
      include: {
        state: { select: { name: true, group: true } },
        project: { select: { id: true, identifier: true, name: true } },
      },
    });
    if (!item) return { error: "Not found" };
    // Authorization: must be assignee, OR admin, OR a member of any team that
    // owns the project's catalog entity. Phase 1 keeps it simple — assignee
    // OR admin only; team-of-project gating can be layered on once we map
    // PlaneProject to teams.
    if (!ctx.isAdmin) {
      const mappings = await prisma.planeUserMapping.findMany({
        where: { platformUserId: userId },
        select: { member: { select: { externalId: true } } },
      });
      const mine = mappings.map((m) => m.member.externalId);
      const overlap = item.assigneeIds.some((a) => mine.includes(a));
      if (!overlap) return { error: "Not authorized to view this work item" };
    }
    return {
      id: item.id,
      sequenceId: item.sequenceId,
      name: item.name,
      description: item.description,
      priority: item.priority,
      state: item.state,
      targetDate: item.targetDate?.toISOString().slice(0, 10) ?? null,
      startDate: item.startDate?.toISOString().slice(0, 10) ?? null,
      completedAt: item.completedAt?.toISOString() ?? null,
      project: item.project,
    };
  },
};

const teamWork: RegisteredTool = {
  id: "workspace_team_work",
  openaiDef: {
    type: "function",
    function: {
      name: "workspace_team_work",
      description:
        "List open work items for a team, by team slug. The caller must be a member of the team (or admin).",
      parameters: {
        type: "object",
        properties: { teamSlug: { type: "string" } },
        required: ["teamSlug"],
      },
    },
  },
  handler: async (args, ctx) => {
    const userId = requireUserId(ctx);
    const { teamSlug } = args as { teamSlug: string };
    const team = await prisma.team.findFirst({ where: { slug: teamSlug, deletedAt: null } });
    if (!team) return { error: `No team with slug ${teamSlug}` };
    if (!ctx.isAdmin) {
      const m = await prisma.teamMembership.findUnique({
        where: { teamId_userId: { teamId: team.id, userId } },
      });
      if (!m) return { error: "Not a member of this team" };
    }
    // Plane projects don't currently link to platform teams. v1 returns the
    // open work items across projects whose team's members are mapped to
    // Plane: union of all members' Plane externalIds, intersected with
    // assignees. This matches what the Workspace UI shows for a team.
    const memberIds = await prisma.teamMembership.findMany({
      where: { teamId: team.id },
      select: { userId: true },
    });
    const mappings = await prisma.planeUserMapping.findMany({
      where: { platformUserId: { in: memberIds.map((m) => m.userId) } },
      select: { member: { select: { externalId: true } } },
    });
    if (mappings.length === 0) return { items: [] };
    const externalIds = mappings.map((m) => m.member.externalId);
    const items = await prisma.planeWorkItem.findMany({
      where: { assigneeIds: { hasSome: externalIds }, completedAt: null },
      include: {
        state: { select: { name: true, group: true } },
        project: { select: { id: true, identifier: true, name: true } },
      },
      orderBy: [{ targetDate: "asc" }],
      take: 50,
    });
    return {
      team: { id: team.id, slug: team.slug, name: team.name },
      items: items.map((w) => ({
        id: w.id,
        name: w.name,
        priority: w.priority,
        state: w.state,
        assigneeIds: w.assigneeIds,
        targetDate: w.targetDate?.toISOString().slice(0, 10) ?? null,
        project: w.project,
      })),
    };
  },
};

const listSprints: RegisteredTool = {
  id: "workspace_list_sprints",
  openaiDef: {
    type: "function",
    function: {
      name: "workspace_list_sprints",
      description: "List active and upcoming Plane cycles (sprints) across all projects.",
      parameters: { type: "object", properties: {} },
    },
  },
  handler: async (_args, ctx) => {
    requireUserId(ctx);
    const cycles = await prisma.planeCycle.findMany({
      where: { OR: [{ endDate: null }, { endDate: { gte: new Date() } }] },
      orderBy: { startDate: "asc" },
      take: 20,
      include: { project: { select: { id: true, identifier: true, name: true } } },
    });
    return {
      cycles: cycles.map((c) => ({
        id: c.id,
        name: c.name,
        startDate: c.startDate?.toISOString().slice(0, 10) ?? null,
        endDate: c.endDate?.toISOString().slice(0, 10) ?? null,
        project: c.project,
      })),
    };
  },
};

const getSprint: RegisteredTool = {
  id: "workspace_get_sprint",
  openaiDef: {
    type: "function",
    function: {
      name: "workspace_get_sprint",
      description: "Fetch a single Plane cycle by id along with its work items.",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
  },
  handler: async (args, ctx) => {
    requireUserId(ctx);
    const { id } = args as { id: string };
    const cycle = await prisma.planeCycle.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, identifier: true, name: true } },
      },
    });
    if (!cycle) return { error: "Not found" };
    const items = await prisma.planeWorkItem.findMany({
      where: { cycleId: id },
      include: { state: { select: { name: true, group: true } } },
      take: 50,
    });
    return {
      id: cycle.id,
      name: cycle.name,
      startDate: cycle.startDate?.toISOString().slice(0, 10) ?? null,
      endDate: cycle.endDate?.toISOString().slice(0, 10) ?? null,
      project: cycle.project,
      items: items.map((w) => ({
        id: w.id,
        name: w.name,
        priority: w.priority,
        state: w.state,
      })),
    };
  },
};

export const WORKSPACE_READ_TOOLS: RegisteredTool[] = [
  myWork,
  myOpenItems,
  getWorkItem,
  teamWork,
  listSprints,
  getSprint,
];

export const WORKSPACE_READ_TOOL_IDS = WORKSPACE_READ_TOOLS.map((t) => t.id);
