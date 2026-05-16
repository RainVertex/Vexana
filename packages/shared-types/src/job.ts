import type { ID, ISODateString } from "./common";

export type JobRunStatus = "running" | "succeeded" | "failed" | "cancelled";

export interface JobRunSummary {
  id: ID;
  triggeredBy: string;
  startedAt: ISODateString;
  finishedAt: ISODateString | null;
  status: JobRunStatus;
  durationMs: number | null;
  error: string | null;
}

export interface JobSummary {
  name: string;
  schedule: string;
  timeoutMs: number;
  enabled: boolean;
  lastRunAt: ISODateString | null;
  lastSuccessAt: ISODateString | null;
  lastError: string | null;
  recentRuns: JobRunSummary[];
}
