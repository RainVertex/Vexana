import type { ToolGroup } from "../../types";
import { sourceInfo, sourceSearch, sourceListDir, sourceReadFile } from "./reads";

export const platformSourceGroup: ToolGroup = {
  meta: {
    id: "platform-source",
    label: "Platform kaynak kodu",
    description:
      "Platformun kendi deposunu okuyarak nasıl çalıştığını ve nasıl değiştirileceğini açıklar.",
    order: 95,
  },
  tools: [sourceInfo, sourceSearch, sourceListDir, sourceReadFile],
};
