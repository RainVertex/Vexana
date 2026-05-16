import type { Logger } from "../logger/logger";

export interface JobContext {
  log: Logger;
  signal: AbortSignal;
  cursor: unknown;
  setCursor: (next: unknown) => Promise<void>;
}

export type JobHandler = (ctx: JobContext) => Promise<void>;

export interface JobDefinition {
  name: string;
  schedule: string;
  timeoutMs?: number;
  handler: JobHandler;
}

export type JobTrigger = "schedule" | "manual" | "startup";
