// Seeded agents are referenced by FK, the enrichment cron, and the task assignee flow, so they cannot be deleted.
export const PROTECTED_AGENT_IDS = new Set([
  "platform-assistant",
  "catalog-enricher",
  "task-planner",
]);
