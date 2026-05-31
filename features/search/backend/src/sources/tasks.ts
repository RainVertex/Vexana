import { prisma } from "@internal/db";
import type { SearchHit } from "@internal/shared-types";
import type { SearchSource } from "./types";
import { memberProjectIds } from "./scope";

export const tasks: SearchSource = async (query, ctx, limit) => {
  const projectIds = await memberProjectIds(ctx.userId);
  if (projectIds.length === 0) return [];

  const rows = await prisma.task.findMany({
    where: {
      projectId: { in: projectIds },
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ],
    },
    take: limit,
    select: { id: true, title: true, description: true },
  });

  return rows.map(
    (t): SearchHit => ({
      id: t.id,
      kind: "task",
      title: t.title,
      snippet: t.description ?? undefined,
      href: `/tasks/${t.id}`,
    }),
  );
};
