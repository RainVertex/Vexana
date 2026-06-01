import { prisma } from "@internal/db";

export async function searchEntities(query: string, kind?: string) {
  const where: Record<string, unknown> = {
    OR: [
      { name: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
    ],
  };
  if (kind) where.kind = kind;
  return prisma.catalogEntity.findMany({
    where,
    take: 20,
    orderBy: { name: "asc" },
    select: { id: true, name: true, kind: true, lifecycle: true, description: true },
  });
}

export async function getEntityById(entityId: string) {
  const e = await prisma.catalogEntity.findUnique({
    where: { id: entityId },
    include: {
      owners: {
        include: { team: { select: { id: true, slug: true, name: true } } },
      },
    },
  });
  if (!e) return null;
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
}

export async function entitiesOwnedByTeam(teamSlug: string) {
  const team = await prisma.team.findFirst({ where: { slug: teamSlug, deletedAt: null } });
  if (!team) return null;
  const entities = await prisma.catalogEntity.findMany({
    where: { owners: { some: { teamId: team.id } } },
    select: { id: true, name: true, kind: true, lifecycle: true },
    orderBy: { name: "asc" },
    take: 50,
  });
  return { team: { id: team.id, slug: team.slug, name: team.name }, entities };
}
