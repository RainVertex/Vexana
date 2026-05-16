import { prisma } from "@internal/db";
import type { GrantTarget } from "@internal/db";
import type { User } from "@internal/db";

/** Checks whether a guest user has an active, non-expired GuestGrant for a specific resource. */
export async function assertGuestGrant(
  user: User,
  resourceType: GrantTarget,
  resourceId: string,
): Promise<boolean> {
  if (user.role !== "guest") return true;

  const grant = await prisma.guestGrant.findFirst({
    where: {
      granteeId: user.id,
      resourceType,
      resourceId,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  return grant !== null;
}
