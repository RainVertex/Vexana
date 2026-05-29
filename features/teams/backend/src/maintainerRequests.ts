import { Router } from "express";
import type { Request } from "express";
import { z } from "zod";
import { Prisma, prisma } from "@internal/db";
import { notify } from "@feature/notifications-backend";
import {
  MAINTAINER_REQUEST_INCLUDE,
  audit,
  isTeamManager,
  loadTeamBySlug,
  readGithubOrgLogin,
  requestExpiresAt,
  shapeMaintainerRequest,
  type MaintainerRequestRow,
} from "./helpers";
import { GithubMirrorError, addGithubTeamMaintainer } from "./mirror";

export const maintainerRequestsRouter: Router = Router();

const submitSchema = z.object({
  teamSlug: z.string().min(1),
  reason: z.string().max(1000).optional(),
});

// POST /, submit a maintainer request
maintainerRequestsRouter.post("/", async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const parsed = submitSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid body" });
      return;
    }

    const team = await loadTeamBySlug(parsed.data.teamSlug);
    if (!team) {
      res.status(404).json({ error: "Team not found" });
      return;
    }

    const myMembership = team.memberships.find((m) => m.userId === req.user!.id);
    if (!myMembership) {
      res.status(403).json({ error: "You must be a member of the team to request maintainership" });
      return;
    }
    if (myMembership.role === "lead") {
      res.status(409).json({ error: "You are already a maintainer of this team" });
      return;
    }

    try {
      const request = await prisma.$transaction(async (tx) => {
        const created = await tx.maintainerRequest.create({
          data: {
            teamId: team.id,
            requestedByUserId: req.user!.id,
            status: "pending",
            reason: parsed.data.reason ?? null,
            expiresAt: requestExpiresAt(),
          },
          include: MAINTAINER_REQUEST_INCLUDE,
        });
        await audit(
          tx,
          req,
          "team.maintainer_request.submitted",
          {
            requestId: created.id,
            teamId: team.id,
            teamSlug: team.slug,
            requestedByUserId: req.user!.id,
          },
          { kind: "maintainerRequest", id: created.id },
        );
        await fanoutMaintainerSubmitted(tx, created);
        return created;
      });
      res.status(201).json(shapeMaintainerRequest(request));
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        res
          .status(409)
          .json({ error: "You already have a pending maintainer request for this team" });
        return;
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

// GET /, list current user's own requests
maintainerRequestsRouter.get("/", async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const items = await prisma.maintainerRequest.findMany({
      where: { requestedByUserId: req.user.id },
      include: MAINTAINER_REQUEST_INCLUDE,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json({ items: items.map(shapeMaintainerRequest) });
  } catch (err) {
    next(err);
  }
});

// GET /pending-for-me, approver inbox: rows the actor can act on
maintainerRequestsRouter.get("/pending-for-me", async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const isAdmin = req.user.role === "admin";
    // Admins see every pending row. non-admins only see rows for teams where
    // they're currently a lead. The requester's own rows are always excluded
    // a user can never approve their own promotion.
    const where: Prisma.MaintainerRequestWhereInput = isAdmin
      ? {
          status: "pending",
          requestedByUserId: { not: req.user.id },
        }
      : {
          status: "pending",
          requestedByUserId: { not: req.user.id },
          team: {
            memberships: {
              some: { userId: req.user.id, role: "lead" },
            },
          },
        };
    const items = await prisma.maintainerRequest.findMany({
      where,
      include: MAINTAINER_REQUEST_INCLUDE,
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    res.json({ items: items.map(shapeMaintainerRequest) });
  } catch (err) {
    next(err);
  }
});

// GET /for-me-as-approver, approver-side history *and* pending
// Same access predicate as /pending-for-me, but returns all statuses. resolved
// rows are scoped to ones I personally reviewed (reviewedByUserId = me) so I
// see my own approval history rather than every team's.
maintainerRequestsRouter.get("/for-me-as-approver", async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const isAdmin = req.user.role === "admin";
    const myId = req.user.id;
    // Pending rows: every pending one for an admin. for leads, only those on
    // teams I currently lead. History rows: only ones I reviewed myself.
    // Either condition qualifies, never my own request as requester.
    const pendingScope: Prisma.MaintainerRequestWhereInput = isAdmin
      ? { status: "pending" }
      : {
          status: "pending",
          team: {
            memberships: { some: { userId: myId, role: "lead" } },
          },
        };
    const items = await prisma.maintainerRequest.findMany({
      where: {
        requestedByUserId: { not: myId },
        OR: [pendingScope, { reviewedByUserId: myId }],
      },
      include: MAINTAINER_REQUEST_INCLUDE,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200,
    });
    res.json({ items: items.map(shapeMaintainerRequest) });
  } catch (err) {
    next(err);
  }
});

