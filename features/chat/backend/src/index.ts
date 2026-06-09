export { chatRouter } from "./routes";
export { registerChatWriteTools } from "./tools";

import type { FeatureManifest } from "@internal/feature-host";
import { chatRouter as chatRouterForManifest } from "./routes";
import { registerChatWriteTools as registerChatWriteToolsForManifest } from "./tools";

export const featureManifest: FeatureManifest = {
  mounts: [{ path: "/api/chat", router: chatRouterForManifest }],
  onBoot: registerChatWriteToolsForManifest,
};
