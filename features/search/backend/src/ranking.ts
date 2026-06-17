import type { SearchHit } from "@feature/search-shared";

// Exact title match ranks highest, then prefix, then substring; a body-only match ranks below any title match.
export function scoreHit(query: string, title: string, body?: string): number {
  const q = query.toLowerCase().trim();
  const t = title.toLowerCase();
  let score = 0;
  if (t === q) score = 100;
  else if (t.startsWith(q)) score = 70;
  else if (t.includes(q)) score = 40;
  else if (body && body.toLowerCase().includes(q)) score = 15;
  // Tighter (shorter) titles edge ahead within the same tier.
  return score + Math.max(0, 10 - title.length / 20);
}

// Sources already filter to genuine matches, so this orders rather than drops.
export function rankHits(query: string, hits: SearchHit[]): SearchHit[] {
  return hits
    .map((h) => ({ ...h, score: scoreHit(query, h.title, h.snippet) }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}
