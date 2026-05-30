import type { Prisma } from "@internal/db";

const DEFAULT_BUCKETS: Array<{ title: string; position: number }> = [
  { title: "To-Do", position: 0 },
  { title: "In Progress", position: 1 },
  { title: "Done", position: 2 },
];

export async function createDefaultBuckets(
  tx: Prisma.TransactionClient,
  projectId: string,
): Promise<void> {
  await tx.bucket.createMany({
    data: DEFAULT_BUCKETS.map((b) => ({ ...b, projectId })),
  });
}