// GET /:id, single request (requester, admin, or any lead of the team)
maintainerRequestsRouter.get("/:id", async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const request = await prisma.maintainerRequest.findUnique({
      where: { id: req.params.id },
      include: MAINTAINER_REQUEST_INCLUDE,
    });
    if (!request) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    const isRequester = request.requestedByUserId === req.user.id;
    if (!isRequester && !(await isTeamManager(req, request.teamId))) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    res.json(shapeMaintainerRequest(request));
  } catch (err) {
    next(err);
  }
});

// POST /:id/approve, admin OR any current lead of the team
maintainerRequestsRouter.post("/:id/approve", async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const existing = await prisma.maintainerRequest.findUnique({
      where: { id: req.params.id },
      include: MAINTAINER_REQUEST_INCLUDE,
    });
    if (!existing) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    if (existing.status !== "pending") {
      res.status(409).json({ error: `Request is ${existing.status}` });
      return;
    }
    if (!(await isTeamManager(req, existing.teamId))) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (existing.requestedByUserId === req.user.id) {
      // Belt-and-braces: prevent self-approval if the requester somehow
      // became a lead between submit and approve.
      res.status(403).json({ error: "Cannot approve your own request" });
      return;
    }

    const reviewerUserId = req.user.id;
    const updated = await prisma.$transaction(async (tx) => {
      // Re-check status under the row lock to avoid a double-approve race.
      const fresh = await tx.maintainerRequest.findUnique({
        where: { id: existing.id },
        select: { status: true },
      });
      if (!fresh || fresh.status !== "pending") {
        throw new RaceError(fresh?.status ?? "missing");
      }
      await tx.teamMembership.upsert({
        where: {
          teamId_userId: { teamId: existing.teamId, userId: existing.requestedByUserId },
        },
        create: {
          teamId: existing.teamId,
          userId: existing.requestedByUserId,
          role: "lead",
        },
        update: { role: "lead" },
      });
      const next = await tx.maintainerRequest.update({
        where: { id: existing.id },
        data: {
          status: "approved",
          reviewedByUserId: reviewerUserId,
          reviewedAt: new Date(),
        },
        include: MAINTAINER_REQUEST_INCLUDE,
      });
      await audit(
        tx,
        req,
        "team.maintainer_request.approved",
        {
          requestId: existing.id,
          teamId: existing.teamId,
          requestedByUserId: existing.requestedByUserId,
          reviewedByUserId: reviewerUserId,
        },
        { kind: "maintainerRequest", id: existing.id },
      );
      await audit(
        tx,
        req,
        "team.member.role_changed",
        {
          teamId: existing.teamId,
          userId: existing.requestedByUserId,
          before: "member",
          after: "lead",
          viaMaintainerRequestId: existing.id,
        },
        { kind: "team", id: existing.teamId },
      );
      await notify(tx, {
        recipientUserId: existing.requestedByUserId,
        kind: "team.maintainer_request.approved",
        payload: {
          requestId: existing.id,
          teamId: existing.teamId,
          teamSlug: existing.team.slug,
          reviewedByUserId: reviewerUserId,
          reviewedByDisplayName: req.user!.displayName,
        },
        teamId: existing.teamId,
      });
      return next;
    });

    // Best-effort GitHub mirror after the platform write commits. Unlike team
    // creation, the artifact here is the membership row that already exists.
    // the periodic GitHub reconciler will eventually converge if this fails
    // so we audit the failure and keep the approval.
    if (
      updated.team.source === "github" &&
      updated.team.installationId &&
      updated.team.externalSlug
    ) {
      await mirrorMaintainerToGithub(req, updated);
    }

    res.json(shapeMaintainerRequest(updated));
  } catch (err) {
    if (err instanceof RaceError) {
      res.status(409).json({ error: `Request is ${err.observedStatus}` });
      return;
    }
    next(err);
  }
});

// POST /:id/reject, same auth as approve, requires a reason
const rejectSchema = z.object({ reason: z.string().min(1).max(1000) });

maintainerRequestsRouter.post("/:id/reject", async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const parsed = rejectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid body" });
      return;
    }
    const existing = await prisma.maintainerRequest.findUnique({
      where: { id: req.params.id },
      include: MAINTAINER_REQUEST_INCLUDE,
    });
    if (!existing) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    if (existing.status !== "pending") {
      res.status(409).json({ error: `Request is ${existing.status}` });
      return;
    }
    if (!(await isTeamManager(req, existing.teamId))) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (existing.requestedByUserId === req.user.id) {
      res.status(403).json({ error: "Cannot reject your own request" });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.maintainerRequest.update({
        where: { id: existing.id },
        data: {
          status: "rejected",
          reviewedByUserId: req.user!.id,
          reviewedAt: new Date(),
          rejectionReason: parsed.data.reason,
        },
        include: MAINTAINER_REQUEST_INCLUDE,
      });
      await audit(
        tx,
        req,
        "team.maintainer_request.rejected",
        {
          requestId: existing.id,
          teamId: existing.teamId,
          reviewedByUserId: req.user!.id,
          reason: parsed.data.reason,
        },
        { kind: "maintainerRequest", id: existing.id },
      );
      await notify(tx, {
        recipientUserId: existing.requestedByUserId,
        kind: "team.maintainer_request.rejected",
        payload: {
          requestId: existing.id,
          teamId: existing.teamId,
          teamSlug: existing.team.slug,
          reason: parsed.data.reason,
          reviewedByDisplayName: req.user!.displayName,
        },
        teamId: existing.teamId,
      });
      return next;
    });
    res.json(shapeMaintainerRequest(updated));
  } catch (err) {
    next(err);
  }
});

