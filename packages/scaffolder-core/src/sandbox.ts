import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SandboxTarget } from "./types";

export interface SandboxHandle {
  /** Where actions write during apply. */
  workspacePath: string;
  /** Where repo:scaffold and wire:* commit final outputs. */
  repoRoot: string;
  target: SandboxTarget;
  /** Cleanup callback invoked by the executor on completion. */
  dispose(): Promise<void>;
}

export interface AcquireSandboxInput {
  taskId: string;
  target: SandboxTarget;
  /** The live monorepo root. */
  liveRepoRoot: string;
  /** Override workspace root (tests use a temp dir). */
  workspaceRoot?: string;
}

/** Resolves the workspace + repo paths for an executor run. */
export async function acquireSandbox(input: AcquireSandboxInput): Promise<SandboxHandle> {
  const root = input.workspaceRoot ?? join(tmpdir(), "scaffolder");
  const workspacePath = join(root, input.taskId);
  await fs.mkdir(workspacePath, { recursive: true });

  let repoRoot: string;
  switch (input.target) {
    case "main":
    case "branch":
      repoRoot = input.liveRepoRoot;
      break;
    case "worktree":
      repoRoot = join(workspacePath, "_repo");
      await fs.mkdir(repoRoot, { recursive: true });
      break;
  }

  return {
    workspacePath,
    repoRoot,
    target: input.target,
    dispose: async () => {
      // Clean the workspace. never touch the live repoRoot.
      await fs.rm(workspacePath, { recursive: true, force: true });
    },
  };
}
