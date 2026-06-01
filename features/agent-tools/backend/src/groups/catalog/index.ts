import type { ToolGroup } from "../../types";
import { search, getEntity, ownedByTeam } from "./entities";

export const catalogGroup: ToolGroup = {
  meta: {
    id: "catalog",
    label: "Katalog",
    description: "Katalog varlıklarını arama ve görüntüleme.",
    order: 40,
  },
  tools: [search, getEntity, ownedByTeam],
};
