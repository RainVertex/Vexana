import { Prisma, prisma } from "@internal/db";
import type { SearchHit } from "@internal/shared-types";
import type { SearchSource } from "./types";
import { userOrgLogins } from "./scope";

export const teams: SearchSource = async (query, ctx, limit) => {
  const where: Prisma.TeamWhereInput = {
    deletedAt: null,
    OR: [
      { name: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
    ],
  };

  if (!ctx.isAdmin) {
    const logins = await userOrgLogins(ctx.userId);
    if (logins.length === 0) return [];
    where.accountLogin = { in: logins };
  }

  const rows = await prisma.team.findMany({
    where,
    take: limit,
    select: { id: true, slug: true, name: true, description: true },
  });

  return rows.map(
    (t): SearchHit => ({
      id: t.id,
      kind: "team",
      title: t.name,
      snippet: t.description ?? undefined,
      href: `/teams/${t.slug}`,
    }),
  );
};
