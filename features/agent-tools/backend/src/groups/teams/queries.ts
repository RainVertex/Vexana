import { prisma } from "@internal/db";

export async function listTeamsForUser(userId: string) {
  const memberships = await prisma.teamMembership.findMany({
    where: { userId, team: { deletedAt: null } },
    include: {
      team: { select: { id: true, slug: true, name: true, description: true } },
    },
  });
  return memberships.map((m) => ({
    id: m.team.id,
    slug: m.team.slug,
    name: m.team.name,
    description: m.team.description,
    role: m.role,
  }));
}

type ResolvedUser = { id: string; githubLogin: string; displayName: string; email: string };

// Resolve a free-text handle to a single user, a candidate list, or nothing.
export async function resolveUser(
  q: string,
): Promise<
  | { kind: "one"; user: ResolvedUser }
  | { kind: "many"; candidates: { username: string; displayName: string; email: string }[] }
  | { kind: "none" }
> {
  // Exact match on a unique handle first, fall back to a fuzzy search.
  const exact = await prisma.user.findFirst({
    where: {
      OR: [
        { githubLogin: { equals: q, mode: "insensitive" } },
        { email: { equals: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, githubLogin: true, displayName: true, email: true },
  });
  if (exact) return { kind: "one", user: exact };

  const matches = await prisma.user.findMany({
    where: {
      OR: [
        { githubLogin: { contains: q, mode: "insensitive" } },
        { displayName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, githubLogin: true, displayName: true, email: true },
    take: 6,
  });
  if (matches.length === 0) return { kind: "none" };
  if (matches.length > 1) {
    return {
      kind: "many",
      candidates: matches.map((m) => ({
        username: m.githubLogin,
        displayName: m.displayName,
        email: m.email,
      })),
    };
  }
  return { kind: "one", user: matches[0] };
}

export async function findTeamDetail(slug: string) {
  const team = await prisma.team.findFirst({
    where: { slug, deletedAt: null },
    include: {
      department: { select: { id: true, slug: true, name: true } },
      _count: { select: { memberships: true } },
    },
  });
  if (!team) return null;
  return {
    id: team.id,
    slug: team.slug,
    name: team.name,
    description: team.description,
    department: team.department,
    memberCount: team._count.memberships,
    source: team.source,
  };
}

export async function findTeamIdentity(slug: string) {
  return prisma.team.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, slug: true, name: true },
  });
}

export async function isTeamMember(teamId: string, userId: string): Promise<boolean> {
  const m = await prisma.teamMembership.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  return m != null;
}

export async function listTeamMembers(teamId: string) {
  const members = await prisma.teamMembership.findMany({
    where: { teamId },
    include: {
      user: { select: { id: true, displayName: true, email: true } },
    },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
  });
  return members.map((m) => ({
    userId: m.user.id,
    displayName: m.user.displayName,
    email: m.user.email,
    role: m.role,
  }));
}
