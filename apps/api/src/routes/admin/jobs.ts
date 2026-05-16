import { Router } from "express";
import { z } from "zod";
import { prisma } from "@internal/db";
import { requireAuth, requireRole } from "../../middleware/requireAuth";
import { adminLimiter } from "../../middleware/rateLimit";
import { recordAudit } from "../../audit/audit";
import { getJob, listJobs, runJob } from "../../jobs";

export const adminJobsRouter = Router();

adminJobsRouter.use(adminLimiter, requireAuth, requireRole("admin"));

adminJobsRouter.get("/", async (_req, res, next) => {
  try {
    const defs = listJobs();
    const states = await prisma.jobState.findMany({
      where: { name: { in: defs.map((d) => d.name) } },
    });
    const stateMap = new Map(states.map((s) => [s.name, s]));
    const recentRuns = await prisma.jobRun.findMany({
      where: { jobName: { in: defs.map((d) => d.name) } },
      orderBy: { startedAt: "desc" },
      take: 5 * defs.length,
    });
    const runsByJob = new Map<string, typeof recentRuns>();
    for (const r of recentRuns) {
      const arr = runsByJob.get(r.jobName) ?? [];
      if (arr.length < 5) {
        arr.push(r);
        runsByJob.set(r.jobName, arr);
      }
    }
    res.json({
      items: defs.map((d) => {
        const s = stateMap.get(d.name);
        return {
          name: d.name,
          schedule: d.schedule,
          timeoutMs: d.timeoutMs ?? 5 * 60 * 1000,
          enabled: s?.enabled ?? true,
          lastRunAt: s?.lastRunAt?.toISOString() ?? null,
          lastSuccessAt: s?.lastSuccessAt?.toISOString() ?? null,
          lastError: s?.lastError ?? null,
          recentRuns: (runsByJob.get(d.name) ?? []).map((r) => ({
            id: r.id,
            triggeredBy: r.triggeredBy,
            startedAt: r.startedAt.toISOString(),
            finishedAt: r.finishedAt?.toISOString() ?? null,
            status: r.status,
            durationMs: r.durationMs,
            error: r.error,
          })),
        };
      }),
    });
  } catch (err) {
    next(err);
  }
});

adminJobsRouter.post("/:name/run", async (req, res, next) => {
  try {
    const { name } = req.params;
    if (!name || !getJob(name)) {
      res.status(404).json({ error: "Unknown job" });
      return;
    }
    const result = await runJob(name, "manual", {
      triggeredByUserId: req.user?.id ?? null,
      requestId: req.id != null ? String(req.id) : null,
    });
    if (result.status === "skipped") {
      res.status(409).json({ error: `Skipped: ${result.reason}` });
      return;
    }
    await recordAudit(
      req,
      "job.run.manual",
      { jobName: name, jobRunId: result.jobRunId },
      { kind: "job", id: name },
    );
    res.status(202).json({ jobRunId: result.jobRunId });
  } catch (err) {
    next(err);
  }
});

const patchSchema = z.object({ enabled: z.boolean() });

adminJobsRouter.patch("/:name", async (req, res, next) => {
  try {
    const { name } = req.params;
    if (!name || !getJob(name)) {
      res.status(404).json({ error: "Unknown job" });
      return;
    }
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid body" });
      return;
    }
    await prisma.jobState.upsert({
      where: { name },
      update: { enabled: parsed.data.enabled },
      create: { name, enabled: parsed.data.enabled },
    });
    await recordAudit(
      req,
      "job.toggled",
      { jobName: name, enabled: parsed.data.enabled },
      { kind: "job", id: name },
    );
    res.json({ name, enabled: parsed.data.enabled });
  } catch (err) {
    next(err);
  }
});
