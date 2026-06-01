import type { RegisteredTool } from "@internal/llm-core";
import { requireUserId } from "../core";
import { listUnread } from "./queries";

export const myUnread: RegisteredTool = {
  id: "notifications_my_unread",
  openaiDef: {
    type: "function",
    function: {
      name: "notifications_my_unread",
      description:
        "List the current user's unread notifications. Returns up to 30 most recent. Each entry includes a kind and a small payload object describing what happened.",
      parameters: { type: "object", properties: {} },
    },
  },
  handler: async (_args, ctx) => {
    const userId = requireUserId(ctx);
    return { notifications: await listUnread(userId) };
  },
};
