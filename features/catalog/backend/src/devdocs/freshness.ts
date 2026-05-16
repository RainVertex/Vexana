import type { DocFreshness } from "@internal/shared-types";

const DAY_MS = 24 * 60 * 60 * 1000;

const FRESH_MAX_DAYS = 30;
const STALE_MIN_DAYS = 90;
const VERIFIED_OVERRIDE_DAYS = 60;

export interface FreshnessInput {
  lastCommitAt: Date | null;
  verifiedAt: Date | null;
}

export function computeFreshness(input: FreshnessInput, now: Date = new Date()): DocFreshness {
  if (!input.lastCommitAt) return "unknown";
  const ageDays = (now.getTime() - input.lastCommitAt.getTime()) / DAY_MS;
  if (ageDays <= FRESH_MAX_DAYS) return "fresh";

  if (input.verifiedAt) {
    const verifiedAgeDays = (now.getTime() - input.verifiedAt.getTime()) / DAY_MS;
    if (verifiedAgeDays <= VERIFIED_OVERRIDE_DAYS) return "fresh";
  }

  if (ageDays >= STALE_MIN_DAYS) return "stale";
  return "aging";
}
