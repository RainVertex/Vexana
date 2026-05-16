// Cron sweep for pipeline visibility. Backfills new entities and reconciles
// anything the webhook path missed (downtime, dropped events, retries).
// Per-entity progress lives in PipelineSyncCursor rows so this job stays
// stateless — JobState.cursor is unused.

import type { CatalogJobDefinition } from "../jobs";
import { syncAllPipelines } from "./sync";

export function pipelinesSyncJob(): CatalogJobDefinition {
  return {
    name: "catalog.pipelinesSync",
    schedule: "*/15 * * * *",
    timeoutMs: 10 * 60 * 1000,
    handler: async ({ log }) => {
      const result = await syncAllPipelines();
      log.info(result, "Pipelines sync sweep complete");
    },
  };
}
