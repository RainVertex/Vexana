// REST surface for the Pipelines tab. Mounted under /api/catalog/:id/* by
// catalogRouter so paths are entity-scoped and inherit the surrounding entity-
// visibility checks (guests need a GuestGrant, same as for /audit).

import { Router, type Request, type Response } from "express";
import { prisma } from "@internal/db";
import type {
  WorkflowRunRow,
  WorkflowRunConclusion,
  WorkflowRunStatus,
  DeploymentRow,
  DeploymentState,
} from "@internal/shared-types";
import { syncEntityPipelines } from "./sync";

export const pipelinesRouter: Router = Router({ mergeParams: true });

// ---------------------------------------------------------------------------
// Auth helpers — mirror the pattern in ../index.ts. Reads require any
// authenticated user with view access (guests need an explicit GuestGrant on
// this entity). Manual refresh requires admin or member.
// ---------------------------------------------------------------------------

async function hasViewAccess(req: Request, entityId: string): Promise<boolean> {
  if (!req.user) return false;
  if (req.user.role !== "guest") return true;
  const grant = await prisma.guestGrant.findFirst({
    where: {
      granteeId: req.user.id,
      resourceType: "catalog_entity",
      resourceId: entityId,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });
  return grant !== null;
}

async function ensureEntity(req: Request, res: Response): Promise<string | null> {
  const id = String(req.params.id ?? "");
  if (!id) {
    res.status(400).json({ error: "Entity id required" });
    return null;
  }
  const exists = await prisma.catalogEntity.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists) {
    res.status(404).json({ error: "Catalog entity not found" });
    return null;
  }
  if (!(await hasViewAccess(req, id))) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return id;
}

// ---------------------------------------------------------------------------
// GET /:id/pipeline-runs?limit=&branch=
// ---------------------------------------------------------------------------

pipelinesRouter.get("/:id/pipeline-runs", async (req, res) => {
  const entityId = await ensureEntity(req, res);
  if (!entityId) return;

  const limit = Math.min(Number(req.query.limit ?? 50) || 50, 200);
  const branch = typeof req.query.branch === "string" ? req.query.branch : undefined;

  const rows = await prisma.workflowRun.findMany({
    where: { entityId, ...(branch ? { headBranch: branch } : {}) },
    orderBy: { runUpdatedAt: "desc" },
    take: limit,
  });

  const items: WorkflowRunRow[] = rows.map((r) => ({
    id: r.id,
    workflowName: r.workflowName,
    workflowPath: r.workflowPath,
    runNumber: r.runNumber,
    event: r.event,
    status: r.status as WorkflowRunStatus,
    conclusion: r.conclusion as WorkflowRunConclusion | null,
    headBranch: r.headBranch,
    headSha: r.headSha,
    actorLogin: r.actorLogin,
    htmlUrl: r.htmlUrl,
    runStartedAt: r.runStartedAt ? r.runStartedAt.toISOString() : null,
    runUpdatedAt: r.runUpdatedAt ? r.runUpdatedAt.toISOString() : null,
  }));
  res.json({ items });
});

// ---------------------------------------------------------------------------
// GET /:id/deployments?limit=&environment=
// ---------------------------------------------------------------------------

pipelinesRouter.get("/:id/deployments", async (req, res) => {
  const entityId = await ensureEntity(req, res);
  if (!entityId) return;

  const limit = Math.min(Number(req.query.limit ?? 50) || 50, 200);
  const environment = typeof req.query.environment === "string" ? req.query.environment : undefined;

  const rows = await prisma.deployment.findMany({
    where: { entityId, ...(environment ? { environment } : {}) },
    orderBy: { deployedAt: "desc" },
    take: limit,
  });

  const items: DeploymentRow[] = rows.map((d) => ({
    id: d.id,
    environment: d.environment,
    ref: d.ref,
    sha: d.sha,
    state: d.state as DeploymentState,
    actorLogin: d.actorLogin,
    description: d.description,
    htmlUrl: d.htmlUrl,
    logUrl: d.logUrl,
    deployedAt: d.deployedAt ? d.deployedAt.toISOString() : null,
  }));
  res.json({ items });
});

// ---------------------------------------------------------------------------
// POST /:id/pipelines/refresh — admin/member only, audited.
// ---------------------------------------------------------------------------

pipelinesRouter.post("/:id/pipelines/refresh", async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (req.user.role !== "admin" && req.user.role !== "member") {
      res.status(403).json({ error: "Admin or member only" });
      return;
    }
    const entityId = await ensureEntity(req, res);
    if (!entityId) return;

    const result = await syncEntityPipelines(entityId);
    await prisma.auditEvent.create({
      data: {
        actorUserId: req.user.id,
        actorIp: req.ip ?? null,
        requestId: req.id != null ? String(req.id) : null,
        kind: "catalog.pipelines.refresh",
        targetKind: "catalog_entity",
        targetId: entityId,
        payload: {
          entityId,
          runsUpserted: result.runsUpserted,
          deploymentsUpserted: result.deploymentsUpserted,
          error: result.error,
        },
      },
    });

    if (result.error) {
      res.status(502).json({ ok: false, error: result.error, partial: result });
      return;
    }
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});
