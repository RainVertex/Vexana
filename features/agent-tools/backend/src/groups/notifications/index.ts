import type { ToolGroup } from "../../types";
import { myUnread } from "./unread";

export const notificationsGroup: ToolGroup = {
  meta: {
    id: "notifications",
    label: "Bildirimler",
    description: "Okunmamış bildirimler.",
    order: 60,
  },
  tools: [myUnread],
};
