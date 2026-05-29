import type OpenAI from "openai";
import { prisma, Prisma } from "@internal/db";
import {
  computeCostUsd,
  type ChatRequest,
  type ChatResult,
  type ResolvedModel,
} from "./llm/client";
import { selectAdapter } from "./llm/adapters";
import { resolveProviderApiKey } from "./secrets";
import { decidePolicy } from "./approvalPolicy";
import { buildAgentRequestContext } from "./agentRequestContext";
import { resolveTools, type ToolContext } from "./llm/toolRegistry";

// Generic agent execution. The agent row carries everything driving the loop:
// the system prompt (`instructions`), which tools it may call (`toolIds`)
// the model + provider (`modelId` -> LlmModel -> LlmProvider), and the
// per-loop and per-budget caps (`maxToolCalls`, `tokenBudget`). The chat
// function is talked to via OpenAI shape regardless of provider so a single
// loop serves Ollama, OpenAI, and Anthropic-via-OpenAI-compat without
// branching.

export type RunAgentInput = Record<string, unknown>;

export interface RunAgentToolCall {
  name: string;
  input: unknown;
  output: unknown;
  durationMs: number;
  isError: boolean;
}

export interface RunAgentResult {
  agentRunId: string;
  status: "succeeded" | "failed";
  toolCalls: RunAgentToolCall[];
  finalText: string | null;
  tokensInput: number;
  tokensOutput: number;
  costUsd: number | null;
  error: string | null;
}

export interface RunAgentOptions {
  // Override the chat function for tests. Defaults to the real OpenAI-shape
  // client in ./llm/client.
  chat?: (req: ChatRequest) => Promise<ChatResult>;
  signal?: AbortSignal;
  // For runs initiated by an authenticated user. null for cron / system runs.
  callerUserId?: string | null;
  callerIsAdmin?: boolean;
  callerTeamIds?: string[];
  // When set, runAgent updates this existing AgentRun row instead of creating
  // a new one. The async-by-default route handler uses this so it can return
  // the runId to the client immediately while the executor runs in the
  // background.
  existingRunId?: string;
}

