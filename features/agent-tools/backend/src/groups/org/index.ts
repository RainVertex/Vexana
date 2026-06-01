import type { ToolGroup } from "../../types";
import { listDepartments, getDepartment } from "./departments";

export const orgGroup: ToolGroup = {
  meta: {
    id: "org",
    label: "Organizasyon",
    description: "Departman listeleme ve detayları.",
    order: 50,
  },
  tools: [listDepartments, getDepartment],
};
