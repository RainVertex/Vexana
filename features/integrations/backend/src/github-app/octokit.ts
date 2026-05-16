// Installation-scoped Octokit factory. `@octokit/auth-app` handles RS256 JWT
// signing, installation token minting, and TTL caching for us — we just hand
// it the appId/privateKey from env and an installationId from the Integration
// row. App-only auth (no installation) is also exposed for the install
// callback, which needs to call /app/installations/<id> to read account info
// before any installation-scoped client exists for it.

import type { Octokit as OctokitClient } from "octokit";
import { loadGitHubAppConfig } from "./config";

// `octokit` v5 ships ESM-only and the api backend is CJS. Mirror the deferred
// import dance from features/scaffolder and features/catalog so module load
// doesn't blow up under the CJS loader.
async function loadOctokit(): Promise<typeof OctokitClient> {
  const mod = await import("octokit");
  return mod.Octokit;
}

async function loadAuthAppStrategy() {
  const mod = await import("@octokit/auth-app");
  return mod.createAppAuth;
}

export class GitHubAppNotConfiguredError extends Error {
  constructor(readonly missing: string[]) {
    super(`GitHub App is not configured. Missing env vars: ${missing.join(", ")}`);
    this.name = "GitHubAppNotConfiguredError";
  }
}

/** Octokit authenticated as the App itself (no installation). */
export async function octokitAsApp(): Promise<OctokitClient> {
  const cfg = loadGitHubAppConfig();
  if (!cfg.ok) throw new GitHubAppNotConfiguredError(cfg.missing);
  const Octokit = await loadOctokit();
  const createAppAuth = await loadAuthAppStrategy();
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: cfg.appId,
      privateKey: cfg.privateKey,
      clientId: cfg.clientId,
      clientSecret: cfg.clientSecret,
    },
  });
}

/** Octokit authenticated as a specific installation. */
export async function octokitForInstallation(installationId: number): Promise<OctokitClient> {
  const cfg = loadGitHubAppConfig();
  if (!cfg.ok) throw new GitHubAppNotConfiguredError(cfg.missing);
  const Octokit = await loadOctokit();
  const createAppAuth = await loadAuthAppStrategy();
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: cfg.appId,
      privateKey: cfg.privateKey,
      clientId: cfg.clientId,
      clientSecret: cfg.clientSecret,
      installationId,
    },
  });
}
