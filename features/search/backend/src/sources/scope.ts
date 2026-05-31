import { prisma } from "@internal/db";

// Org logins the user belongs to; org-scoped sources (catalog, teams, devdocs) filter by these.
export async function userOrgLogins(userId: string): Promise<string[]> {
  const rows = await prisma.userOrgMembership.findMany({
    where: { userId },
    select: { accountLogin: true },
  });
  return rows.map((m) => m.accountLogin);
}

// Project ids the user is a member of; projects and tasks are scoped by these.
export async function memberProjectIds(userId: string): Promise<string[]> {
  const rows = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  });
  return rows.map((m) => m.projectId);
}
