import { prisma, Prisma } from "@internal/db";
import type { ChatPolicyCheck } from "@internal/shared-types";
import type { PrepareReturnEnvelope } from "./streamExecutor";

// ChatActionPreview lifecycle helpers used by *_prepare and *_submit tools.
//
// Prepare flow:
// 1. validate inputs against hard rules -> policyChecks
// 2. allocate the next short handle (prv_NN) for (conversationId, toolId)
// 3. supersede prior unconsumed prepares for the same (conversationId, toolId)
// 4. insert the row, build the SSE preview event + LLM-facing payload
// 5. return PrepareReturnEnvelope to streamExecutor which emits the event
// and feeds forLlm to the model
//
// Submit flow:
// 1. resolve handle -> row by (conversationId, shortHandle)
// 2. authorization (userId), scope (conversationId), idempotency
// (consumedAt), staleness (supersededAt), TTL (expiresAt)
// 3. caller re-runs validation against current DB state
// 4. caller runs the wrapped handler in a $transaction. we mark consumed
// and set resultRefId

const PREVIEW_TTL_MS = 10 * 60 * 1000; // 10 min

export interface CreatePreviewArgs {
  conversationId: string;
  userId: string;
  toolId: string;
  parsedParams: Record<string, unknown>;
  serverSummary: string;
  policyChecks: ChatPolicyCheck[];
  sideEffects: string[];
}

/** Persist a ChatActionPreview row, supersede prior unconsumed prepares of the same kind in */
export async function createPreview(args: CreatePreviewArgs): Promise<PrepareReturnEnvelope> {
  return prisma.$transaction(async (tx) => {
    // Supersede any prior unconsumed preview for (conversation, toolId). The
    // staleness rule: only the latest is submittable. older prepares are
    // silently superseded so the assistant can correct mid-conversation
    // without leaving a footgun.
    await tx.chatActionPreview.updateMany({
      where: {
        conversationId: args.conversationId,
        toolId: args.toolId,
        consumedAt: null,
        supersededAt: null,
      },
      data: { supersededAt: new Date() },
    });

    // Allocate the next short handle. Monotonic per (conversationId, toolId)
    //we count prior previews of any state, so handles never repeat within
    // a conversation/toolId pair (idempotent renumbering on retries).
    const priorCount = await tx.chatActionPreview.count({
      where: { conversationId: args.conversationId, toolId: args.toolId },
    });
    const handleIndex = priorCount + 1;
    const shortHandle = `prv_${String(handleIndex).padStart(2, "0")}`;

    const row = await tx.chatActionPreview.create({
      data: {
        shortHandle,
        conversationId: args.conversationId,
        userId: args.userId,
        toolId: args.toolId,
        parsedParams: args.parsedParams as Prisma.InputJsonValue,
        serverSummary: args.serverSummary,
        policyChecks: args.policyChecks as unknown as Prisma.InputJsonValue,
        sideEffects: args.sideEffects as unknown as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + PREVIEW_TTL_MS),
      },
      select: { id: true, shortHandle: true },
    });

    return {
      __previewEvent: {
        shortHandle: row.shortHandle,
        toolId: args.toolId,
        serverSummary: args.serverSummary,
        parsedParams: args.parsedParams,
        sideEffects: args.sideEffects,
        policyChecks: args.policyChecks,
      },
      forLlm: {
        handle: row.shortHandle,
        serverSummary: args.serverSummary,
        policyChecks: args.policyChecks,
      },
    };
  });
}

export type ResolvePreviewError =
  | { code: "not_found"; message: string }
  | { code: "wrong_user"; message: string }
  | { code: "wrong_conversation"; message: string }
  | { code: "expired"; message: string }
  | { code: "superseded"; message: string };

export type ResolvePreviewResult =
  | {
      ok: true;
      kind: "fresh";
      preview: NonNullable<Awaited<ReturnType<typeof prisma.chatActionPreview.findUnique>>>;
    }
  | { ok: true; kind: "alreadyConsumed"; resultRefId: string | null; consumedAt: Date }
  | { ok: false; error: ResolvePreviewError };

/** Look up a preview by handle and run authorization + lifecycle gates. */
export async function resolveForSubmit(args: {
  handle: string;
  conversationId: string;
  userId: string;
  toolId: string;
}): Promise<ResolvePreviewResult> {
  const row = await prisma.chatActionPreview.findUnique({
    where: {
      conversationId_shortHandle: { conversationId: args.conversationId, shortHandle: args.handle },
    },
  });
  if (!row || row.toolId !== args.toolId.replace(/_submit$/, "_prepare")) {
    return {
      ok: false,
      error: {
        code: "not_found",
        message: `No preview ${args.handle} found for this action — call the matching *_prepare tool first.`,
      },
    };
  }
  if (row.userId !== args.userId) {
    return {
      ok: false,
      error: { code: "wrong_user", message: "This preview belongs to another user." },
    };
  }
  if (row.conversationId !== args.conversationId) {
    return {
      ok: false,
      error: {
        code: "wrong_conversation",
        message: "This preview belongs to another conversation.",
      },
    };
  }
  if (row.consumedAt) {
    // Idempotency, a re-submission returns the prior result instead of
    // re-executing the wrapped handler. resultRefId points at the row that
    // the original submit produced (e.g. created TeamRequest id).
    return {
      ok: true,
      kind: "alreadyConsumed",
      resultRefId: row.resultRefId,
      consumedAt: row.consumedAt,
    };
  }
  if (row.supersededAt) {
    return {
      ok: false,
      error: {
        code: "superseded",
        message: "A newer preview replaced this one — please confirm the latest preview instead.",
      },
    };
  }
  if (row.expiresAt < new Date()) {
    return {
      ok: false,
      error: {
        code: "expired",
        message: "This preview expired — please re-confirm what you'd like to do.",
      },
    };
  }
  return { ok: true, kind: "fresh", preview: row };
}

/** Mark a preview as consumed and record the wrapped handler's result-id. */
export async function markConsumed(args: {
  previewId: string;
  resultRefId: string | null;
  tx?: Prisma.TransactionClient;
}): Promise<void> {
  const client = args.tx ?? prisma;
  await client.chatActionPreview.update({
    where: { id: args.previewId },
    data: { consumedAt: new Date(), resultRefId: args.resultRefId },
  });
}