// POST /:id/cancel, requester only
maintainerRequestsRouter.post("/:id/cancel", async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const existing = await prisma.maintainerRequest.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    if (existing.requestedByUserId !== req.user.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (existing.status !== "pending") {
      res.status(409).json({ error: `Request is ${existing.status}` });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.maintainerRequest.update({
        where: { id: existing.id },
        data: { status: "cancelled", reviewedAt: new Date() },
        include: MAINTAINER_REQUEST_INCLUDE,
      });
      await audit(
        tx,
        req,
        "team.maintainer_request.cancelled",
        {
          requestId: existing.id,
          teamId: existing.teamId,
          requestedByUserId: existing.requestedByUserId,
        },
        { kind: "maintainerRequest", id: existing.id },
      );
      return next;
    });
    res.json(shapeMaintainerRequest(updated));
  } catch (err) {
    next(err);
  }
});

// Helpers

class RaceError extends Error {
  constructor(public readonly observedStatus: string) {
    super(`Request is ${observedStatus}`);
    this.name = "RaceError";
  }
}

/** Notify everyone authorized to approve: site admins + every current lead of the target team. */
async function fanoutMaintainerSubmitted(
  tx: Prisma.TransactionClient,
  request: MaintainerRequestRow,
): Promise<void> {
  const admins = await tx.user.findMany({
    where: { role: "admin" },
    select: { id: true },
  });
  const leads = await tx.teamMembership.findMany({
    where: { teamId: request.teamId, role: "lead" },
    select: { userId: true },
  });

  const recipients = new Set<string>();
  for (const a of admins) recipients.add(a.id);
  for (const l of leads) recipients.add(l.userId);
  recipients.delete(request.requestedByUserId);

  for (const userId of recipients) {
    await notify(tx, {
      recipientUserId: userId,
      kind: "team.maintainer_request.submitted",
      payload: {
        requestId: request.id,
        teamId: request.teamId,
        teamSlug: request.team.slug,
        teamName: request.team.name,
        requestedByUserId: request.requestedByUserId,
        requestedByDisplayName: request.requestedBy.displayName,
        reason: request.reason,
      },
      teamId: request.teamId,
    });
  }
}

async function mirrorMaintainerToGithub(
  req: Request,
  request: MaintainerRequestRow,
): Promise<void> {
  if (
    request.team.source !== "github" ||
    request.team.installationId == null ||
    !request.team.externalSlug
  ) {
    return;
  }
  // installationId lives in Integration.config (Json) so we can't filter
  // declaratively, scan enabled github rows and match in JS. Same pattern
  // used by github-sync/bulk-sync.ts:stampSyncedAt.
  const candidates = await prisma.integration.findMany({
    where: { kind: "github", enabled: true },
  });
  const integration =
    candidates.find((row) => {
      const cfg =
        row.config && typeof row.config === "object" && !Array.isArray(row.config)
          ? (row.config as Record<string, unknown>)
          : null;
      return cfg?.installationId === request.team.installationId;
    }) ?? null;
  const orgLogin = readGithubOrgLogin(integration);
  const githubLogin = request.requestedBy.githubLogin;
  if (!orgLogin || !githubLogin) {
    await prisma.auditEvent.create({
      data: {
        actorUserId: req.user?.id ?? null,
        kind: "team.maintainer_request.github_mirror_skipped",
        targetKind: "maintainerRequest",
        targetId: request.id,
        payload: {
          reason: !orgLogin ? "missing_org_login" : "missing_github_login",
          requestedByUserId: request.requestedByUserId,
        } as Prisma.InputJsonValue,
      },
    });
    return;
  }
  try {
    await addGithubTeamMaintainer({
      installationId: request.team.installationId,
      orgLogin,
      githubSlug: request.team.externalSlug,
      githubLogin,
    });
  } catch (err) {
    const message =
      err instanceof GithubMirrorError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Unknown error";
    await prisma.auditEvent.create({
      data: {
        actorUserId: req.user?.id ?? null,
        kind: "team.maintainer_request.github_mirror_failed",
        targetKind: "maintainerRequest",
        targetId: request.id,
        payload: {
          error: message,
          githubSlug: request.team.externalSlug,
          githubLogin,
        } as Prisma.InputJsonValue,
      },
    });
  }
}
