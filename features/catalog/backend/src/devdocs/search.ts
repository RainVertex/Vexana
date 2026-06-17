// Full-text DevDocs search over DocPage via Postgres tsvector/ts_rank.
import { Prisma, prisma } from "@internal/db";
import type { DocSearchHit } from "@feature/devdocs-shared";
import type { SearchHit } from "@feature/search-shared";

export interface DevDocsSearchOpts {
  entityId?: string;
  limit?: number;
  // When provided, restrict hits to entities in these org logins. An empty list yields zero rows.
  accountLogins?: string[];
}

interface RawHit {
  pageId: string;
  entityId: string;
  entityName: string;
  slug: string;
  title: string;
  snippet: string;
  rank: number;
}

export async function getDevDocsHits(
  query: string,
  opts: DevDocsSearchOpts = {},
): Promise<DocSearchHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  if (opts.accountLogins && opts.accountLogins.length === 0) return [];

  const limit = Math.min(Math.max(opts.limit ?? 10, 1), 50);

  // Strip ts_headline markers so the API stays tag-free; UI highlights client-side.
  const tsQuery = Prisma.sql`plainto_tsquery('english', ${trimmed})`;
  const conditions: Prisma.Sql[] = [Prisma.sql`p."searchVector" @@ ${tsQuery}`];
  if (opts.entityId) conditions.push(Prisma.sql`p."entityId" = ${opts.entityId}`);
  if (opts.accountLogins && opts.accountLogins.length > 0) {
    conditions.push(Prisma.sql`e."accountLogin" IN (${Prisma.join(opts.accountLogins)})`);
  }
  const where = Prisma.join(conditions, " AND ");

  const rows = await prisma.$queryRaw<RawHit[]>(Prisma.sql`
    SELECT p."id"        AS "pageId",
           p."entityId"  AS "entityId",
           e."name"      AS "entityName",
           p."slug"      AS "slug",
           p."title"     AS "title",
           ts_headline('english', p."body", ${tsQuery},
                       'StartSel=<<,StopSel=>>,MaxFragments=1,MaxWords=20,MinWords=8') AS "snippet",
           ts_rank(p."searchVector", ${tsQuery}) AS "rank"
    FROM "DocPage" p
    JOIN "CatalogEntity" e ON e."id" = p."entityId"
    WHERE ${where}
    ORDER BY "rank" DESC, p."lastCommitAt" DESC NULLS LAST
    LIMIT ${limit}
  `);

  return rows.map((r) => ({
    pageId: r.pageId,
    entityId: r.entityId,
    entityName: r.entityName,
    slug: r.slug,
    title: r.title,
    snippet: stripHeadlineMarkers(r.snippet),
    rank: Number(r.rank),
  }));
}

function stripHeadlineMarkers(s: string | null): string {
  if (!s) return "";
  return s.replace(/<<|>>/g, "");
}

/** Adapter for the global search router: maps DocSearchHit to SearchHit. */
export async function getDevDocsSearchHits(
  query: string,
  limit = 10,
  opts: { accountLogins?: string[] } = {},
): Promise<SearchHit[]> {
  const hits = await getDevDocsHits(query, { limit, accountLogins: opts.accountLogins });
  return hits.map((h) => ({
    id: h.pageId,
    kind: "devdoc" as const,
    title: `${h.entityName} / ${h.title}`,
    snippet: h.snippet,
    href: `/catalog/${h.entityId}/docs?p=${encodeURIComponent(h.slug)}`,
  }));
}
