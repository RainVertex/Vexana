import type { Prisma } from "@prisma/client";
import { notify } from "@feature/notifications-backend";

type Tx = Prisma.TransactionClient;

export async function resolvePlaneAssignees(
  tx: Tx,
  workspaceId: string,
  externalIds: string[],
): Promise<Map<string, string>> {
  if (externalIds.length === 0) return new Map();
  const members = await tx.planeMember.findMany({
    where: { workspaceId, externalId: { in: externalIds } },
    select: { id: true, externalId: true },
  });
  if (members.length === 0) return new Map();
  const mappings = await tx.planeUserMapping.findMany({
    where: { planeMemberId: { in: members.map((m) => m.id) } },
    select: { planeMemberId: true, platformUserId: true },
  });
  const memberToPlatform = new Map(mappings.map((m) => [m.planeMemberId, m.platformUserId]));
  const out = new Map<string, string>();
  for (const m of members) {
    const userId = memberToPlatform.get(m.id);
    if (userId) out.set(m.externalId, userId);
  }
  return out;
}

export function buildPlaneWorkItemUrl(
  config: Prisma.JsonValue,
  projectExternalId: string,
  workItemExternalId: string,
): string | null {
  if (!config || typeof config !== "object" || Array.isArray(config)) return null;
  const c = config as Record<string, unknown>;
  const host = typeof c.webUrl === "string" ? c.webUrl : c.baseUrl;
  if (typeof host !== "string" || typeof c.workspaceSlug !== "string") return null;
  return `${host.replace(/\/+$/, "")}/${c.workspaceSlug}/projects/${projectExternalId}/issues/${workItemExternalId}`;
}

export interface PlaneWorkItemRef {
  localId: string;
  externalId: string;
  sequenceId: number;
  name: string;
}

export interface PlaneProjectRef {
  externalId: string;
  identifier: string;
  name: string;
}

export async function notifyPlaneAssigned(
  tx: Tx,
  args: {
    platformUserIds: string[];
    workItem: PlaneWorkItemRef;
    project: PlaneProjectRef;
    planeUrl: string | null;
  },
): Promise<void> {
  for (const platformUserId of args.platformUserIds) {
    await notify(tx, {
      recipientUserId: platformUserId,
      kind: "plane.work_item.assigned",
      payload: {
        workItemId: args.workItem.localId,
        workItemExternalId: args.workItem.externalId,
        sequenceId: args.workItem.sequenceId,
        workItemName: args.workItem.name,
        projectIdentifier: args.project.identifier,
        projectName: args.project.name,
        planeUrl: args.planeUrl,
      },
    });
  }
}

export async function notifyPlaneCommentPosted(
  tx: Tx,
  args: {
    platformUserIds: string[];
    workItem: PlaneWorkItemRef;
    project: PlaneProjectRef;
    authorDisplayName: string | null;
    bodyExcerpt: string;
    planeUrl: string | null;
  },
): Promise<void> {
  for (const platformUserId of args.platformUserIds) {
    await notify(tx, {
      recipientUserId: platformUserId,
      kind: "plane.comment.posted",
      payload: {
        workItemId: args.workItem.localId,
        workItemExternalId: args.workItem.externalId,
        sequenceId: args.workItem.sequenceId,
        workItemName: args.workItem.name,
        projectIdentifier: args.project.identifier,
        projectName: args.project.name,
        authorDisplayName: args.authorDisplayName,
        bodyExcerpt: args.bodyExcerpt,
        planeUrl: args.planeUrl,
      },
    });
  }
}
