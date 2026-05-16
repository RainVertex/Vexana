import { evaluateAllScorecards } from "./scorecards/evaluator";
import { syncAllDevDocs } from "./devdocs/sync";
import { pipelinesSyncJob } from "./pipelines/jobs";

export interface CatalogJobLogger {
  info(o: unknown, msg?: string): void;
  error?(o: unknown, msg?: string): void;
}

export interface CatalogJobContext {
  log: CatalogJobLogger;
  signal: AbortSignal;
}

export interface CatalogJobDefinition {
  name: string;
  schedule: string;
  timeoutMs?: number;
  handler: (ctx: CatalogJobContext) => Promise<void>;
}

export function scorecardEvaluatorJob(): CatalogJobDefinition {
  return {
    name: "catalog.scorecardEvaluator",
    schedule: "0 */6 * * *",
    timeoutMs: 5 * 60 * 1000,
    handler: async ({ log }) => {
      const result = await evaluateAllScorecards();
      log.info(result, "Scorecard evaluation sweep complete");
    },
  };
}

export function devdocsSyncJob(): CatalogJobDefinition {
  return {
    name: "catalog.devdocsSync",
    schedule: "0 */2 * * *",
    timeoutMs: 5 * 60 * 1000,
    handler: async ({ log }) => {
      const result = await syncAllDevDocs();
      log.info(result, "DevDocs sync sweep complete");
    },
  };
}

export function getCatalogJobs(): CatalogJobDefinition[] {
  return [scorecardEvaluatorJob(), devdocsSyncJob(), pipelinesSyncJob()];
}
