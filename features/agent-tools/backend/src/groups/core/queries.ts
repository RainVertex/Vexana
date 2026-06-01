import { prisma } from "@internal/db";

export async function getUserIdentity(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      displayName: true,
      email: true,
      role: true,
      memberships: {
        where: { team: { deletedAt: null } },
        select: {
          role: true,
          team: { select: { id: true, slug: true, name: true } },
        },
      },
      departmentMemberships: {
        select: {
          role: true,
          department: { select: { id: true, slug: true, name: true } },
        },
      },
    },
  });
  if (!user) return null;
  return {
    userId: user.id,
    displayName: user.displayName,
    email: user.email,
    role: user.role,
    teams: user.memberships.map((m) => ({
      id: m.team.id,
      slug: m.team.slug,
      name: m.team.name,
      role: m.role,
    })),
    departments: user.departmentMemberships.map((m) => ({
      id: m.department.id,
      slug: m.department.slug,
      name: m.department.name,
      role: m.role,
    })),
  };
}
