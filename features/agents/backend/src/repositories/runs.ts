import { prisma, Prisma } from "@internal/db";

export type AgentRunDetail = Prisma.AgentRunGetPayload<{
  include: {
    agent: { select: { name: true; avatarUrl: true } };
    user: { select: { userKind: true } };
  };
}>;

export interface AgentRunRepository {
  findById(runId: string): Promise<AgentRunDetail | null>;
  markCancelled(runId: string): Promise<void>;
}

export const runRepository: AgentRunRepository = {
  findById(runId) {
    return prisma.agentRun.findUnique({
      where: { id: runId },
      include: {
        agent: { select: { name: true, avatarUrl: true } },
        user: { select: { userKind: true } },
      },
    });
  },
  async markCancelled(runId) {
    await prisma.agentRun.update({
      where: { id: runId },
      data: { status: "cancelled", error: "Cancelled by user", finishedAt: new Date() },
    });
  },
};
