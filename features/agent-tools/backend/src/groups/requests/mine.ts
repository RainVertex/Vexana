import type { RegisteredTool } from "@internal/llm-core";
import { requireUserId } from "../core";
import { getMyPendingRequests, listMyTeamRequests, listMyMaintainerRequests } from "./queries";

export const myPending: RegisteredTool = {
  id: "requests_my_pending",
  openaiDef: {
    type: "function",
    function: {
      name: "requests_my_pending",
      description:
        "Summarize the current user's pending self-service requests across types: team-creation requests they submitted, team-creation requests awaiting their response, and pending maintainer-promotion requests.",
      parameters: { type: "object", properties: {} },
    },
  },
  handler: async (_args, ctx) => {
    const userId = requireUserId(ctx);
    return getMyPendingRequests(userId);
  },
};

export const myTeamRequests: RegisteredTool = {
  id: "requests_my_team_requests",
  openaiDef: {
    type: "function",
    function: {
      name: "requests_my_team_requests",
      description:
        "List all team-creation requests the current user has submitted, including their statuses (pending, awaiting_user_confirmation, approved, rejected, cancelled).",
      parameters: { type: "object", properties: {} },
    },
  },
  handler: async (_args, ctx) => {
    const userId = requireUserId(ctx);
    return { requests: await listMyTeamRequests(userId) };
  },
};

export const myMaintainerRequests: RegisteredTool = {
  id: "requests_my_maintainer_requests",
  openaiDef: {
    type: "function",
    function: {
      name: "requests_my_maintainer_requests",
      description:
        "List all maintainer-promotion requests the current user has submitted, including statuses.",
      parameters: { type: "object", properties: {} },
    },
  },
  handler: async (_args, ctx) => {
    const userId = requireUserId(ctx);
    return { requests: await listMyMaintainerRequests(userId) };
  },
};
