import cron, { type ScheduledTask } from "node-cron";
import { logger } from "../logger/logger";
import { listJobs, runJob } from "./registry";

const tasks = new Map<string, ScheduledTask>();

export function startScheduler(): void {
  for (const def of listJobs()) {
    if (!cron.validate(def.schedule)) {
      logger.error(
        { jobName: def.name, schedule: def.schedule },
        "Invalid cron expression; skipping",
      );
      continue;
    }
    const task = cron.schedule(def.schedule, () => {
      runJob(def.name, "schedule").catch((err) => {
        logger.error({ err, jobName: def.name }, "Scheduler runJob threw");
      });
    });
    tasks.set(def.name, task);
    logger.info({ jobName: def.name, schedule: def.schedule }, "Job scheduled");
  }
}

export function stopScheduler(): void {
  for (const [name, task] of tasks.entries()) {
    task.stop();
    logger.info({ jobName: name }, "Job schedule stopped");
  }
  tasks.clear();
}
