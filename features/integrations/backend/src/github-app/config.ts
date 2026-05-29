// GitHub App configuration is per-platform-instance (one App, multiple
// installations). All values come from env so that App credentials never
// touch the database. Values are optional at process start, the install
// flow returns 503 with a friendly message until they're set.
//
// REQUIRED GITHUB APP PERMISSIONS (configure in the App's GitHub settings):
//
// Repository permissions:
// - Administration: Read (revoke installation on disconnect)
// - Contents: Read (read catalog-info.yaml, CODEOWNERS)
// - Metadata: Read (mandatory. list repos)
// Organization permissions:
// - Members: Read (list teams + team members for sync)
// - Administration: Read (read org metadata, optional)
//
// Subscribed events:
// installation, installation_repositories, repository, push
// team, membership, organization
//
// When new permissions are added to an existing App, current installations
// must accept the upgrade in their GitHub UI before the new APIs are usable.
// Missing perms surface as 403/404 from teams.list / orgs.listMembers. the
// reconciliation routine logs and skips, leaving prior state intact.

export interface GitHubAppConfig {
  appId: string;
  privateKey: string;
  clientId: string;
  clientSecret: string;
  webhookSecret: string;
  slug: string;
}

export interface PartialGitHubAppConfig {
  ok: false;
  missing: string[];
}

export type GitHubAppConfigResult = ({ ok: true } & GitHubAppConfig) | PartialGitHubAppConfig;

const ENV_KEYS = {
  appId: "GITHUB_APP_ID",
  privateKey: "GITHUB_APP_PRIVATE_KEY",
  clientId: "GITHUB_APP_CLIENT_ID",
  clientSecret: "GITHUB_APP_CLIENT_SECRET",
  webhookSecret: "GITHUB_APP_WEBHOOK_SECRET",
  slug: "GITHUB_APP_SLUG",
} as const;

export function loadGitHubAppConfig(): GitHubAppConfigResult {
  const missing: string[] = [];
  const values: Record<keyof GitHubAppConfig, string> = {
    appId: "",
    privateKey: "",
    clientId: "",
    clientSecret: "",
    webhookSecret: "",
    slug: "",
  };
  for (const [k, envKey] of Object.entries(ENV_KEYS) as Array<[keyof GitHubAppConfig, string]>) {
    const v = process.env[envKey];
    if (!v) {
      missing.push(envKey);
    } else {
      // PEM keys are commonly stored as a single line with "\n" escapes when
      // round-tripped through .env files. Restore real newlines.
      values[k] = k === "privateKey" ? v.replace(/\\n/g, "\n") : v;
    }
  }
  if (missing.length > 0) return { ok: false, missing };
  return { ok: true, ...values };
}

export function isAppConfigured(): boolean {
  return loadGitHubAppConfig().ok;
}
