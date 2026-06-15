// fetch:remote-template: clones a skeleton from a GitHub repo at a ref into a temp dir outside the
// workspace (so publish steps never commit it), then renders it into the workspace via Nunjucks.
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { z } from "zod";
import simpleGit, { type SimpleGit } from "simple-git";
import {
  renderSkeletonInto,
  type Action,
  type Mutation,
  type WriteCtx,
} from "@internal/scaffolder-core";

const fetchRemoteTemplateInput = z.object({
  repo: z
    .string()
    .regex(/^[^/\s]+\/[^/\s]+$/, 'repo must be "owner/repo"')
    .describe("GitHub repository holding the skeleton, as owner/repo"),
  ref: z
    .string()
    .min(1)
    .optional()
    .describe("Branch or tag to clone, pin to a tag for reproducible plans"),
  path: z
    .string()
    .default(".")
    .describe("Subdirectory within the repo to render, defaults to the repo root"),
  values: z
    .record(z.string(), z.unknown())
    .describe("Values exposed to skeleton files as ${{ values.* }}"),
  skipRender: z
    .array(z.string())
    .optional()
    .describe("Substring-matched files copied verbatim without rendering"),
  pathSubstitutions: z
    .record(z.string(), z.string())
    .optional()
    .describe("Filename marker replacements, e.g. __PASCAL__"),
  tokenSecret: z
    .string()
    .default("GITHUB_TOKEN")
    .describe("Platform secret holding the GitHub token, only needed for private repos"),
});

type FetchRemoteTemplateInput = z.infer<typeof fetchRemoteTemplateInput>;

const CLONE_PREFIX = "scaffolder-skeleton-";

// Keep the rendered subtree inside the clone, never above it.
function resolveSkeletonRoot(cloneDir: string, subPath: string): string {
  const root = resolve(cloneDir, subPath);
  if (root !== cloneDir && !root.startsWith(cloneDir + sep)) {
    throw new Error(`fetch:remote-template path escapes the repo: ${subPath}`);
  }
  return root;
}

export const fetchRemoteTemplateAction: Action<FetchRemoteTemplateInput, { files: string[] }> = {
  id: "fetch:remote-template",
  description:
    "Clone a skeleton from a GitHub repo at a ref and render it into the workspace via Nunjucks.",
  schema: fetchRemoteTemplateInput,
  capabilities: ["fs:write", "repo:read", "network:external", "secrets:read:GITHUB_TOKEN"],
  async match() {
    return "absent";
  },
  async diff(input): Promise<Mutation[]> {
    const at = input.ref ? `@${input.ref}` : "";
    return [
      { kind: "debug.log", message: `fetch:remote-template ${input.path} from ${input.repo}${at}` },
    ];
  },
  async apply(input, ctx: WriteCtx) {
    const at = input.ref ? `@${input.ref}` : "";
    if (ctx.dryRun) {
      ctx.logger.info(`[dry-run] fetch:remote-template would clone ${input.repo}${at}`);
      return { output: { files: [] }, compensation: { kind: "noop", reason: "dry run" } };
    }

    const token = ctx.secrets.tryRead(input.tokenSecret);
    const remoteUrl = `https://github.com/${input.repo}.git`;
    const cloneUrl = token
      ? remoteUrl.replace(/^https:\/\//, `https://x-access-token:${token}@`)
      : remoteUrl;

    const cloneDir = await fs.mkdtemp(join(tmpdir(), CLONE_PREFIX));
    try {
      const cloneArgs = ["--depth", "1", "--single-branch"];
      if (input.ref) cloneArgs.push("--branch", input.ref);
      const git: SimpleGit = simpleGit();
      await git.clone(cloneUrl, cloneDir, cloneArgs);
      // Drop git metadata so a path of "." never renders the repo's .git into the workspace.
      await fs.rm(join(cloneDir, ".git"), { recursive: true, force: true });

      const skeletonRoot = resolveSkeletonRoot(cloneDir, input.path);
      const stat = await fs.stat(skeletonRoot).catch(() => null);
      if (!stat?.isDirectory()) {
        throw new Error(
          `fetch:remote-template: path "${input.path}" not found in ${input.repo}${at}`,
        );
      }

      const written = await renderSkeletonInto({
        skeletonPath: skeletonRoot,
        values: input.values,
        skipRender: input.skipRender,
        pathSubstitutions: input.pathSubstitutions,
        workspacePath: ctx.workspacePath,
        dryRun: false,
        signal: ctx.signal,
        logger: ctx.logger,
      });
      ctx.logger.info(
        `fetch:remote-template rendered ${written.length} files from ${input.repo}${at}`,
      );
      return {
        output: { files: written },
        compensation: { kind: "noop", reason: "workspace cleared by executor" },
      };
    } finally {
      await fs.rm(cloneDir, { recursive: true, force: true });
    }
  },
};

export { fetchRemoteTemplateInput };
