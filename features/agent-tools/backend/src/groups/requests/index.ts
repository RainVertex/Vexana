import type { ToolGroup } from "../../types";
import { myPending, myTeamRequests, myMaintainerRequests } from "./mine";

export const requestsGroup: ToolGroup = {
  meta: {
    id: "requests",
    label: "İstekler",
    description: "Kullanıcının açık istekleri ve durumları.",
    order: 30,
  },
  tools: [myPending, myTeamRequests, myMaintainerRequests],
};
