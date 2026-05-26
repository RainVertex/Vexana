// Plane webhook receiver. Plane signs every delivery with HMAC-SHA256 in the
// `X-Plane-Signature` header (see verifyPlaneSignature in plane-client). We
// verify, then dispatch by `event` + `action` to a single-row upsert/delete.
// The incremental sync job catches any deliveries we miss.

import { Router } from "express";
import { prisma } from "@internal/db";
import { readPlaneWebhookHeaders, verifyPlaneSignature } from "@internal/plane-client";
import type {
  PlaneApiComment,
  PlaneApiCycle,
  PlaneApiModule,
  PlaneApiProject,
  PlaneApiWorkItem,
} from "@internal/plane-client";
import express from "express";
import { decryptWebhookSecret } from "./engine";
import { upsertComment, upsertCycle, upsertModule, upsertProject, upsertWorkItem } from "./upsert";
import {
  buildPlaneWorkItemUrl,
  notifyPlaneAssigned,
  notifyPlaneCommentPosted,
  resolvePlaneAssignees,
} from "./notifyPlane";

interface PlaneWebhookPayload {
  event: string;
  action: "create" | "update" | "delete";
  webhook_id?: string;
  workspace_id?: string;
  data?: unknown;
}

export const planeWebhookRouter: Router = Router();

// Plane delivery is JSON but we need the raw bytes for signature
// verification. express.raw() preserves them as a Buffer on req.body.
planeWebhookRouter.post(
  "/:integrationId",
  express.raw({ type: "*/*", limit: "5mb" }),
  async (req, res) => {
    const integrationId = req.params.integrationId;
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
      select: { id: true, kind: true, enabled: true, config: true },
    });
    if (!integration || integration.kind !== "plane") {
      res.status(404).json({ error: "Integration not found" });
      return;
    }
    if (!integration.enabled) {
      // Disabled integrations 200 the webhook so Plane doesn't queue retries
      // forever — the next full sync will reconcile when re-enabled.
      res.status(200).json({ status: "ignored", reason: "integration disabled" });
      return;
    }

    const secret = decryptWebhookSecret(integration.config);
    // Express's req.headers is a plain object (IncomingHttpHeaders), not a
    // Headers-like object. Adapt it on the fly to the .get() interface
    // readPlaneWebhookHeaders expects. Header names from Node are already
    // lowercased; we lowercase the requested name to be safe.
    const headerLookup = {
      get: (name: string): string | null => {
        const value = req.headers[name.toLowerCase()];
        if (value === undefined) return null;
        return Array.isArray(value) ? (value[0] ?? null) : value;
      },
    };
    const { signature, event, delivery } = readPlaneWebhookHeaders(headerLookup);
    if (!secret) {
      res.status(503).json({ error: "Webhook secret not configured" });
      return;
    }
    const rawBody: Buffer = req.body instanceof Buffer ? req.body : Buffer.from(req.body ?? "");
    if (!verifyPlaneSignature(rawBody, signature, secret)) {
      res.status(401).json({ error: "Bad signature" });
      return;
    }

    let payload: PlaneWebhookPayload;
    try {
      payload = JSON.parse(rawBody.toString("utf8")) as PlaneWebhookPayload;
    } catch {
      res.status(400).json({ error: "Invalid JSON" });
      return;
    }

    try {
      await dispatch(integrationId, payload);
    } catch (err) {
      // Log and 500 so Plane retries — but don't leak internals.
      console.error("[plane-webhook]", { integrationId, delivery, event, err });
      res.status(500).json({ error: "Processing failed" });
      return;
    }

    await prisma.planeSyncCursor.upsert({
      where: { integrationId },
      create: { integrationId, lastWebhookAt: new Date() },
      update: { lastWebhookAt: new Date() },
    });

    res.status(200).json({ status: "ok" });
  },
);

function planeUuid(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && typeof (v as { id?: unknown }).id === "string") {
    return (v as { id: string }).id;
  }
  return null;
}

function planeUuidList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map(planeUuid).filter((id): id is string => id !== null);
}

function normalizeIssuePayload(raw: PlaneApiWorkItem): PlaneApiWorkItem {
  return {
    ...raw,
    state: planeUuid(raw.state) as PlaneApiWorkItem["state"],
    parent: planeUuid(raw.parent) as PlaneApiWorkItem["parent"],
    cycle: planeUuid(raw.cycle) as PlaneApiWorkItem["cycle"],
    module: planeUuid(raw.module) as PlaneApiWorkItem["module"],
    assignees: planeUuidList(raw.assignees),
    labels: planeUuidList(raw.labels),
  };
}

