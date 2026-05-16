import { Router } from "express";
import { z } from "zod";
import { prisma } from "@internal/db";
import { requireAuth, requireRole } from "../../middleware/requireAuth";
import { adminLimiter } from "../../middleware/rateLimit";
import { recordAudit } from "../../audit/audit";

export const adminGrantsRouter = Router();

adminGrantsRouter.use(adminLimiter, requireAuth, requireRole("admin"));

const createInput = z.object({
  granteeId: z.string().min(1),
  resourceType: z.enum(["team", "catalog_entity", "template"]),
  resourceId: z.string().min(1),
  expiresAt: z.string().datetime().optional(),
});

function shape(g: {
  id: string;
  granteeId: string;
  resourceType: string;
  resourceId: string;
  permissions: string[];
  grantedById: string;
  expiresAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
}) {
  return {
    id: g.id,
    granteeId: g.granteeId,
    resourceType: g.resourceType,
    resourceId: g.resourceId,
    permissions: g.permissions,
    grantedById: g.grantedById,
    expiresAt: g.expiresAt ? g.expiresAt.toISOString() : null,
    createdAt: g.createdAt.toISOString(),
    revokedAt: g.revokedAt ? g.revokedAt.toISOString() : null,
  };
}

adminGrantsRouter.get("/", async (req, res, next) => {
  try {
    const { granteeId } = req.query;
    const grants = await prisma.guestGrant.findMany({
      where: {
        revokedAt: null,
        ...(granteeId ? { granteeId: String(granteeId) } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ items: grants.map(shape) });
  } catch (err) {
    next(err);
  }
});

adminGrantsRouter.post("/", async (req, res, next) => {
  try {
    const parsed = createInput.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const grantee = await prisma.user.findUnique({ where: { id: parsed.data.granteeId } });
    if (!grantee) return res.status(404).json({ error: "User not found" });
    if (grantee.role !== "guest")
      return res.status(400).json({ error: "GuestGrants can only be issued to guest-role users" });

    const grant = await prisma.guestGrant.create({
      data: {
        granteeId: parsed.data.granteeId,
        resourceType: parsed.data.resourceType,
        resourceId: parsed.data.resourceId,
        permissions: ["read"],
        grantedById: req.user!.id,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      },
    });

    await recordAudit(req, "guest_grant.created", {
      grantId: grant.id,
      granteeId: grant.granteeId,
      resourceType: grant.resourceType,
      resourceId: grant.resourceId,
    });

    res.status(201).json(shape(grant));
  } catch (err) {
    next(err);
  }
});

adminGrantsRouter.delete("/:id", async (req, res, next) => {
  try {
    const grant = await prisma.guestGrant.findUnique({ where: { id: req.params.id } });
    if (!grant || grant.revokedAt) return res.status(404).json({ error: "Grant not found" });

    await prisma.guestGrant.update({
      where: { id: grant.id },
      data: { revokedAt: new Date() },
    });

    await recordAudit(req, "guest_grant.revoked", {
      grantId: grant.id,
      granteeId: grant.granteeId,
    });

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
