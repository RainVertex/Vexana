import { projectsDb } from "@internal/db";
import { meetsLevel, resolveAccess } from "./permissions";
import { taskDto, TASK_INCLUDE, type TaskDto } from "./dto";

// Subtask operations shared by the agent tools (and any future HTTP route). Each returns a result
// object (either the data or an `error` string) so a tool can hand it straight back to the model.

type SubtaskResult = { subtask: TaskDto } | { error: string };
type SubtaskListResult = { subtasks: TaskDto[] } | { error: string };
type TaskResult = { task: TaskDto } | { error: string };

export async function createSubtask(input: {
  userId: string;
  parentTaskId: string;
  title: string;
  description?: string | null;
}): Promise<SubtaskResult> {
  const title = input.title?.trim();
  if (!title) return { error: "title is required" };

  const parent = await projectsDb.task.findUnique({
    where: { id: input.parentTaskId },
    select: { id: true, projectId: true, bucketId: true },
  });
  if (!parent) return { error: `Parent task "${input.parentTaskId}" not found` };

  const access = await resolveAccess(input.userId, parent.projectId);
  if (!access) return { error: "Project not found" };
  if (!meetsLevel(access, "write")) return { error: "Write permission required" };

  const created = await projectsDb.task.create({
    data: {
      projectId: parent.projectId,
      parentTaskId: parent.id,
      bucketId: parent.bucketId,
      title,
      description: input.description?.trim() || null,
      createdByUserId: input.userId,
    },
    include: TASK_INCLUDE,
  });
  return { subtask: taskDto(created) };
}

export async function listSubtasks(input: {
  userId: string;
  parentTaskId: string;
}): Promise<SubtaskListResult> {
  const parent = await projectsDb.task.findUnique({
    where: { id: input.parentTaskId },
    select: { id: true, projectId: true },
  });
  if (!parent) return { error: `Task "${input.parentTaskId}" not found` };

  const access = await resolveAccess(input.userId, parent.projectId);
  if (!access) return { error: "Project not found" };

  const children = await projectsDb.task.findMany({
    where: { parentTaskId: parent.id },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: TASK_INCLUDE,
  });
  return { subtasks: children.map(taskDto) };
}

export async function getTask(input: { userId: string; taskId: string }): Promise<TaskResult> {
  const task = await projectsDb.task.findUnique({
    where: { id: input.taskId },
    include: TASK_INCLUDE,
  });
  if (!task) return { error: "Task not found" };

  const access = await resolveAccess(input.userId, task.projectId);
  if (!access) return { error: "Task not found" };

  return { task: taskDto(task) };
}
