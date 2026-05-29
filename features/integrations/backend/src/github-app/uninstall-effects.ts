import { prisma } from "@internal/db";

// Side effects to run when a GitHub org's integration is disconnected
// regardless of whether the trigger was an admin DELETE or the
// installation.deleted webhook. For every user whose only remaining org
// coverage was this one, revoke their active sessions and drop their
// UserOrgMembership row so they fall back to the standard verifyAnyOrgMembership
// gate on next sign-in. user.status is intentionally left untouched here
// the org membership check is the authoritative gate, and a separate manual
// disable lever stays available for admins via /api/admin/users.
export async function revokeStrandedUserSessions(accountLogin: string): Promise<{
  affectedUserIds: string[];
}> {
  if (!accountLogin) return { affectedUserIds: [] };

  const affected = await prisma.userOrgMembership.findMany({
    where: { accountLogin },
    select: { userId: true },
  });
  const affectedUserIds = Array.from(new Set(affected.map((r) => r.userId)));

  await prisma.userOrgMembership.deleteMany({ where: { accountLogin } });

  if (affectedUserIds.length === 0) return { affectedUserIds: [] };

  const remaining = await prisma.userOrgMembership.groupBy({
    by: ["userId"],
    where: { userId: { in: affectedUserIds } },
    _count: { userId: true },
  });
  const stillCovered = new Set(remaining.map((r) => r.userId));
  const stranded = affectedUserIds.filter((id) => !stillCovered.has(id));

  if (stranded.length === 0) return { affectedUserIds: [] };

  await prisma.session.deleteMany({ where: { userId: { in: stranded } } });

  return { affectedUserIds: stranded };
}
