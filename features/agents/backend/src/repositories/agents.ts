import { prisma, Prisma } from "@internal/db";

export type AgentRow = Prisma.AgentGetPayload<true>;

export type AgentListRow = Prisma.AgentGetPayload<{
  include: {
    llmModel: {
      select: {
        slug: true;
        displayName: true;
        provider: { select: { slug: true; displayName: true } };
      };
    };
    runs: { select: { status: true } };
  };
}>;

export type AgentDetailRow = Prisma.AgentGetPayload<{
  include: {
    llmModel: { include: { provider: true } };
    runs: {
      select: {
        id: true;
        status: true;
        trigger: true;
        tokensInput: true;
        tokensOutput: true;
        costUsd: true;
        startedAt: true;
        finishedAt: true;
        conversationId: true;
        task: { select: { id: true; title: true; projectId: true } };
      };
    };
  };
}>;

export type ConversationTitle = { id: string; title: string };

export interface AgentRepository {
  listWithLatestRunAndModel(): Promise<AgentListRow[]>;
  findDetail(id: string, scopeUserId?: string): Promise<AgentDetailRow | null>;
  findBasic(id: string): Promise<AgentRow | null>;
  create(data: Prisma.AgentUncheckedCreateInput): Promise<AgentRow>;
  update(id: string, data: Prisma.AgentUncheckedUpdateInput): Promise<AgentRow>;
  delete(id: string): Promise<void>;
  deleteBackingUser(userId: string): Promise<void>;
  findConversationTitles(ids: string[]): Promise<ConversationTitle[]>;
}

export const agentRepository: AgentRepository = {
  listWithLatestRunAndModel() {
    return prisma.agent.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        llmModel: {
          select: {
            slug: true,
            displayName: true,
            provider: { select: { slug: true, displayName: true } },
          },
        },
        // Status is derived from the latest run, not stored on the agent (concurrent runs would race a shared column).
        runs: { orderBy: { startedAt: "desc" }, take: 1, select: { status: true } },
      },
    });
  },
  findDetail(id, scopeUserId) {
    return prisma.agent.findUnique({
      where: { id },
      include: {
        llmModel: { include: { provider: true } },
        // Runs carry user content (chat turns persist as AgentRun), so non-admins only see their own.
        runs: {
          where: scopeUserId ? { userId: scopeUserId } : undefined,
          orderBy: { startedAt: "desc" },
          take: 20,
          select: {
            id: true,
            status: true,
            trigger: true,
            tokensInput: true,
            tokensOutput: true,
            costUsd: true,
            startedAt: true,
            finishedAt: true,
            conversationId: true,
            task: { select: { id: true, title: true, projectId: true } },
          },
        },
      },
    });
  },
  findBasic(id) {
    return prisma.agent.findUnique({ where: { id } });
  },
  create(data) {
    return prisma.agent.create({ data });
  },
  update(id, data) {
    return prisma.agent.update({ where: { id }, data });
  },
  async delete(id) {
    await prisma.agent.delete({ where: { id } });
  },
  async deleteBackingUser(userId) {
    // Remove the backing User so a deleted agent stops appearing in assignee/share pickers (cascades its task assignments and comments).
    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  },
  findConversationTitles(ids) {
    // conversationId is an informational link (no FK), so resolve titles in one Chat read.
    return prisma.chatConversation.findMany({
      where: { id: { in: ids } },
      select: { id: true, title: true },
    });
  },
};
