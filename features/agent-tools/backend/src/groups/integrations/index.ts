import type { ToolGroup } from "../../types";
import { listGithub } from "./github";

export const integrationsGroup: ToolGroup = {
  meta: {
    id: "integrations",
    label: "Entegrasyonlar",
    description: "Bağlı GitHub kurulumları.",
    order: 70,
  },
  tools: [listGithub],
};
