// Seeded agents are referenced by FK and the enrichment cron, so they cannot be deleted.
export const PROTECTED_AGENT_IDS = new Set(["seed-agent-assistant", "seed-agent-catalog-enricher"]);

// The Platform Assistant's tool set is computed live in streamAgent (read groups + env-gated chat writes), so its persisted toolIds are display-only. Edits to them are ignored and the form renders them read-only.
export const PLATFORM_ASSISTANT_AGENT_ID = "seed-agent-assistant";
