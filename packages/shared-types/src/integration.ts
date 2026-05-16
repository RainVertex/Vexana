import type { ID, ISODateString, NamedEntity } from "./common";

export type IntegrationKind = "github" | "jira" | "slack" | "grafana" | "plane";

export interface Integration extends NamedEntity {
  kind: IntegrationKind;
  enabled: boolean;
  config: Record<string, unknown>;
}

/** Public summary of a connected GitHub App installation, exposed via GET */
export interface GithubInstallationSummary {
  integrationId: ID;
  name: string;
  accountLogin: string;
}

// One row of the GithubReconciliationRun audit table. Returned by both the
// /resync endpoint (the row it just produced) and the /drift endpoint
// (recent runs feed).
export interface GithubReconciliationRunDto {
  runId: string;
  installationId: number;
  source: "webhook" | "cron" | "manual";
  ok: boolean;
  skippedReason?: "user_account" | "no_org_login" | "app_not_configured";
  teamsCreated: number;
  teamsUpdated: number;
  teamsDeleted: number;
  membersAdded: number;
  membersRemoved: number;
  pendingQueued: number;
  pendingResolved: number;
  errors: Array<{ scope: string; reason: string }>;
  startedAt: string;
  finishedAt: string;
}

export interface GithubDriftTeamDto {
  id: ID;
  slug: string;
  name: string;
  externalSlug: string | null;
  lastSyncedAt: ISODateString | null;
  memberCount: number;
  pendingMemberCount: number;
  stale: boolean;
}

export interface GithubDriftDto {
  installationId: number;
  teams: GithubDriftTeamDto[];
  // Up to 10 most recent runs across all sources, newest first.
  lastRuns: Array<{
    id: ID;
    source: string;
    installationId: number;
    startedAt: ISODateString;
    finishedAt: ISODateString | null;
    teamsCreated: number;
    teamsUpdated: number;
    teamsDeleted: number;
    membersAdded: number;
    membersRemoved: number;
    pendingQueued: number;
    pendingResolved: number;
    errors: unknown;
  }>;
  lastBySource: Record<"webhook" | "cron" | "manual", GithubDriftDto["lastRuns"][number] | null>;
  pendingMemberCount: number;
}
