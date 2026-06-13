import { prisma } from "@internal/db";

export interface CallerRepository {
  teamIdsForUser(userId: string): Promise<string[]>;
}

export const callerRepository: CallerRepository = {
  async teamIdsForUser(userId) {
    const memberships = await prisma.teamMembership.findMany({
      where: { userId, team: { deletedAt: null } },
      select: { teamId: true },
    });
    return memberships.map((m) => m.teamId);
  },
};
