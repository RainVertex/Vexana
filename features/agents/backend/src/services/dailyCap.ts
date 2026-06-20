import { prisma } from "@internal/db";

// Per-model daily usage caps. Once a model's runs have spent its dailyTokenCap for the day, callers
// gate on isModelOverDailyCap (the task queue defers its work, chat blocks) until UTC midnight resets it.

function startOfUtcDay(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// Milliseconds until the next UTC midnight, when a model's daily cap resets.
export function msUntilDailyCapReset(): number {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return next - now.getTime();
}

// Tokens (input + output) recorded today across every run of agents on this model. Runs are
// attributed by the agent's current model, so reassigning an agent's model shifts its history with it.
export async function modelTokensUsedToday(modelId: string): Promise<number> {
  const agg = await prisma.agentRun.aggregate({
    where: { agent: { modelId }, createdAt: { gte: startOfUtcDay() } },
    _sum: { tokensInput: true, tokensOutput: true },
  });
  return (agg._sum.tokensInput ?? 0) + (agg._sum.tokensOutput ?? 0);
}

// Whether the agent's model is over its daily cap right now. Uncapped models are never over.
export async function isModelOverDailyCap(agentId: string): Promise<boolean> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { modelId: true, llmModel: { select: { dailyTokenCap: true } } },
  });
  const cap = agent?.llmModel.dailyTokenCap ?? null;
  if (!agent || cap == null) return false;
  return (await modelTokensUsedToday(agent.modelId)) >= cap;
}
