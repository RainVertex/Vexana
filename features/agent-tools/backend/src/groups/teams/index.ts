import type { ToolGroup } from "../../types";
import { listMine, listForUser } from "./membership";
import { getTeam, listMembers } from "./directory";

export const teamsGroup: ToolGroup = {
  meta: {
    id: "teams",
    label: "Takımlar",
    description: "Takım listeleme ve üyelik sorguları.",
    order: 20,
  },
  tools: [listMine, listForUser, getTeam, listMembers],
};
