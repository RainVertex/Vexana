import { prisma } from "@internal/db";

export async function listDepartmentsQuery() {
  const rows = await prisma.department.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { teams: true, memberships: true } } },
  });
  return rows.map((d) => ({
    id: d.id,
    slug: d.slug,
    name: d.name,
    teamCount: d._count.teams,
    memberCount: d._count.memberships,
  }));
}

export async function getDepartmentBySlug(slug: string) {
  const dept = await prisma.department.findFirst({
    where: { slug },
    include: {
      teams: {
        where: { deletedAt: null },
        select: { id: true, slug: true, name: true },
        orderBy: { name: "asc" },
      },
    },
  });
  if (!dept) return null;
  return {
    id: dept.id,
    slug: dept.slug,
    name: dept.name,
    teams: dept.teams,
  };
}
