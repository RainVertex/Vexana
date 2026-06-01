import { prisma } from "@internal/db";

export async function listUnread(userId: string) {
  const rows = await prisma.notification.findMany({
    where: { recipientUserId: userId, readAt: null },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return rows.map((n) => ({
    id: n.id,
    kind: n.kind,
    payload: n.payload,
    createdAt: n.createdAt.toISOString(),
  }));
}
