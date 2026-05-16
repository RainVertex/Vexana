import { Router } from "express";
import { z } from "zod";
import { prisma } from "@internal/db";
import type { AgentApprovalRequestDto, AgentApprovalStatus } from "@internal/shared-types";

// /api/agent-approvals — inbox + decision endpoints for autonomous-run
// approvals. Chat-driven approvals continue to flow through the existing
// ChatActionPreview / *_prepare-*_submit machinery; this router exists for
// agents that hit a `requires_approval` policy outside of an interactive
// chat (cron jobs, webhooks, scheduled tasks).
//
// Authorization model:
//   - The agent's primary contact (Agent.ownerUserId) sees its pending rows.
//   - Team-owned agents: any lead of the owning team also sees them.
//   - Admins see everything.
// Decisions are recorded with the deciding user id so the audit trail is
// complete. Once decided, the autonomous run that wrote the row is
// responsible for picking up the decision on its next iteration (or for
// re-submitting fresh) — the row is the persistence boundary, not the
// resumption mechanism.

export const agentApprovalsRouter: Router = Router();

const listSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "expired"]).optional(),
});

const decisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
});

interface ApprovalRow {
  id: string;
  agentUserId: string;
  toolName: string;
  parsedParams: unknown;
  status: string;
  requestedAt: Date;
  decidedByUserId: string | null;
  decidedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  agentUser: { displayName: string };
}

function toDto(row: ApprovalRow): AgentApprovalRequestDto {
  return {
    id: row.id,
    agentUserId: row.agentUserId,
    agentName: row.agentUser.displayName,
    toolName: row.toolName,
    parsedParams: (row.parsedParams as Record<string, unknown>) ?? {},
    status: row.status as AgentApprovalStatus,
    requestedAt: row.requestedAt.toISOString(),
    decidedByUserId: row.decidedByUserId,
    decidedAt: row.decidedAt?.toISOString() ?? null,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

agentApprovalsRouter.get("/", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  const parsed = listSchema.safeParse({ status: req.query.status });
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query", issues: parsed.error.issues });
  }
  const { status } = parsed.data;

  const isAdmin = req.user.role === "admin";

  // Find the agents the caller has decision rights over: agents they own
  // (Agent.ownerUserId), agents owned by teams they lead, plus all agents
  // for admins.
  const ledTeams = await prisma.teamMembership.findMany({
    where: { userId: req.user.id, role: "lead", team: { deletedAt: null } },
    select: { teamId: true },
  });
  const ledTeamIds = ledTeams.map((m) => m.teamId);

  const visibleAgents = await prisma.agent.findMany({
    where: isAdmin
      ? {}
      : {
          OR: [
            { ownerUserId: req.user.id },
            ...(ledTeamIds.length > 0 ? [{ owningTeamId: { in: ledTeamIds } }] : []),
          ],
        },
    select: { userId: true },
  });
  const visibleAgentUserIds = visibleAgents.map((a) => a.userId);

  if (visibleAgentUserIds.length === 0) {
    return res.json({ items: [] });
  }

  const rows = await prisma.agentApprovalRequest.findMany({
    where: {
      agentUserId: { in: visibleAgentUserIds },
      ...(status ? { status } : {}),
    },
    orderBy: { requestedAt: "desc" },
    take: 200,
    include: { agentUser: { select: { displayName: true } } },
  });

  res.json({ items: rows.map(toDto) });
});

agentApprovalsRouter.post("/:id/decision", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  const parsed = decisionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", issues: parsed.error.issues });
  }

  const row = await prisma.agentApprovalRequest.findUnique({
    where: { id: req.params.id },
    include: {
      agentUser: {
        select: {
          agentProfile: { select: { ownerUserId: true, owningTeamId: true } },
        },
      },
    },
  });
  if (!row) return res.status(404).json({ error: "Approval not found" });

  // Authorization: admin, primary contact, or lead of the owning team.
  const isAdmin = req.user.role === "admin";
  const profile = row.agentUser.agentProfile;
  let allowed = isAdmin || profile?.ownerUserId === req.user.id;
  if (!allowed && profile?.owningTeamId) {
    const m = await prisma.teamMembership.findUnique({
      where: { teamId_userId: { teamId: profile.owningTeamId, userId: req.user.id } },
      select: { role: true },
    });
    allowed = m?.role === "lead";
  }
  if (!allowed) return res.status(403).json({ error: "Forbidden" });

  if (row.status !== "pending") {
    return res.status(409).json({ error: `Approval already ${row.status}` });
  }
  if (row.expiresAt < new Date()) {
    // Mark expired and return 410 so the caller knows it's not actionable.
    await prisma.agentApprovalRequest.update({
      where: { id: row.id },
      data: { status: "expired" },
    });
    return res.status(410).json({ error: "Approval expired" });
  }

  const updated = await prisma.agentApprovalRequest.update({
    where: { id: row.id },
    data: {
      status: parsed.data.decision,
      decidedByUserId: req.user.id,
      decidedAt: new Date(),
    },
    include: { agentUser: { select: { displayName: true } } },
  });

  res.json(toDto(updated));
});
