import { randomUUID } from "node:crypto";
import { prisma } from "@internal/db";
import {
  acquireSandbox,
  createRedactor,
  createSecretAccessor,
  execute,
  type ActionRegistry,
  type Plan,
  type StepEvent,
  type Compensation,
  type SandboxTarget,
  type TaskStatus,
} from "@internal/scaffolder-core";
import type { PlanCtx } from "@internal/scaffolder-core";
import { acquireTargetLock, ensurePlanFresh, StalePlanError } from "./locks";
import { taskEventBus } from "./events";
import { createApprovalSigner, residualMissingApprovals, type ApprovalGrant } from "./approvals";

export interface ApplyInput {
  plan: Plan;
  /** Resolved steps as returned by buildPlan(). */
  resolvedSteps: Array<{ stepId: string; action: string; input: unknown }>;
  actions: ActionRegistry;
  planCtx: PlanCtx;
  /** The live monorepo root. */
  liveRepoRoot: string;
  /** Triggering user id (for ScaffoldTask.triggeredByUserId). */
  triggeredByUserId: string;
  /** Optional override workspace root for tests. */
  workspaceRoot?: string;
  /** Maps secret name → value (env-derived). */
  secrets?: Record<string, string | undefined>;
  /** Externally-controlled cancellation. */
  signal?: AbortSignal;
  dryRun?: boolean;
  /** Used by the lock. defaults to plan.templateId + plan.params (paramsHash). */
  targetRef?: string;
  /** Audit/observability: same id propagated through all generated rows. */
  requestId?: string;
  /** Approval grants attached to the plan. */
  approvals?: ApprovalGrant[];
}

export interface ApplyResult {
  taskId: string;
  status: TaskStatus;
  output: Record<string, unknown>;
  error: string | null;
  rolledBack: boolean;
}

export class PlanExpiredError extends Error {
  constructor(
    public readonly planId: string,
    public readonly expiredAt: Date,
  ) {
    super(`Plan ${planId} expired at ${expiredAt.toISOString()}`);
    this.name = "PlanExpiredError";
  }
}

export class ApprovalsMissingError extends Error {
  constructor(public readonly missingCapabilities: string[]) {
    super(`Approvals missing for capabilities: ${missingCapabilities.join(", ")}`);
    this.name = "ApprovalsMissingError";
  }
}

/** Default targetRef derivation: kept simple here, deeper analysis (repo URLs, catalog ids) */
function defaultTargetRef(plan: Plan): string {
  return `${plan.templateId}:${plan.paramsHash}`;
}

function selectSandbox(target: SandboxTarget): SandboxTarget {
  return target;
}

/** Orchestrates plan application: 1. */
export async function applyPlan(input: ApplyInput): Promise<ApplyResult> {
  const {
    plan,
    resolvedSteps,
    actions,
    planCtx,
    liveRepoRoot,
    triggeredByUserId,
    workspaceRoot,
    secrets = {},
    signal: callerSignal,
    dryRun = false,
    targetRef = defaultTargetRef(plan),
    requestId,
    approvals = [],
  } = input;

  // 1. Gates.
  const now = new Date();
  if (new Date(plan.expiresAt).getTime() <= now.getTime()) {
    throw new PlanExpiredError(plan.id, new Date(plan.expiresAt));
  }
  const signer = createApprovalSigner();
  const residual = residualMissingApprovals(plan.requiresApproval, approvals, signer, plan.id);
  if (residual.length > 0) {
    throw new ApprovalsMissingError(residual.map((r) => r.capability));
  }
  const fresh = await ensurePlanFresh(plan.bindingId, new Date(plan.createdAt));
  if (fresh.stale && fresh.bindingUpdatedAt) {
    throw new StalePlanError(plan.bindingId!, fresh.bindingUpdatedAt);
  }

  // 2. Lock.
  const lock = await acquireTargetLock(plan.templateId, targetRef);

  // 3. Sandbox.
  const sandbox = await acquireSandbox({
    taskId: plan.id, // task id mirrors plan id for the v1 1:1 relationship
    target: selectSandbox(plan.target),
    liveRepoRoot,
    workspaceRoot,
  });

  const taskId = randomUUID();
  const redactor = createRedactor(Object.values(secrets));
  const secretAccessor = createSecretAccessor(secrets, redactor);

  // 4. Persist initial task row + step rows.
  await prisma.scaffoldTask.create({
    data: {
      id: taskId,
      planId: plan.id,
      status: "running",
      triggeredByUserId,
      actorKind: plan.actor.kind,
      requestId: requestId ?? null,
      compensations: [],
      steps: {
        create: resolvedSteps.map((s) => ({
          stepId: s.stepId,
          action: s.action,
          status: "pending",
        })),
      },
    },
  });

  const internalAbort = new AbortController();
  const onAbort = () => internalAbort.abort();
  if (callerSignal) {
    if (callerSignal.aborted) internalAbort.abort();
    else callerSignal.addEventListener("abort", onAbort, { once: true });
  }

  // 5. Run executor + stream events to DB + bus.
  const persisted: Array<{ stepId: string; compensation: Compensation }> = [];
  const persistPromises: Promise<unknown>[] = [];

  const result = await execute({
    taskId,
    plan,
    resolvedSteps,
    actions,
    planCtx,
    workspacePath: sandbox.workspacePath,
    repoRoot: sandbox.repoRoot,
    signal: internalAbort.signal,
    secrets: secretAccessor,
    redactor,
    dryRun,
    emit: (event: StepEvent) => {
      taskEventBus.publish(event);
      persistPromises.push(persistEvent(taskId, event, requestId));
    },
  });

  for (const c of result.compensations) persisted.push(c);

  // Wait for any straggling DB writes from the event loop.
  await Promise.allSettled(persistPromises);

  // 6. Final task update.
  await prisma.scaffoldTask.update({
    where: { id: taskId },
    data: {
      status: result.status,
      finishedAt: new Date(),
      output: result.output as never,
      error: result.error ?? null,
      compensations: persisted as never,
    },
  });

  if (callerSignal) callerSignal.removeEventListener("abort", onAbort);

  try {
    await lock.release();
  } finally {
    await sandbox.dispose();
  }

  return {
    taskId,
    status: result.status,
    output: result.output,
    error: result.error ?? null,
    rolledBack: result.rolledBack,
  };
}

async function persistEvent(
  taskId: string,
  event: StepEvent,
  requestId: string | undefined,
): Promise<void> {
  switch (event.kind) {
    case "step.started":
      await prisma.scaffoldTaskStep.updateMany({
        where: { taskId, stepId: event.stepId },
        data: { status: "running", startedAt: new Date() },
      });
      return;
    case "step.finished":
      await prisma.scaffoldTaskStep.updateMany({
        where: { taskId, stepId: event.stepId },
        data: {
          status:
            event.status === "succeeded"
              ? "succeeded"
              : event.status === "failed"
                ? "failed"
                : "cancelled",
          finishedAt: new Date(),
          output: (event.output ?? null) as never,
          error: event.error ?? null,
        },
      });
      return;
    case "log":
      await prisma.scaffoldTaskLog.create({
        data: {
          taskId,
          stepId: event.stepId ?? null,
          level: event.level,
          body: event.body,
          requestId: requestId ?? null,
        },
      });
      return;
    case "task.started":
    case "task.finished":
      // Task lifecycle is captured in the surrounding ScaffoldTask row update.
      return;
  }
}
