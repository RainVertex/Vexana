import { projectsDb } from "@internal/db";
import { notifyTaskDueSoon } from "./services/notifications";

// Projects background jobs for the apps/api scheduler. The interface mirrors apps/api/src/jobs/types.ts
// so this feature avoids an apps/api dependency.
export interface ProjectsJobLogger {
  info(o: unknown, msg?: string): void;
}

export interface ProjectsJobContext {
  log: ProjectsJobLogger;
  signal: AbortSignal;
}

export interface ProjectsJobDefinition {
  name: string;
  schedule: string;
  timeoutMs?: number;
  handler: (ctx: ProjectsJobContext) => Promise<void>;
}

const DUE_SOON_WINDOW_MS = 24 * 60 * 60 * 1000;

// Reminds assignees of tasks falling due within the next day. The dueReminderSentAt marker keeps it
// idempotent (each task fires once until its due date moves, which clears the marker on the PATCH path).
export function dueSoonReminderJob(): ProjectsJobDefinition {
  return {
    name: "projects.dueSoonReminder",
    schedule: "*/15 * * * *",
    timeoutMs: 5 * 60 * 1000,
    handler: async ({ log, signal }) => {
      const now = new Date();
      const horizon = new Date(now.getTime() + DUE_SOON_WINDOW_MS);
      const tasks = await projectsDb.task.findMany({
        where: {
          done: false,
          dueReminderSentAt: null,
          dueDate: { not: null, gte: now, lte: horizon },
          assignees: { some: {} },
        },
        include: {
          assignees: { select: { userId: true } },
          project: { select: { id: true, title: true } },
        },
      });

      let reminded = 0;
      for (const task of tasks) {
        if (signal.aborted) break;
        await projectsDb.$transaction(async (tx) => {
          for (const a of task.assignees) {
            await notifyTaskDueSoon(tx, {
              taskId: task.id,
              taskTitle: task.title,
              projectId: task.project.id,
              projectTitle: task.project.title,
              dueDate: task.dueDate ? task.dueDate.toISOString() : null,
              recipientUserId: a.userId,
            });
          }
          await tx.task.update({
            where: { id: task.id },
            data: { dueReminderSentAt: new Date() },
          });
        });
        reminded++;
      }

      log.info({ tasks: tasks.length, reminded }, "Due-soon reminder sweep complete");
    },
  };
}

export function getProjectsJobs(): ProjectsJobDefinition[] {
  return [dueSoonReminderJob()];
}