function normalizeCommentPayload(raw: PlaneApiComment): PlaneApiComment {
  const actorId = planeUuid(raw.actor) ?? raw.actor_detail?.id ?? null;
  return {
    ...raw,
    issue: planeUuid(raw.issue) ?? raw.issue,
    project: planeUuid(raw.project) ?? raw.project,
    workspace: planeUuid(raw.workspace) ?? raw.workspace,
    actor: actorId,
    actor_detail: actorId ? { id: actorId } : null,
  };
}

function normalizeProjectPayload(raw: PlaneApiProject): PlaneApiProject {
  return {
    ...raw,
    workspace: planeUuid(raw.workspace) ?? raw.workspace,
  };
}

function normalizeCyclePayload(raw: PlaneApiCycle): PlaneApiCycle {
  return {
    ...raw,
    project: planeUuid(raw.project) ?? raw.project,
  };
}

function normalizeModulePayload(raw: PlaneApiModule): PlaneApiModule {
  return {
    ...raw,
    project: planeUuid(raw.project) ?? raw.project,
  };
}

async function dispatch(integrationId: string, payload: PlaneWebhookPayload): Promise<void> {
  const { event, action, data } = payload;
  if (action === "delete" || (action as string) === "deleted") {
    await handleDelete(integrationId, event, data);
    return;
  }
  if (!data || typeof data !== "object") return;
  switch (event) {
    case "project":
      await handleProjectUpsert(integrationId, data as PlaneApiProject);
      break;
    case "issue":
    case "work_item":
      await handleWorkItemUpsert(integrationId, data as PlaneApiWorkItem);
      break;
    case "cycle":
      await handleCycleUpsert(integrationId, data as PlaneApiCycle);
      break;
    case "module":
      await handleModuleUpsert(integrationId, data as PlaneApiModule);
      break;
    case "issue_comment":
    case "work_item_comment":
      await handleCommentUpsert(integrationId, data as PlaneApiComment);
      break;
    default:
      // Unknown event types are silently ignored — incremental sync still
      // catches anything important.
      break;
  }
}

async function handleProjectUpsert(integrationId: string, raw: PlaneApiProject): Promise<void> {
  const normalized = normalizeProjectPayload(raw);
  const ws = await prisma.planeWorkspace.findFirst({
    where: { integrationId, externalId: normalized.workspace },
    select: { id: true },
  });
  if (!ws) return;
  await prisma.$transaction(async (tx) => {
    await upsertProject(tx, integrationId, ws.id, normalized);
  });
}

async function handleWorkItemUpsert(integrationId: string, raw: PlaneApiWorkItem): Promise<void> {
  const normalized = normalizeIssuePayload(raw);
  const project = await prisma.planeProject.findFirst({
    where: { integrationId, externalId: normalized.project },
    select: { id: true, externalId: true, identifier: true, name: true, workspaceId: true },
  });
  if (!project) return;
  await prisma.$transaction(async (tx) => {
    const existing = await tx.planeWorkItem.findUnique({
      where: { projectId_externalId: { projectId: project.id, externalId: normalized.id } },
      select: { assigneeIds: true },
    });
    const existingAssignees = new Set(existing?.assigneeIds ?? []);
    await upsertWorkItem(tx, project.id, normalized);

    const newAssignees = normalized.assignees.filter((id) => !existingAssignees.has(id));
    if (newAssignees.length === 0) return;
    const mappings = await resolvePlaneAssignees(tx, project.workspaceId, newAssignees);
    if (mappings.size === 0) return;
    const integration = await tx.integration.findUnique({
      where: { id: integrationId },
      select: { config: true },
    });
    const planeUrl = integration
      ? buildPlaneWorkItemUrl(integration.config, project.externalId, normalized.id)
      : null;
    const localWorkItem = await tx.planeWorkItem.findUnique({
      where: { projectId_externalId: { projectId: project.id, externalId: normalized.id } },
      select: { id: true },
    });
    if (!localWorkItem) return;
    await notifyPlaneAssigned(tx, {
      platformUserIds: Array.from(mappings.values()),
      workItem: {
        localId: localWorkItem.id,
        externalId: normalized.id,
        sequenceId: normalized.sequence_id,
        name: normalized.name,
      },
      project: {
        externalId: project.externalId,
        identifier: project.identifier,
        name: project.name,
      },
      planeUrl,
    });
  });
}

