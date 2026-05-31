import { Prisma, prisma } from "@internal/db";
import type { SearchHit } from "@internal/shared-types";
import type { SearchSource } from "./types";
import { userOrgLogins } from "./scope";

export const catalog: SearchSource = async (query, ctx, limit) => {
  const textMatch: Prisma.CatalogEntityWhereInput = {
    OR: [
      { name: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
    ],
  };

  let where: Prisma.CatalogEntityWhereInput = textMatch;
  if (!ctx.isAdmin) {
    const logins = await userOrgLogins(ctx.userId);
    if (logins.length === 0) return [];
    where = { AND: [textMatch, { accountLogin: { in: logins } }] };
  }

  const rows = await prisma.catalogEntity.findMany({
    where,
    take: limit,
    select: { id: true, name: true, description: true },
  });

  return rows.map(
    (e): SearchHit => ({
      id: e.id,
      kind: "catalog",
      title: e.name,
      snippet: e.description ?? undefined,
      href: `/catalog/${e.id}`,
    }),
  );
};
