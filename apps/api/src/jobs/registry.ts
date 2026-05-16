import { prisma } from "@internal/db";
import { logger } from "../logger/logger";
import type { JobDefinition, JobTrigger } from "./types";

const definitions = new Map<string, JobDefinition>();
const inFlight = new Map<string, AbortController>();

export function registerJob(def: JobDefinition): void {
  if (definitions.has(def.name)) {
    throw new Error(`Job already registered: ${def.name}`);
  }
  definitions.set(def.name, def);
}

export function getJob(name: string): JobDefinition | undefined {
  return definitions.get(name);
}

export function listJobs(): JobDefinition[] {
  return [...definitions.values()];
}

export function isRunning(name: string): boolean {
  return inFlight.has(name);
}

export interface RunOptions {
  triggeredByUserId?: string | null;
  requestId?: string | null;
}

export async function runJob(
  name: string,
  trigger: JobTrigger,
  options: RunOptions = {},
): Promise<{ jobRunId: string; status: "running" | "skipped"; reason?: string }> {
  const def = definitions.get(name);
  if (!def) throw new Error(`Unknown job: ${name}`);

  const state = await prisma.jobState.upsert({
    where: { name },
    update: {},
    create: { name },
  });

  if (!state.enabled && trigger === "schedule") {
    return { jobRunId: "", status: "skipped", reason: "disabled" };
  }
  if (inFlight.has(name)) {
    return { jobRunId: "", status: "skipped", reason: "already-running" };
  }

  const controller = new AbortController();
  inFlight.set(name, controller);
  const run = await prisma.jobRun.create({
    data: {
      jobName: name,
      triggeredBy: trigger,
      triggeredByUserId: options.triggeredByUserId ?? null,
      requestId: options.requestId ?? null,
    },
  });

  const startedAt = Date.now();
  const log = logger.child({ jobName: name, jobRunId: run.id });
  const timeoutMs = def.timeoutMs ?? 5 * 60 * 1000;
  const timer = setTimeout(() => controller.abort(new Error("Job timeout")), timeoutMs);

  void (async () => {
    try {
      log.info("Job starting");
      await def.handler({
        log,
        signal: controller.signal,
        cursor: state.cursor,
        setCursor: async (next) => {
          await prisma.jobState.update({
            where: { name },
            data: { cursor: next as object },
          });
        },
      });
      const durationMs = Date.now() - startedAt;
      await prisma.$transaction([
        prisma.jobRun.update({
          where: { id: run.id },
          data: { status: "succeeded", finishedAt: new Date(), durationMs },
        }),
        prisma.jobState.update({
          where: { name },
          data: { lastRunAt: new Date(), lastSuccessAt: new Date(), lastError: null },
        }),
      ]);
      log.info({ durationMs }, "Job succeeded");
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      const message = err instanceof Error ? err.message : String(err);
      await prisma.$transaction([
        prisma.jobRun.update({
          where: { id: run.id },
          data: {
            status: controller.signal.aborted ? "cancelled" : "failed",
            finishedAt: new Date(),
            durationMs,
            error: message.slice(0, 2000),
          },
        }),
        prisma.jobState.update({
          where: { name },
          data: { lastRunAt: new Date(), lastError: message.slice(0, 2000) },
        }),
      ]);
      log.error({ err, durationMs }, "Job failed");
    } finally {
      clearTimeout(timer);
      inFlight.delete(name);
    }
  })();

  return { jobRunId: run.id, status: "running" };
}

export async function cancelOrphanedRuns(): Promise<number> {
  const result = await prisma.jobRun.updateMany({
    where: { status: "running" },
    data: { status: "cancelled", finishedAt: new Date(), error: "Orphaned by restart" },
  });
  return result.count;
}

export function getInFlightCount(): number {
  return inFlight.size;
}

export function abortAll(): void {
  for (const ctrl of inFlight.values()) {
    ctrl.abort(new Error("Shutdown"));
  }
}

export async function waitForInFlight(maxWaitMs: number): Promise<void> {
  const deadline = Date.now() + maxWaitMs;
  while (inFlight.size > 0 && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 100));
  }
}
