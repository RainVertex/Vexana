// Mirror of the apps/api JobDefinition shape. Features can't import from
// apps/api (boundary rule), so each feature redeclares the structural type it
// needs from JobContext — see features/catalog/backend/src/jobs.ts for the
// same pattern. Logger surface matches what the scrape job actually calls.

export interface ObservabilityJobLogger {
  info(o: unknown, msg?: string): void;
  error?(o: unknown, msg?: string): void;
}

export interface ObservabilityJobContext {
  log: ObservabilityJobLogger;
  signal: AbortSignal;
}

export interface ObservabilityJobDefinition {
  name: string;
  schedule: string;
  timeoutMs?: number;
  handler: (ctx: ObservabilityJobContext) => Promise<void>;
}
