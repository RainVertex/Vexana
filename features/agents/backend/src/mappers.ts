import { PLATFORM_ASSISTANT_AGENT_ID } from "./constants";
import type { AgentDetailRow, AgentListRow, ConversationTitle } from "./repositories/agents";
import type { ChatModelDisplay, ModelListItem } from "./repositories/models";

export function toModelDto(m: ModelListItem) {
  return {
    id: m.id,
    slug: m.slug,
    displayName: m.displayName,
    modelName: m.modelName,
    contextWindow: m.contextWindow,
    supportsTools: m.supportsTools,
    supportsVision: m.supportsVision,
    supportsReasoning: m.supportsReasoning,
    costPer1kIn: m.costPer1kIn ? Number(m.costPer1kIn) : null,
    costPer1kOut: m.costPer1kOut ? Number(m.costPer1kOut) : null,
    provider: m.provider,
  };
}

export function toRecommendations(
  kind: string,
  requiresTools: boolean,
  recommendedModelIds: string[],
) {
  return { kind, requiresTools, recommendedModelIds };
}

export function toAgentListItem(agent: AgentListRow, assistantModel: ChatModelDisplay | null) {
  const { runs, ...rest } = agent;
  return {
    ...rest,
    status: runs[0]?.status ?? "idle",
    // The Platform Assistant ignores its own modelId FK and runs whatever admins pick as the active chat model.
    llmModel: agent.id === PLATFORM_ASSISTANT_AGENT_ID ? assistantModel : agent.llmModel,
  };
}

export function toAgentDetail(
  agent: AgentDetailRow,
  conversations: ConversationTitle[],
  assistantModel: ChatModelDisplay | null,
) {
  const conversationById = new Map(conversations.map((c) => [c.id, c]));
  const runs = agent.runs.map(({ conversationId, ...run }) => ({
    ...run,
    conversation: conversationId ? (conversationById.get(conversationId) ?? null) : null,
  }));
  const llmModel = agent.id === PLATFORM_ASSISTANT_AGENT_ID ? assistantModel : agent.llmModel;
  return {
    ...agent,
    llmModel,
    runs,
    status: agent.runs[0]?.status ?? "idle",
    toolsManaged: agent.id === PLATFORM_ASSISTANT_AGENT_ID,
  };
}
