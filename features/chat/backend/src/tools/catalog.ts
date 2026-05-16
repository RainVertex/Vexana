import { prisma } from "@internal/db";
import type { RegisteredTool } from "@feature/agents-backend";
import { requireUserId } from "./core";

// Catalog read tools. ACL gating mirrors the catalog backend: admins see
// everything, members see all entities, guests see only entities they have
// a non-expired GuestGrant for. This is the same predicate the UI's
// /api/catalog endpoint enforces.

async function userCanSeeEntity(args: {
  userId: string;
  isAdmin: boolean;
  entityId: string;
}): Promise<boolean> {
  if (args.isAdmin) return true;
  const user = await prisma.user.findUnique({
    where: { id: args.userId },
    select: { role: true },
  });
  if (!user) return false;
  if (user.role !== "guest") return true;
  const grant = await prisma.guestGrant.findFirst({
    where: {
      granteeId: args.userId,
      resourceType: "catalog_entity",
      resourceId: args.entityId,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true },
  });
  return grant != null;
}

async function filterEntitiesByGrant<T extends { id: string }>(args: {
  userId: string;
  isAdmin: boolean;
  entities: T[];
}): Promise<T[]> {
  if (args.isAdmin || args.entities.length === 0) return args.entities;
  const user = await prisma.user.findUnique({
    where: { id: args.userId },
    select: { role: true },
  });
  if (!user) return [];
  if (user.role !== "guest") return args.entities;
  const grants = await prisma.guestGrant.findMany({
    where: {
      granteeId: args.userId,
      resourceType: "catalog_entity",
      resourceId: { in: args.entities.map((e) => e.id) },
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { resourceId: true },
  });
  const allowed = new Set(grants.map((g) => g.resourceId));
  return args.entities.filter((e) => allowed.has(e.id));
}

const search: RegisteredTool = {
  id: "catalog_search",
  openaiDef: {
    type: "function",
    function: {
      name: "catalog_search",
      description:
        "Search catalog entities (services, APIs, libraries, websites, databases, infrastructure) by name or description. Case-insensitive substring match. Returns up to 20 hits.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search term (substring of name or description)." },
          kind: {
            type: "string",
            description:
              "Optional filter by kind: service | api | library | website | database | infrastructure.",
          },
        },
        required: ["query"],
      },
    },
  },
  handler: async (args, ctx) => {
    const userId = requireUserId(ctx);
    const { query, kind } = args as { query: string; kind?: string };
    const where: Record<string, unknown> = {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ],
    };
    if (kind) where.kind = kind;
    const rows = await prisma.catalogEntity.findMany({
      where,
      take: 20,
      orderBy: { name: "asc" },
      select: { id: true, name: true, kind: true, lifecycle: true, description: true },
    });
    const filtered = await filterEntitiesByGrant({ userId, isAdmin: ctx.isAdmin, entities: rows });
    return { hits: filtered };
  },
};

const getEntity: RegisteredTool = {
  id: "catalog_get_entity",
  openaiDef: {
    type: "function",
    function: {
      name: "catalog_get_entity",
      description: "Fetch a catalog entity by id, including its owning teams.",
      parameters: {
        type: "object",
        properties: { entityId: { type: "string" } },
        required: ["entityId"],
      },
    },
  },
  handler: async (args, ctx) => {
    const userId = requireUserId(ctx);
    const { entityId } = args as { entityId: string };
    const ok = await userCanSeeEntity({ userId, isAdmin: ctx.isAdmin, entityId });
    if (!ok) return { error: "Not authorized to view this entity" };
    const e = await prisma.catalogEntity.findUnique({
      where: { id: entityId },
      include: {
        owners: {
          include: { team: { select: { id: true, slug: true, name: true } } },
        },
      },
    });
    if (!e) return { error: "Not found" };
    return {
      id: e.id,
      name: e.name,
      kind: e.kind,
      lifecycle: e.lifecycle,
      description: e.description,
      repoUrl: e.repoUrl,
      tags: e.tags,
      owners: e.owners.map((o) => o.team),
    };
  },
};

const ownedByTeam: RegisteredTool = {
  id: "catalog_owned_by_team",
  openaiDef: {
    type: "function",
    function: {
      name: "catalog_owned_by_team",
      description: "List catalog entities owned by a team (by team slug).",
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
    if (!team) return { error: "Team not found" };
    const rows = await prisma.catalogEntity.findMany({
      where: { owners: { some: { teamId: team.id } } },
      select: { id: true, name: true, kind: true, lifecycle: true },
      orderBy: { name: "asc" },
      take: 50,
    });
    const filtered = await filterEntitiesByGrant({ userId, isAdmin: ctx.isAdmin, entities: rows });
    return { team: { id: team.id, slug: team.slug, name: team.name }, entities: filtered };
  },
};

export const CATALOG_READ_TOOLS: RegisteredTool[] = [search, getEntity, ownedByTeam];
export const CATALOG_READ_TOOL_IDS = CATALOG_READ_TOOLS.map((t) => t.id);