async function handleCycleUpsert(integrationId: string, raw: PlaneApiCycle): Promise<void> {
  const normalized = normalizeCyclePayload(raw);
  const project = await prisma.planeProject.findFirst({
    where: { integrationId, externalId: normalized.project },
    select: { id: true },
  });
  if (!project) return;
  await prisma.$transaction(async (tx) => {
    await upsertCycle(tx, project.id, normalized);
  });
}

async function handleModuleUpsert(integrationId: string, raw: PlaneApiModule): Promise<void> {
  const normalized = normalizeModulePayload(raw);
  const project = await prisma.planeProject.findFirst({
    where: { integrationId, externalId: normalized.project },
    select: { id: true },
  });
  if (!project) return;
  await prisma.$transaction(async (tx) => {
    await upsertModule(tx, project.id, normalized);
  });
}

async function handleCommentUpsert(integrationId: string, raw: PlaneApiComment): Promise<void> {
  const normalized = normalizeCommentPayload(raw);
  const workItem = await prisma.planeWorkItem.findFirst({
    where: { project: { integrationId }, externalId: normalized.issue },
    select: {
      id: true,
      externalId: true,
      sequenceId: true,
      name: true,
      assigneeIds: true,
      project: {
        select: { externalId: true, identifier: true, name: true, workspaceId: true },
      },
    },
  });
  if (!workItem) return;
  await prisma.$transaction(async (tx) => {
    const existing = await tx.planeComment.findUnique({
      where: { workItemId_externalId: { workItemId: workItem.id, externalId: normalized.id } },
      select: { id: true },
    });
    const isNew = !existing;
    await upsertComment(tx, workItem.id, normalized);
    if (!isNew) return;

    const authorExternalId = normalized.actor ?? null;
    const recipients = workItem.assigneeIds.filter((id) => id !== authorExternalId);
    if (recipients.length === 0) return;
    const mappings = await resolvePlaneAssignees(tx, workItem.project.workspaceId, recipients);
    if (mappings.size === 0) return;

    let authorDisplayName: string | null = null;
    if (authorExternalId) {
      const author = await tx.planeMember.findFirst({
        where: { workspaceId: workItem.project.workspaceId, externalId: authorExternalId },
        select: { displayName: true },
      });
      authorDisplayName = author?.displayName ?? null;
    }

    const body =
      typeof normalized.comment_stripped === "string" && normalized.comment_stripped.length > 0
        ? normalized.comment_stripped
        : typeof normalized.comment_html === "string"
          ? normalized.comment_html.replace(/<[^>]+>/g, "")
          : "";
    const bodyExcerpt = body.trim().slice(0, 200);

    const integration = await tx.integration.findUnique({
      where: { id: integrationId },
      select: { config: true },
    });
    const planeUrl = integration
      ? buildPlaneWorkItemUrl(integration.config, workItem.project.externalId, workItem.externalId)
      : null;

    await notifyPlaneCommentPosted(tx, {
      platformUserIds: Array.from(mappings.values()),
      workItem: {
        localId: workItem.id,
        externalId: workItem.externalId,
        sequenceId: workItem.sequenceId,
        name: workItem.name,
      },
      project: {
        externalId: workItem.project.externalId,
        identifier: workItem.project.identifier,
        name: workItem.project.name,
      },
      authorDisplayName,
      bodyExcerpt,
      planeUrl,
    });
  });
}

async function handleDelete(integrationId: string, event: string, data: unknown): Promise<void> {
  if (!data || typeof data !== "object") return;
  const externalId = (data as { id?: string }).id;
  if (!externalId) return;
  switch (event) {
    case "project":
      await prisma.planeProject.deleteMany({ where: { integrationId, externalId } });
      break;
    case "issue":
    case "work_item":
      await prisma.planeWorkItem.deleteMany({
        where: { project: { integrationId }, externalId },
      });
      break;
    case "cycle":
      await prisma.planeCycle.deleteMany({
        where: { project: { integrationId }, externalId },
      });
      break;
    case "module":
      await prisma.planeModule.deleteMany({
        where: { project: { integrationId }, externalId },
      });
      break;
    case "issue_comment":
    case "work_item_comment":
      await prisma.planeComment.deleteMany({
        where: { workItem: { project: { integrationId } }, externalId },
      });
      break;
    default:
      break;
  }
}
