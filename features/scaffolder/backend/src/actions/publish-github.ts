import { promises as fs } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import simpleGit, { type SimpleGit } from "simple-git";
import type { Octokit as OctokitClient } from "octokit";
import type { Action, ReadCtx, WriteCtx } from "@internal/scaffolder-core";

// `octokit` v5 ships ESM-only. The api backend is CJS (uses __dirname), so a
// static `import { Octokit }` blows up Node's CJS loader at module load. We
// only need it inside apply(), so defer the load.
async function loadOctokit(): Promise<typeof OctokitClient> {
  const mod = await import("octokit");
  return mod.Octokit;
}

// publish:github creates a GitHub repo via Octokit, then pushes the apply
// workspace's contents as the initial commit via simple-git. Both mutations
// are flagged irreversible — the platform never auto-deletes a repo, so
// rollback is "noop + report" and the apply gate refuses to run without an
// approval token covering repo:public + network:external.

const publishGithubInput = z.object({
  org: z.string().min(1),
  name: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9._-]+$/, "repo name must be GitHub-safe"),
  visibility: z.enum(["public", "private"]).default("private"),
  description: z.string().max(350).optional(),
  defaultBranch: z.string().default("main"),
  // Name of the secret in the SecretAccessor whose value is the GitHub token.
  // Defaults to GITHUB_TOKEN; templates can override per-environment.
  tokenSecret: z.string().default("GITHUB_TOKEN"),
});

type PublishGithubInput = z.infer<typeof publishGithubInput>;

export interface PublishGithubOutput {
  remoteUrl: string;
  defaultBranch: string;
  repoVisibility: "public" | "private";
  repoFullName: string;
  initialCommitSha: string;
}

async function repoExists(octo: OctokitClient, org: string, name: string): Promise<boolean> {
  try {
    await octo.rest.repos.get({ owner: org, repo: name });
    return true;
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404) return false;
    throw err;
  }
}

async function createRepo(
  octo: OctokitClient,
  input: PublishGithubInput,
): Promise<{ fullName: string; cloneUrl: string }> {
  // Try the org-creation endpoint first; if the org turns out to be a user
  // login, fall back to the authenticated-user endpoint. We can't tell ahead
  // of time without a Get-org call, so trial-then-fallback is simpler than a
  // pre-flight type check.
  try {
    const { data } = await octo.rest.repos.createInOrg({
      org: input.org,
      name: input.name,
      private: input.visibility === "private",
      description: input.description,
      auto_init: false,
    });
    return { fullName: data.full_name, cloneUrl: data.clone_url };
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status !== 404) throw err;
    const { data } = await octo.rest.repos.createForAuthenticatedUser({
      name: input.name,
      private: input.visibility === "private",
      description: input.description,
      auto_init: false,
    });
    return { fullName: data.full_name, cloneUrl: data.clone_url };
  }
}

async function pushInitialCommit(
  workspacePath: string,
  remoteUrl: string,
  defaultBranch: string,
  token: string,
  authoredBy: string,
): Promise<string> {
  // The clone URL embeds the token via x-access-token, the conventional
  // form GitHub recommends for fine-scoped tokens used over HTTPS.
  const authedUrl = remoteUrl.replace(/^https:\/\//, `https://x-access-token:${token}@`);
  const git: SimpleGit = simpleGit(workspacePath);
  await git.init();
  await git.addConfig("user.email", `${authoredBy}@scaffolder.platform`);
  await git.addConfig("user.name", "Scaffolder");
  await git.add(".");
  // --allow-empty in case the workspace ended up with zero files (a misconfigured
  // template); the user still gets a real repo with a sensible head.
  const commit = await git.commit("Initial scaffold", { "--allow-empty": null });
  await git.branch(["-M", defaultBranch]);
  await git.addRemote("origin", authedUrl);
  await git.push(["-u", "origin", defaultBranch]);
  return commit.commit;
}

export const publishGithubAction: Action<PublishGithubInput, PublishGithubOutput> = {
  id: "publish:github",
  description: "Create a GitHub repo and push the workspace as the initial commit.",
  schema: publishGithubInput,
  capabilities: ["network:external", "repo:public", "secrets:read:GITHUB_TOKEN"],
  irreversible: true,
  async match(_input, _ctx: ReadCtx) {
    // Without a token we can't probe; treat as absent. The action's apply
    // step will refuse if the repo already exists.
    return "absent";
  },
  async diff(input) {
    return [
      {
        kind: "github.createRepo",
        org: input.org,
        name: input.name,
        visibility: input.visibility,
      },
      {
        kind: "github.push",
        remoteUrl: `https://github.com/${input.org}/${input.name}.git`,
        branch: input.defaultBranch,
        // file count is computed at apply time; the plan-time mutation is
        // illustrative only.
        fileCount: 0,
      },
    ];
  },
  async apply(input, ctx: WriteCtx) {
    const token = ctx.secrets.read(input.tokenSecret);
    // ctx.secrets.read auto-registers with the redactor, but be explicit too —
    // protects against a future SecretAccessor that doesn't.
    if (token.length >= 4) {
      ctx.logger.info(`publish:github authenticating as token "${token.slice(0, 4)}***"`);
    }

    if (ctx.dryRun) {
      ctx.logger.info(
        `[dry-run] publish:github would create ${input.org}/${input.name} and push ${input.defaultBranch}`,
      );
      return {
        output: {
          remoteUrl: `https://github.com/${input.org}/${input.name}.git`,
          defaultBranch: input.defaultBranch,
          repoVisibility: input.visibility,
          repoFullName: `${input.org}/${input.name}`,
          initialCommitSha: "dry-run",
        },
        compensation: { kind: "noop", reason: "dry run" },
      };
    }

    const Octokit = await loadOctokit();
    const octo = new Octokit({ auth: token });
    if (await repoExists(octo, input.org, input.name)) {
      throw new Error(
        `publish:github: ${input.org}/${input.name} already exists; refusing to overwrite`,
      );
    }
    const { fullName, cloneUrl } = await createRepo(octo, input);
    ctx.logger.info(`publish:github created ${fullName}`);

    // Snapshot file list for the audit trail; intentionally no contents in logs.
    const fileCount = await countWorkspaceFiles(ctx.workspacePath);

    const sha = await pushInitialCommit(
      ctx.workspacePath,
      cloneUrl,
      input.defaultBranch,
      token,
      ctx.actor.userId,
    );
    ctx.logger.info(`publish:github pushed ${fileCount} files to ${input.defaultBranch}`);

    return {
      output: {
        remoteUrl: cloneUrl,
        defaultBranch: input.defaultBranch,
        repoVisibility: input.visibility,
        repoFullName: fullName,
        initialCommitSha: sha,
      },
      // Irreversible: rolling back a public push is not safe automatically.
      // The executor records the noop and surfaces a "manual cleanup" report
      // via the audit trail; the operator must decide whether to delete the
      // repo by hand.
      compensation: {
        kind: "noop",
        reason: `irreversible: github repo ${fullName} created and pushed; manual cleanup required if rollback is needed`,
      },
    };
  },
};

async function countWorkspaceFiles(root: string): Promise<number> {
  let count = 0;
  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === ".git") continue;
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) await walk(abs);
      else if (entry.isFile()) count++;
    }
  }
  try {
    await walk(root);
  } catch {
    // empty workspace
  }
  return count;
}

export { publishGithubInput };
