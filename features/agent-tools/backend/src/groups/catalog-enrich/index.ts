import type { ToolGroup } from "../../types";
import { lookup, discover, readRepo, readFile } from "./reads";
import { openYamlPr } from "./pr";

export const catalogEnrichGroup: ToolGroup = {
  meta: {
    id: "catalog-enrich",
    label: "Katalog zenginleştirme",
    description: "Repoyu inceleyip catalog-info.yaml'ı doldurmak için PR açma.",
    order: 90,
  },
  tools: [lookup, discover, readRepo, readFile, openYamlPr],
};
