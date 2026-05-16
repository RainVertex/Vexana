import type { ZodType } from "zod";
import type { Capability, MatchResult, Mutation } from "../types";
import type { PlanCtx } from "../plan-ctx";

/** Read context: passed to action.match() and action.diff() during plan(). */
export type ReadCtx = PlanCtx;

export interface ActionLogger {
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}

export interface SecretAccessor {
  /** Returns the secret value or throws if unavailable. */
  read(name: string): string;
  /** Returns the secret value or null without throwing. */
  tryRead(name: string): string | null;
  /** Lists registered secret names (not values). */
  names(): string[];
}

/** Inverse operation recorded after a successful apply step. */
export type Compensation =
  | {
      kind: "fs.restore";
      path: string;
      previousContent: string | null; // null means "delete the file we created"
      previousMode?: number;
    }
  | { kind: "fs.unrename"; from: string; to: string }
  | {
      // Restores a list of files in the live repo to their pre-scaffold state.
      // Each entry's previousContent === null deletes the file (it didn't
      // exist before). Used by repo:scaffold and wire:* actions.
      kind: "repo.restore";
      files: Array<{ path: string; previousContent: string | null }>;
    }
  | { kind: "db.delete"; model: string; where: Record<string, unknown> }
  | {
      kind: "db.restore";
      model: string;
      where: Record<string, unknown>;
      previousData: Record<string, unknown>;
    }
  | { kind: "noop"; reason: string };

/** Write context: passed to action.apply(). */
export interface WriteCtx extends PlanCtx {
  workspacePath: string;
  /** Repo root used for repo:scaffold / wire:* in target=main. */
  repoRoot: string;
  logger: ActionLogger;
  signal: AbortSignal;
  secrets: SecretAccessor;
  dryRun: boolean;
}

export interface ActionResult<O> {
  output: O;
  /** Inverse to record on the task. */
  compensation?: Compensation;
}

export interface Action<I = unknown, O = unknown> {
  id: string;
  description: string;
  schema: ZodType<I>;
  capabilities: Capability[];
  irreversible?: boolean;
  /** Reports whether the target (post-input) already exists in a state matching this step's */
  match(input: I, ctx: ReadCtx): Promise<MatchResult>;
  /** Returns the typed mutations this step would apply. */
  diff(input: I, ctx: ReadCtx): Promise<Mutation[]>;
  /** Performs the mutations. */
  apply(input: I, ctx: WriteCtx): Promise<ActionResult<O>>;
}

/** Type-erased Action used by the registry and executor: TParams variance makes generic Actions */
export type AnyAction = Action<unknown, unknown>;
