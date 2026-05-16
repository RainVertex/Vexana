import { Router } from "express";
import { z } from "zod";
import { prisma } from "@internal/db";
import { requireRole } from "../middleware/requireAuth";
import { recordAudit } from "../audit/audit";

export const departmentsRouter = Router();

const createInput = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
});

const patchInput = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
});

const memberInput = z.object({
  userId: z.string().min(1),
  role: z.enum(["admin", "member"]).optional(),
});

function shape(d: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: Date;
  deletedAt: Date | null;
}) {
  return {
    id: d.id,
    name: d.name,
    slug: d.slug,
    description: d.description,
    createdAt: d.createdAt.toISOString(),
    deletedAt: d.deletedAt ? d.deletedAt.toISOString() : null,
  };
}

departmentsRouter.get("/", async (_req, res, next) => {
  try {
    const depts = await prisma.department.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
    res.json({ items: depts.map(shape) });
  } catch (err) {
    next(err);
  }
});

departmentsRouter.post("/", requireRole("admin"), async (req, res, next) => {
  try {
    const parsed = createInput.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const exists = await prisma.department.findUnique({ where: { slug: parsed.data.slug } });
    if (exists) return res.status(409).json({ error: "Slug already taken" });
    const dept = await prisma.department.create({ data: parsed.data });
    await recordAudit(
      req,
      "department.created",
      { departmentId: dept.id },
      { kind: "department", id: String(dept.id) },
    );
    res.status(201).json(shape(dept));
  } catch (err) {
    next(err);
  }
});

departmentsRouter.get("/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const dept = await prisma.department.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            user: { select: { id: true, displayName: true, avatarUrl: true, email: true } },
          },
        },
        teams: { where: { deletedAt: null }, select: { id: true, slug: true, name: true } },
      },
    });
    if (!dept || dept.deletedAt) return res.status(404).json({ error: "Department not found" });
    res.json({
      ...shape(dept),
      members: dept.memberships.map((m) => ({
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
        displayName: m.user.displayName,
        avatarUrl: m.user.avatarUrl,
        email: m.user.email,
      })),
      teams: dept.teams,
    });
  } catch (err) {
    next(err);
  }
});

departmentsRouter.patch("/:id", requireRole("admin"), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const parsed = patchInput.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const dept = await prisma.department.findUnique({ where: { id } });
    if (!dept || dept.deletedAt) return res.status(404).json({ error: "Department not found" });
    const updated = await prisma.department.update({ where: { id: dept.id }, data: parsed.data });
    res.json(shape(updated));
  } catch (err) {
    next(err);
  }
});

departmentsRouter.delete("/:id", requireRole("admin"), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const dept = await prisma.department.findUnique({ where: { id } });
    if (!dept || dept.deletedAt) return res.status(404).json({ error: "Department not found" });
    await prisma.department.update({ where: { id: dept.id }, data: { deletedAt: new Date() } });
    await recordAudit(
      req,
      "department.deleted",
      { departmentId: dept.id },
      { kind: "department", id: dept.id },
    );
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

departmentsRouter.post("/:id/members", requireRole("admin"), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const parsed = memberInput.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const dept = await prisma.department.findUnique({ where: { id } });
    if (!dept || dept.deletedAt) return res.status(404).json({ error: "Department not found" });
    const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
    if (!user) return res.status(404).json({ error: "User not found" });
    await prisma.departmentMembership.upsert({
      where: { departmentId_userId: { departmentId: dept.id, userId: user.id } },
      create: { departmentId: dept.id, userId: user.id, role: parsed.data.role ?? "member" },
      update: { role: parsed.data.role ?? "member" },
    });
    await recordAudit(
      req,
      "department.member.added",
      { departmentId: dept.id, userId: user.id },
      { kind: "department", id: dept.id },
    );
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

departmentsRouter.delete("/:id/members/:userId", requireRole("admin"), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const userId = String(req.params.userId);
    const dept = await prisma.department.findUnique({ where: { id } });
    if (!dept || dept.deletedAt) return res.status(404).json({ error: "Department not found" });
    await prisma.departmentMembership.deleteMany({
      where: { departmentId: dept.id, userId },
    });
    await recordAudit(
      req,
      "department.member.removed",
      { departmentId: dept.id, userId },
      { kind: "department", id: dept.id },
    );
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

departmentsRouter.post("/:id/teams", requireRole("admin"), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const dept = await prisma.department.findUnique({ where: { id } });
    if (!dept || dept.deletedAt) return res.status(404).json({ error: "Department not found" });
    const { teamId } = z.object({ teamId: z.string().min(1) }).parse(req.body);
    const team = await prisma.team.findFirst({ where: { id: teamId, deletedAt: null } });
    if (!team) return res.status(404).json({ error: "Team not found" });
    await prisma.team.update({ where: { id: team.id }, data: { departmentId: dept.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
