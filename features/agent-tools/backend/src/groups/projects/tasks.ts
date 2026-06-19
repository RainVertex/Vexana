import type { RegisteredTool } from "@internal/llm-core";
import { createSubtask, listSubtasks, getTask } from "@feature/projects-backend/contract";
import { requireUserId } from "../core";

export const createSubtaskTool: RegisteredTool = {
  id: "projects_create_subtask",
  openaiDef: {
    type: "function",
    function: {
      name: "projects_create_subtask",
      description:
        "Create one subtask under an existing parent task. The subtask inherits the parent's project and board column. Requires write access on the project. Call projects_list_subtasks first to avoid creating duplicates.",
      parameters: {
        type: "object",
        properties: {
          parentTaskId: { type: "string", description: "Id of the parent task." },
          title: { type: "string", description: "Short, concrete subtask title." },
          description: {
            type: "string",
            description: "Optional one or two sentence detail for the subtask.",
          },
        },
        required: ["parentTaskId", "title"],
      },
    },
  },
  handler: async (args, ctx) => {
    const userId = requireUserId(ctx);
    const { parentTaskId, title, description } = args as {
      parentTaskId: string;
      title: string;
      description?: string;
    };
    return createSubtask({ userId, parentTaskId, title, description });
  },
};

export const listSubtasksTool: RegisteredTool = {
  id: "projects_list_subtasks",
  openaiDef: {
    type: "function",
    function: {
      name: "projects_list_subtasks",
      description:
        "List the subtasks already created under a parent task. Call this before creating subtasks so you do not duplicate existing ones.",
      parameters: {
        type: "object",
        properties: {
          parentTaskId: { type: "string", description: "Id of the parent task." },
        },
        required: ["parentTaskId"],
      },
    },
  },
  handler: async (args, ctx) => {
    const userId = requireUserId(ctx);
    const { parentTaskId } = args as { parentTaskId: string };
    return listSubtasks({ userId, parentTaskId });
  },
};

export const getTaskTool: RegisteredTool = {
  id: "projects_get_task",
  openaiDef: {
    type: "function",
    function: {
      name: "projects_get_task",
      description: "Fetch a single project task by id (title, description, status, project).",
      parameters: {
        type: "object",
        properties: {
          taskId: { type: "string", description: "Id of the task." },
        },
        required: ["taskId"],
      },
    },
  },
  handler: async (args, ctx) => {
    const userId = requireUserId(ctx);
    const { taskId } = args as { taskId: string };
    return getTask({ userId, taskId });
  },
};
