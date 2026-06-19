import { Router } from "express";
import { projectsDb } from "@internal/db";
import { createCommentSchema } from "../zod";
import { meetsLevel, resolveAccess } from "../services/permissions";
import { commentDto } from "../services/dto";
import {
  notifyTaskCommented,
  notifyTaskMentioned,
  taskNotificationRecipients,
} from "../services/notifications";

export const commentsRoutes: Router = Router();

commentsRoutes.get("/tasks/:id/comments", async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const task = await projectsDb.task.findUnique({
      where: { id: req.params.id },
      select: { id: true, projectId: true },
    });
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    const access = await resolveAccess(userId, task.projectId);
    if (!access) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    const comments = await projectsDb.taskComment.findMany({
      where: { taskId: req.params.id },
      orderBy: { createdAt: "asc" },
      include: { author: true },
    });
    res.json(comments.map(commentDto));
  } catch (err) {
    next(err);
  }
});

commentsRoutes.post("/tasks/:id/comments", async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const task = await projectsDb.task.findUnique({
      where: { id: req.params.id },
      include: {
        project: { select: { id: true, title: true, creatorUserId: true } },
        assignees: { select: { userId: true } },
      },
    });
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    const access = await resolveAccess(userId, task.projectId);
    if (!access) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    if (!meetsLevel(access, "write")) {
      res.status(403).json({ error: "Write permission required" });
      return;
    }
    const input = createCommentSchema.parse(req.body);
    const created = await projectsDb.taskComment.create({
      data: {
        taskId: task.id,
        authorUserId: userId,
        body: input.body,
      },
      include: { author: true },
    });

    const mentioned = await resolveMentions(input.body, task.projectId, userId);
    const taskRef = {
      taskId: task.id,
      taskTitle: task.title,
      projectId: task.project.id,
      projectTitle: task.project.title,
      authorName: created.author?.displayName ?? "",
      bodySnippet: input.body.slice(0, 200),
    };
    // A mentioned user gets the mention, never also the generic comment notification.
    const commentRecipients = taskNotificationRecipients(task, { excludeUserId: userId }).filter(
      (id) => !mentioned.includes(id),
    );
    await notifyTaskMentioned({ ...taskRef, recipientUserIds: mentioned });
    await notifyTaskCommented({
      ...taskRef,
      authorUserId: userId,
      recipientUserIds: commentRecipients,
    });

    res.status(201).json(commentDto(created));
  } catch (err) {
    next(err);
  }
});

// Resolves @login tokens to user ids, keeping only users who can actually see the project and never the author.
async function resolveMentions(
  body: string,
  projectId: string,
  authorUserId: string,
): Promise<string[]> {
  const logins = [...new Set([...body.matchAll(/@([a-zA-Z0-9-]+)/g)].map((m) => m[1]))];
  if (logins.length === 0) return [];
  const candidates = await projectsDb.user.findMany({
    where: { githubLogin: { in: logins } },
    select: { id: true },
  });
  const resolved = await Promise.all(
    candidates.map(async (c) => ((await resolveAccess(c.id, projectId)) ? c.id : null)),
  );
  return resolved.filter((id): id is string => id !== null && id !== authorUserId);
}
