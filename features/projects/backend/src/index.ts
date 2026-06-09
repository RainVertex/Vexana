export { projectsRouter } from "./router";
export {
  provisionProjectForEntity,
  provisionProjectsForInstallation,
  reconcileProjectMembersForInstallation,
  archiveProjectByGithubRepoId,
  unarchiveProjectByGithubRepoId,
} from "./services/github-provisioning";

import type { FeatureManifest } from "@internal/feature-host";
import { projectsRouter as projectsRouterForManifest } from "./router";

export const featureManifest: FeatureManifest = {
  mounts: [{ path: "/api/projects", router: projectsRouterForManifest }],
};
