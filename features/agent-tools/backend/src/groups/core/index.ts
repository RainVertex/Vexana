import type { ToolGroup } from "../../types";
import { whoami, getToday } from "./bootstrap";

export { requireUserId } from "./context";

export const coreGroup: ToolGroup = {
  meta: {
    id: "core",
    label: "Genel",
    description: "Kullanıcı kimliği ve tarih gibi temel araçlar.",
    order: 10,
  },
  tools: [whoami, getToday],
};
