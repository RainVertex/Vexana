// Refreshes LlmModel.costPer1k* from OpenRouter's public pricing list so rates are not hand-maintained.
// Each model carries an openrouterId (the canonical slug); models without one keep their stored price.
import { agentDb, Prisma } from "@internal/db";

const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
const DATE_SUFFIX = /-\d{8}$/;

interface OpenRouterModel {
  id: string;
  pricing?: { prompt?: string; completion?: string };
}

export interface PricingSyncResult {
  total: number;
  updated: number;
  unmatched: string[];
}

// OpenRouter quotes per-token; the column stores USD per 1k tokens. Exact decimal math avoids float drift.
function perTokenToPer1k(perToken: string | undefined): Prisma.Decimal | null {
  if (perToken == null) return null;
  try {
    const d = new Prisma.Decimal(perToken);
    if (d.isNegative()) return null;
    return d.mul(1000).toDecimalPlaces(6);
  } catch {
    return null;
  }
}

export async function syncModelPricing(
  opts: { signal?: AbortSignal } = {},
): Promise<PricingSyncResult> {
  const res = await fetch(OPENROUTER_MODELS_URL, { signal: opts.signal });
  if (!res.ok) {
    throw new Error(`OpenRouter pricing fetch failed: ${res.status} ${res.statusText}`);
  }
  const body = (await res.json()) as { data?: OpenRouterModel[] };
  const rows = Array.isArray(body.data) ? body.data : [];

  // Exact-id lookup, plus a base index (id minus trailing -YYYYMMDD) so dated snapshots resolve too.
  const byId = new Map<string, OpenRouterModel>();
  const byBase = new Map<string, OpenRouterModel[]>();
  for (const r of rows) {
    if (!r?.id) continue;
    byId.set(r.id, r);
    const base = r.id.replace(DATE_SUFFIX, "");
    if (base !== r.id) {
      const list = byBase.get(base) ?? [];
      list.push(r);
      byBase.set(base, list);
    }
  }

  const models = await agentDb.llmModel.findMany({
    where: { openrouterId: { not: null } },
    select: { id: true, slug: true, openrouterId: true },
  });

  let updated = 0;
  const unmatched: string[] = [];
  for (const m of models) {
    const ref = m.openrouterId as string;
    let match = byId.get(ref);
    if (!match) {
      const dated = byBase.get(ref);
      // Newest dated variant, chosen deterministically by descending id (date sorts lexicographically).
      if (dated && dated.length > 0) {
        match = [...dated].sort((a, b) => (a.id < b.id ? 1 : -1))[0];
      }
    }
    const inPer1k = perTokenToPer1k(match?.pricing?.prompt);
    const outPer1k = perTokenToPer1k(match?.pricing?.completion);
    if (!inPer1k || !outPer1k) {
      unmatched.push(m.slug);
      continue;
    }
    await agentDb.llmModel.update({
      where: { id: m.id },
      data: { costPer1kIn: inPer1k, costPer1kOut: outPer1k },
    });
    updated++;
  }

  return { total: models.length, updated, unmatched };
}
