import { Router } from "express";
import { z } from "zod";
import { prisma } from "@internal/db";
import { requireAuth, requireRole } from "../../middleware/requireAuth";
import { adminLimiter } from "../../middleware/rateLimit";

export const adminAuditRouter = Router();

adminAuditRouter.use(adminLimiter, requireAuth, requireRole("admin"));

const querySchema = z.object({
  kind: z.string().optional(),
  actorUserId: z.string().optional(),
  targetKind: z.string().optional(),
  targetId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(200),
});

adminAuditRouter.get("/", async (req, res, next) => {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query" });
      return;
    }
    const q = parsed.data;
    const events = await prisma.auditEvent.findMany({
      where: {
        ...(q.kind ? { kind: q.kind } : {}),
        ...(q.actorUserId ? { actorUserId: q.actorUserId } : {}),
        ...(q.targetKind ? { targetKind: q.targetKind } : {}),
        ...(q.targetId ? { targetId: q.targetId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: q.limit,
      include: {
        actor: { select: { id: true, displayName: true, githubLogin: true, avatarUrl: true } },
      },
    });
    res.json({
      items: events.map((e) => ({
        id: e.id,
        kind: e.kind,
        actor: e.actor
          ? {
              id: e.actor.id,
              displayName: e.actor.displayName,
              githubLogin: e.actor.githubLogin,
              avatarUrl: e.actor.avatarUrl,
            }
          : null,
        actorIp: e.actorIp,
        targetKind: e.targetKind,
        targetId: e.targetId,
        requestId: e.requestId,
        payload: e.payload,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    next(err);
  }
});
