// Per-entity authorization for the observability read endpoints. Logs,
// traces, and dashboard PNG embeds can carry sensitive data; gating on
// req.user existing alone would let any authenticated user read any
// entity's stream. We require membership in at least one of the entity's
// owning teams. Admins bypass.
//
// One round trip per request (Prisma compiles the team-membership join into
// a single SQL query). If this becomes a hot path we'd cache per-user team
// IDs in the session — not warranted yet.

import { prisma } from "@internal/db";

export interface ObservabilityActor {
  id: string;
  role: string;
}

export async function canReadEntityObservability(
  user: ObservabilityActor,
  entityId: string,
): Promise<boolean> {
  if (user.role === "admin") return true;
  const count = await prisma.catalogEntityOwner.count({
    where: {
      entityId,
      team: { memberships: { some: { userId: user.id } } },
    },
  });
  return count > 0;
}
