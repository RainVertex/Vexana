import { prisma, Prisma } from "@internal/db";

export type McpServerRow = Prisma.AgentMcpServerGetPayload<true>;

export interface McpServerRepository {
  listForAgent(agentId: string): Promise<McpServerRow[]>;
  findById(id: string): Promise<McpServerRow | null>;
  create(data: Prisma.AgentMcpServerUncheckedCreateInput): Promise<McpServerRow>;
  update(id: string, data: Prisma.AgentMcpServerUncheckedUpdateInput): Promise<McpServerRow>;
  delete(id: string): Promise<void>;
  oauthConnected(serverId: string, userId: string | null): Promise<boolean>;
}

export const mcpServerRepository: McpServerRepository = {
  listForAgent(agentId) {
    return prisma.agentMcpServer.findMany({ where: { agentId }, orderBy: { createdAt: "asc" } });
  },
  findById(id) {
    return prisma.agentMcpServer.findUnique({ where: { id } });
  },
  create(data) {
    return prisma.agentMcpServer.create({ data });
  },
  update(id, data) {
    return prisma.agentMcpServer.update({ where: { id }, data });
  },
  async delete(id) {
    // Cascade removes this server's OAuth tokens and in-flight flow rows.
    await prisma.agentMcpServer.delete({ where: { id } });
  },
  async oauthConnected(serverId, userId) {
    if (!userId) return false;
    const row = await prisma.mcpOAuthToken.findUnique({
      where: { mcpServerId_userId: { mcpServerId: serverId, userId } },
      select: { id: true },
    });
    return Boolean(row);
  },
};