export async function runAgent(
  agentId: string,
  input: RunAgentInput,
  opts: RunAgentOptions = {},
): Promise<RunAgentResult> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { llmModel: { include: { provider: true } } },
  });
  if (!agent) throw new Error(`Agent not found: ${agentId}`);

  const run = opts.existingRunId
    ? await prisma.agentRun.findUniqueOrThrow({ where: { id: opts.existingRunId } })
    : await prisma.agentRun.create({
        data: { agentId, status: "running", input: input as Prisma.InputJsonValue },
      });
  await prisma.agent.update({ where: { id: agentId }, data: { status: "running" } });

  // Resolve the provider API key once per run: per-agent Secret override
  // takes precedence over the env-var pattern. The adapter receives the key
  // via AdapterRequest.apiKey (added in Pass 3) so the lookup happens here
  // rather than inside each adapter.
  const apiKey = await resolveProviderApiKey({
    agentSecretId: agent.secretId,
    providerSlug: agent.llmModel.provider.slug,
    apiKeyEnvVar: agent.llmModel.provider.apiKeyEnvVar,
  });

  // Default chat function dispatches via the ProviderAdapter selected from
  // the agent's modelProvider field. Tests can inject opts.chat to bypass
  // the network. The pre-resolved apiKey is passed through every call.
  const chatFn =
    opts.chat ??
    ((req: ChatRequest) =>
      selectAdapter(agent.modelProvider).stream({ ...req, apiKey } as Parameters<
        ReturnType<typeof selectAdapter>["stream"]
      >[0]));
  // Per-tool approval policy in effect for this run. Read once from the
  // Agent row so we don't re-fetch on every tool call. The policy is the
  // JSONB column populated via the wizard (Pass 4), empty for legacy rows
  // which preserves the pre-Pass-3 "no gates" behavior for chat.
  const policy = (agent.toolApprovalPolicy ?? {}) as Parameters<typeof decidePolicy>[0];
  const toolIds = Array.isArray(agent.toolIds) ? (agent.toolIds as unknown as string[]) : [];
  const tools = resolveTools(toolIds);
  const openaiTools: OpenAI.Chat.Completions.ChatCompletionFunctionTool[] = tools.map(
    (t) => t.openaiDef,
  );

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: agent.instructions },
    { role: "user", content: JSON.stringify(input) },
  ];

  const toolCalls: RunAgentToolCall[] = [];
  let tokensInput = 0;
  let tokensOutput = 0;
  let finalText: string | null = null;

  const model = agent.llmModel as ResolvedModel;

  try {
    // Resolve the effective request context: enforces onBehalfOfRequired
    // (autonomous invocations of a "needs invoker" agent throw here and
    // land in the catch below as a clean run-failed row) and computes
    // min(agent.role, invoker.role) + team intersection for ToolContext.
    const agentCtx = await buildAgentRequestContext({
      agentUserId: agent.userId,
      invokerUserId: opts.callerUserId ?? null,
    });
    const toolCtx: ToolContext = {
      userId: agentCtx.invokerUserId ?? agentCtx.agentUserId,
      isAdmin: agentCtx.effectiveRole === "admin",
      teamIds: agentCtx.effectiveTeamIds,
      signal: opts.signal,
    };
    const isAutonomousRun = agentCtx.invokerUserId == null;

    for (let step = 0; step < agent.maxToolCalls; step++) {
      const result = await chatFn({
        model,
        messages,
        tools: openaiTools.length > 0 ? openaiTools : undefined,
        signal: opts.signal,
      });
      tokensInput += result.usage.input;
      tokensOutput += result.usage.output;

      if (agent.tokenBudget != null && tokensInput + tokensOutput > agent.tokenBudget) {
        throw new Error("token_budget_exhausted");
      }

      if (typeof result.message.content === "string" && result.message.content.length > 0) {
        finalText = result.message.content;
      }

      if (result.finishReason !== "tool_calls" || result.toolCalls.length === 0) {
        break;
      }

      // The assistant message goes back verbatim so the next turn includes
      // the model's tool_calls. tool_result messages then follow per call.
      messages.push(result.message as OpenAI.Chat.Completions.ChatCompletionMessageParam);

      for (const tc of result.toolCalls) {
        const startedAt = Date.now();
        const toolDef = tools.find((t) => t.openaiDef.function.name === tc.function.name);
        let output: unknown;
        let isError = false;
        if (!toolDef) {
          output = { error: `Unknown tool: ${tc.function.name}` };
          isError = true;
        } else {
          // Per-tool approval policy gate. 'forbidden' refuses any call.
          // 'requires_approval' on an autonomous run (no invoking human)
          // writes an AgentApprovalRequest and refuses. the run will need
          // to re-attempt after a human approves. For chat runs (handled
          // in streamExecutor) the prepare/submit confirmation IS the
          // approval, so 'requires_approval' falls through there.
          const mode = decidePolicy(policy, tc.function.name);
          if (mode === "forbidden") {
            output = {
              error: `Tool ${tc.function.name} forbidden by agent policy`,
              code: "tool_forbidden",
            };
            isError = true;
          } else if (mode === "requires_approval" && isAutonomousRun) {
            // Persist a pending approval row scoped to this agent so the
            // primary contact can decide later via /api/agent-approvals.
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
            const parsed = safeJsonParse(tc.function.arguments);
            const params: Record<string, unknown> =
              parsed && typeof parsed === "object" && !Array.isArray(parsed)
                ? (parsed as Record<string, unknown>)
                : {};
            await prisma.agentApprovalRequest.create({
              data: {
                agentUserId: agent.userId,
                toolName: tc.function.name,
                parsedParams: params as Prisma.InputJsonValue,
                status: "pending",
                expiresAt,
              },
            });
            output = {
              error: `Tool ${tc.function.name} requires approval; written to AgentApprovalRequest inbox`,
              code: "approval_required",
            };
            isError = true;
          } else {
            try {
              const parsed = JSON.parse(tc.function.arguments || "{}");
              output = await toolDef.handler(parsed, toolCtx);
            } catch (err) {
              output = { error: (err as Error).message };
              isError = true;
            }
          }
        }
        toolCalls.push({
          name: tc.function.name,
          input: safeJsonParse(tc.function.arguments),
          output,
          durationMs: Date.now() - startedAt,
          isError,
        });
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(output),
        });
      }
    }

    const costUsd = computeCostUsd(model, { input: tokensInput, output: tokensOutput });
    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: "succeeded",
        output: { toolCalls, finalText } as unknown as Prisma.InputJsonValue,
        tokensInput,
        tokensOutput,
        costUsd,
        finishedAt: new Date(),
      },
    });
    await prisma.agent.update({ where: { id: agentId }, data: { status: "succeeded" } });
    return {
      agentRunId: run.id,
      status: "succeeded",
      toolCalls,
      finalText,
      tokensInput,
      tokensOutput,
      costUsd,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const costUsd = computeCostUsd(model, { input: tokensInput, output: tokensOutput });
    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        error: message.slice(0, 2000),
        output: { toolCalls, finalText } as unknown as Prisma.InputJsonValue,
        tokensInput,
        tokensOutput,
        costUsd,
        finishedAt: new Date(),
      },
    });
    await prisma.agent.update({ where: { id: agentId }, data: { status: "failed" } });
    return {
      agentRunId: run.id,
      status: "failed",
      toolCalls,
      finalText,
      tokensInput,
      tokensOutput,
      costUsd,
      error: message,
    };
  }
}

