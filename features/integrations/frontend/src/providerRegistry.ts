// Catalog of integration providers; entries without a ConnectDialog render as "Coming soon" cards.

import type { ComponentType } from "react";
import type { IntegrationDetail, IntegrationKind } from "@feature/integrations-shared";
import { GithubConnectDialog } from "./GithubConnectDialog";
import { GithubManagePanel } from "./GithubManagePanel";
import { GrafanaConnectDialog } from "./GrafanaConnectDialog";
import { GrafanaManagePanel } from "./GrafanaManagePanel";

export interface ProviderDialogProps {
  open: boolean;
  onClose: () => void;
  onConnected: () => void;
}

export interface ManagePanelProps {
  integration: IntegrationDetail;
  onChanged: () => void;
}

export interface ProviderEntry {
  kind: IntegrationKind;
  labelKey: string;
  descriptionKey: string;
  ConnectDialog?: ComponentType<ProviderDialogProps>;
  ManagePanel?: ComponentType<ManagePanelProps>;
}

export const PROVIDERS: ProviderEntry[] = [
  {
    kind: "github",
    labelKey: "providers.github.label",
    descriptionKey: "providers.github.description",
    ConnectDialog: GithubConnectDialog,
    ManagePanel: GithubManagePanel,
  },
  {
    kind: "jira",
    labelKey: "providers.jira.label",
    descriptionKey: "providers.jira.description",
  },
  {
    kind: "slack",
    labelKey: "providers.slack.label",
    descriptionKey: "providers.slack.description",
  },
  {
    kind: "grafana",
    labelKey: "providers.grafana.label",
    descriptionKey: "providers.grafana.description",
    ConnectDialog: GrafanaConnectDialog,
    ManagePanel: GrafanaManagePanel,
  },
];

export function findProvider(kind: IntegrationKind): ProviderEntry | undefined {
  return PROVIDERS.find((p) => p.kind === kind);
}
