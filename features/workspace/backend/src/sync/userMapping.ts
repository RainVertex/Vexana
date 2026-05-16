// Auto-mapping between platform Users and Plane workspace members. Runs
// after every member upsert. Match is case-insensitive on email; explicit
// admin-set mappings take priority and are never overwritten by auto-mapping.

import type { PrismaClient, Prisma } from "@prisma/client";

type Tx = PrismaClient | Prisma.TransactionClient;

/** For each Plane member in the given list, create a PlaneUserMapping if a platform User exists */
export async function autoMapMembers(
  tx: Tx,
  members: Array<{ id: string; email: string }>,
): Promise<number> {
  if (members.length === 0) return 0;
  const emails = Array.from(new Set(members.map((m) => m.email.toLowerCase())));
  const users = await tx.user.findMany({
    where: { email: { in: emails, mode: "insensitive" } },
    select: { id: true, email: true },
  });
  if (users.length === 0) return 0;

  const userByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u.id]));
  const candidates: Array<{ platformUserId: string; planeMemberId: string }> = [];
  for (const m of members) {
    const userId = userByEmail.get(m.email.toLowerCase());
    if (userId) candidates.push({ platformUserId: userId, planeMemberId: m.id });
  }
  if (candidates.length === 0) return 0;

  // Filter out already-mapped pairs (admin-set or already auto-mapped) so we
  // never silently overwrite a manual mapping.
  const existing = await tx.planeUserMapping.findMany({
    where: {
      OR: candidates.map((c) => ({
        platformUserId: c.platformUserId,
        planeMemberId: c.planeMemberId,
      })),
    },
    select: { platformUserId: true, planeMemberId: true },
  });
  const existingKey = new Set(existing.map((e) => `${e.platformUserId}:${e.planeMemberId}`));
  const toCreate = candidates.filter(
    (c) => !existingKey.has(`${c.platformUserId}:${c.planeMemberId}`),
  );
  if (toCreate.length === 0) return 0;

  const result = await tx.planeUserMapping.createMany({
    data: toCreate,
    skipDuplicates: true,
  });
  return result.count;
}