function safeJsonParse(s: string | undefined): unknown {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

// Async-by-default kickoff used by POST /api/agents/:id/run. Creates the
// AgentRun row synchronously so the route can return its id, then runs the
// executor in the background. runAgent's internal catch persists any failure
// into the row, the .catch() here only catches catastrophic failures
// before that point.
export async function startAgentRun(
  agentId: string,
  input: RunAgentInput,
  opts: RunAgentOptions = {},
): Promise<{ runId: string }> {
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) throw new Error(`Agent not found: ${agentId}`);
  const run = await prisma.agentRun.create({
    data: { agentId, status: "running", input: input as Prisma.InputJsonValue },
  });
  void runAgent(agentId, input, { ...opts, existingRunId: run.id }).catch((err) => {
    console.error(`Background runAgent crashed for run ${run.id}:`, err);
  });
  return { runId: run.id };
}

// Catalog enricher compatibility wrapper.
//
// The daily cron at jobs.ts calls runEnricherForEntity. New code should use
// runAgent() directly. This wrapper adapts the generic result to the
// enricher's pre-existing shape (notably `driftsProposed`, derived from
// the tool-call list).

export interface EnricherInput {
  entityId: string;
}

export interface EnricherRunResult {
  agentRunId: string;
  status: "succeeded" | "failed";
  driftsProposed: number;
  toolCalls: RunAgentToolCall[];
  finalText: string | null;
  tokensInput: number;
  tokensOutput: number;
  error: string | null;
}

export interface RunEnricherOptions {
  chat?: (req: ChatRequest) => Promise<ChatResult>;
  signal?: AbortSignal;
}

export async function runEnricherForEntity(
  agentId: string,
  input: EnricherInput,
  opts: RunEnricherOptions = {},
): Promise<EnricherRunResult> {
  const result = await runAgent(agentId, input as unknown as RunAgentInput, opts);
  const driftsProposed = result.toolCalls.filter(
    (c) => c.name === "catalog_propose_drift" && !c.isError,
  ).length;
  return {
    agentRunId: result.agentRunId,
    status: result.status,
    driftsProposed,
    toolCalls: result.toolCalls,
    finalText: result.finalText,
    tokensInput: result.tokensInput,
    tokensOutput: result.tokensOutput,
    error: result.error,
  };
}

// Re-exports kept for callers that imported types from the old module shape.
export type { RunAgentToolCall as EnricherToolCall };
