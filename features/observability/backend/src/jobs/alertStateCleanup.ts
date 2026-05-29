// Daily cleanup of stale AlertDeliveryState rows so the dedup table doesn't
// grow unbounded. A row is "stale" once both the firing and resolved
// timestamps (if any) are older than the cutoff, OR if both are null and the
// row hasn't been touched since the cutoff. Prisma's `{ lt: cutoff }` against
// a nullable column excludes NULL values, so we have to spell out the
// firing-only-never-resolved branch explicitly, that branch is the
// load-bearing fix: an attacker who can hit the webhook with unique
// fingerprints would otherwise grow the table without bound.

import { prisma } from "@internal/db";
import type { ObservabilityJobDefinition } from "./types";

const STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

export function alertStateCleanupJob(): ObservabilityJobDefinition {
  return {
    name: "observability.alert-state-cleanup",
    schedule: "0 3 * * *",
    timeoutMs: 60_000,
    handler: async ({ log }) => {
      const cutoff = new Date(Date.now() - STALE_AFTER_MS);
      const result = await prisma.alertDeliveryState.deleteMany({
        where: {
          OR: [
            // Resolved and quiet for the whole window.
            {
              AND: [
                { lastResolvedAt: { lt: cutoff } },
                { OR: [{ lastFiringAt: null }, { lastFiringAt: { lt: cutoff } }] },
              ],
            },
            // Firing-only fingerprint that hasn't been seen in a window, usually
            // garbage from a flapper or an attacker varying fingerprints.
            { AND: [{ lastResolvedAt: null }, { lastFiringAt: { lt: cutoff } }] },
            // Both nulls: shouldn't happen after a normal upsert flow, but if a
            // row got into that state, updatedAt is the only signal we have.
            {
              AND: [
                { lastResolvedAt: null },
                { lastFiringAt: null },
                { updatedAt: { lt: cutoff } },
              ],
            },
          ],
        },
      });
      log.info({ deleted: result.count, cutoff: cutoff.toISOString() }, "Alert state cleanup");
    },
  };
}
