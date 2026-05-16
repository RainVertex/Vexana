import type { Request } from "express";
import { prisma } from "@internal/db";
import { logger } from "../logger/logger";
import type { AuditKind, AuditPayloads, AuditTarget } from "./kinds";

export interface AuditContext {
  actorUserId?: string | null;
  actorIp?: string | null;
  requestId?: string | null;
}

export async function recordAudit<K extends AuditKind>(
  req: Request,
  kind: K,
  payload: AuditPayloads[K],
  target?: AuditTarget,
): Promise<void> {
  await write({
    actorUserId: req.user?.id ?? null,
    actorIp: req.ip ?? null,
    requestId: req.id != null ? String(req.id) : null,
    kind,
    targetKind: target?.kind ?? null,
    targetId: target?.id ?? null,
    payload: payload as object,
  });
}

export async function recordSystemAudit<K extends AuditKind>(
  kind: K,
  payload: AuditPayloads[K],
  target?: AuditTarget,
  ctx: AuditContext = {},
): Promise<void> {
  await write({
    actorUserId: ctx.actorUserId ?? null,
    actorIp: ctx.actorIp ?? null,
    requestId: ctx.requestId ?? null,
    kind,
    targetKind: target?.kind ?? null,
    targetId: target?.id ?? null,
    payload: payload as object,
  });
}

async function write(data: {
  actorUserId: string | null;
  actorIp: string | null;
  requestId: string | null;
  kind: string;
  targetKind: string | null;
  targetId: string | null;
  payload: object;
}) {
  try {
    await prisma.auditEvent.create({ data });
  } catch (err) {
    logger.error({ err, kind: data.kind }, "Failed to write AuditEvent");
  }
}
