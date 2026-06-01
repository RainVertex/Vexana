import { prisma } from "@internal/db";

export async function getMyPendingRequests(userId: string) {
  const teamRequestsAwaitingMe = await prisma.teamRequest.findMany({
    where: { requestedByUserId: userId, status: "awaiting_user_confirmation" },
    orderBy: { updatedAt: "desc" },
    select: { id: true, slug: true, name: true, status: true, roundCount: true, updatedAt: true },
  });
  const teamRequestsPending = await prisma.teamRequest.findMany({
    where: { requestedByUserId: userId, status: "pending" },
    orderBy: { updatedAt: "desc" },
    select: { id: true, slug: true, name: true, status: true, roundCount: true, updatedAt: true },
  });
  const maintainerRequestsPending = await prisma.maintainerRequest.findMany({
    where: { requestedByUserId: userId, status: "pending" },
    include: { team: { select: { slug: true, name: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return {
    teamRequestsAwaitingMe: teamRequestsAwaitingMe.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      status: r.status,
      roundCount: r.roundCount,
      updatedAt: r.updatedAt.toISOString(),
    })),
    teamRequestsPending: teamRequestsPending.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      status: r.status,
      roundCount: r.roundCount,
      updatedAt: r.updatedAt.toISOString(),
    })),
    maintainerRequestsPending: maintainerRequestsPending.map((r) => ({
      id: r.id,
      teamSlug: r.team.slug,
      teamName: r.team.name,
      reason: r.reason,
      updatedAt: r.updatedAt.toISOString(),
    })),
  };
}

export async function listMyTeamRequests(userId: string) {
  const rows = await prisma.teamRequest.findMany({
    where: { requestedByUserId: userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    status: r.status,
    roundCount: r.roundCount,
    rejectionReason: r.rejectionReason,
    createdTeamId: r.createdTeamId,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function listMyMaintainerRequests(userId: string) {
  const rows = await prisma.maintainerRequest.findMany({
    where: { requestedByUserId: userId },
    include: { team: { select: { slug: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map((r) => ({
    id: r.id,
    teamSlug: r.team.slug,
    teamName: r.team.name,
    status: r.status,
    reason: r.reason,
    rejectionReason: r.rejectionReason,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}
