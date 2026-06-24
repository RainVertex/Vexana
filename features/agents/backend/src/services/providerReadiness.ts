import { prisma } from "@internal/db";
import { isProviderReady, providerHasStoredKey } from "@internal/llm-core";

// Whether an agent can start a run now (model enabled and provider key resolvable), so a task precheck can defer instead of letting the run fail at startup.

export interface AgentProviderReadiness {
  ready: boolean;
  reason?: string;
}

export async function isAgentProviderReady(agentId: string): Promise<AgentProviderReadiness> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { llmModel: { include: { provider: true } } },
  });
  if (!agent) return { ready: false, reason: "agent not found" };
  if (!agent.llmModel.enabled) return { ready: false, reason: "agent model is disabled" };
  const hasKey = await providerHasStoredKey(agent.llmModel.provider.id);
  if (!isProviderReady(agent.llmModel.provider, hasKey)) {
    return { ready: false, reason: "agent provider not configured" };
  }
  return { ready: true };
}
