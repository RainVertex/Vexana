import { Router } from "express";
import { z } from "zod";
import { prisma } from "@internal/db";
import type { SecretDto } from "@internal/shared-types";
import { encryptSecret } from "./secrets";

// /api/secrets, CRUD for encrypted-at-rest secrets used by agents to talk
// to LLM providers (and potentially other secret-bearing integrations down
// the line). Scope rules:
//
// - personal: ownerUserId = caller, ownerTeamId = null
// - team: ownerTeamId = a team the caller leads, ownerUserId = null
// - org: both null, admin-only
//
// The plaintext value never leaves this router, POST takes it, encrypts
// stores. GET returns metadata (never the value). DELETE removes the row.
// Decryption happens server-side only when an adapter needs the key
// (resolveProviderApiKey in secrets.ts).

export const secretsRouter: Router = Router();

const createSchema = z.object({
  name: z.string().min(1).max(120),
  value: z.string().min(1).max(10000),
  scope: z.enum(["personal", "team", "org"]).default("personal"),
  teamId: z.string().min(1).optional(),
});

function toDto(row: {
  id: string;
  ownerUserId: string | null;
  ownerTeamId: string | null;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}): SecretDto {
  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    ownerTeamId: row.ownerTeamId,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

secretsRouter.get("/", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  const userId = req.user.id;
  const isAdmin = req.user.role === "admin";

  // Personal secrets: own. Team secrets: any team the caller belongs to
  // (not just leads, a member can READ which keys exist. only leads can
  // CREATE/DELETE). Org secrets: only visible to admins.
  const memberships = await prisma.teamMembership.findMany({
    where: { userId, team: { deletedAt: null } },
    select: { teamId: true },
  });
  const teamIds = memberships.map((m) => m.teamId);

  const where = {
    OR: [
      { ownerUserId: userId },
      ...(teamIds.length > 0 ? [{ ownerTeamId: { in: teamIds } }] : []),
      ...(isAdmin ? [{ AND: [{ ownerUserId: null }, { ownerTeamId: null }] }] : []),
    ],
  };

  const rows = await prisma.secret.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      ownerUserId: true,
      ownerTeamId: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  res.json({ items: rows.map(toDto) });
});

secretsRouter.post("/", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", issues: parsed.error.issues });
  }
  const { name, value, scope, teamId } = parsed.data;
  const isAdmin = req.user.role === "admin";

  let ownerUserId: string | null = null;
  let ownerTeamId: string | null = null;

  if (scope === "personal") {
    ownerUserId = req.user.id;
  } else if (scope === "team") {
    if (!teamId)
      return res.status(400).json({ error: "teamId is required for team-scoped secrets" });
    // Only team leads (or admin) can create team-scoped secrets.
    if (!isAdmin) {
      const m = await prisma.teamMembership.findUnique({
        where: { teamId_userId: { teamId, userId: req.user.id } },
        select: { role: true },
      });
      if (!m || m.role !== "lead") {
        return res
          .status(403)
          .json({ error: "Only a team lead (or admin) can create team-scoped secrets" });
      }
    }
    ownerTeamId = teamId;
  } else if (scope === "org") {
    if (!isAdmin)
      return res.status(403).json({ error: "Only admins can create org-scoped secrets" });
    // both null
  }

  let encryptedValue: Buffer;
  try {
    encryptedValue = encryptSecret(value);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }

  // Prisma's Bytes column types as Uint8Array<ArrayBuffer>. Node Buffers
  // can be backed by SharedArrayBuffer (ArrayBufferLike) so TS rejects the
  // direct assignment. Uint8Array.from copies into a fresh ArrayBuffer.
  const encryptedBytes = Uint8Array.from(encryptedValue);

  const created = await prisma.secret.create({
    data: { name, ownerUserId, ownerTeamId, encryptedValue: encryptedBytes },
    select: {
      id: true,
      ownerUserId: true,
      ownerTeamId: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  res.status(201).json(toDto(created));
});

secretsRouter.delete("/:id", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  const isAdmin = req.user.role === "admin";

  const existing = await prisma.secret.findUnique({
    where: { id: req.params.id },
    select: { id: true, ownerUserId: true, ownerTeamId: true },
  });
  if (!existing) return res.status(404).json({ error: "Secret not found" });

  // Authorization mirrors the create rules: own secret, lead of its team
  // or admin (the only role that can touch org-scoped secrets).
  let allowed = isAdmin || existing.ownerUserId === req.user.id;
  if (!allowed && existing.ownerTeamId) {
    const m = await prisma.teamMembership.findUnique({
      where: { teamId_userId: { teamId: existing.ownerTeamId, userId: req.user.id } },
      select: { role: true },
    });
    allowed = m?.role === "lead";
  }
  if (!allowed) return res.status(403).json({ error: "Forbidden" });

  await prisma.secret.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
