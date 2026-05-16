// Catalog of integration providers shown on the Integrations page. Providers
// without a `ConnectDialog` render as "Coming soon" cards — the type system
// already lists them in `IntegrationKind`, but no backend connect flow exists
// yet.

import type { ComponentType } from "react";
import type { IntegrationKind } from "@internal/shared-types";
import { GithubConnectDialog } from "./GithubConnectDialog";
import { PlaneConnectDialog } from "./PlaneConnectDialog";

export interface ProviderDialogProps {
  open: boolean;
  onClose: () => void;
  onConnected: () => void;
}

export interface ProviderEntry {
  kind: IntegrationKind;
  label: string;
  description: string;
  ConnectDialog?: ComponentType<ProviderDialogProps>;
}

export const PROVIDERS: ProviderEntry[] = [
  {
    kind: "plane",
    label: "Plane",
    description:
      "Self-hosted project management. Mirrors projects, work items, and comments into the workspace module.",
    ConnectDialog: PlaneConnectDialog,
  },
  {
    kind: "github",
    label: "GitHub",
    description:
      "Install the GitHub App on an org. Imports repos (catalog-info.yaml auto-discovery) plus teams + members, kept in sync via webhooks and weekly reconciliation.",
    ConnectDialog: GithubConnectDialog,
  },
  {
    kind: "jira",
    label: "Jira",
    description: "Atlassian projects, issues, and sprints.",
  },
  {
    kind: "slack",
    label: "Slack",
    description: "Channel events, mentions, and notifications.",
  },
  {
    kind: "grafana",
    label: "Grafana",
    description: "Dashboards and alerts from a Grafana instance.",
  },
];

export function findProvider(kind: IntegrationKind): ProviderEntry | undefined {
  return PROVIDERS.find((p) => p.kind === kind);
}
