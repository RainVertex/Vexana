import { prisma } from "@internal/db";
import type { UserRole } from "@internal/db";

// Tiered creation rules for the agents wizard. Decision matrix:
//
//   admin caller       → can create anything
//   team-lead caller   → can create team-owned agents (role ≤ member);
//                        cannot disable onBehalfOfRequired; cannot grant
//                        admin role
//   member caller      → can create personal agents only (role ≤ member);
//                        cannot disable onBehalfOfRequired
//   guest caller       → can create guest-role personal agents only
//
// Admin-role agents and onBehalfOfRequired=false (autonomous) are admin-only
// because both increase blast radius materially: an admin agent gets the
// keys to the kingdom, and an autonomous agent skips the human-in-the-loop
// permission intersection.

export interface CreationGuardArgs {
  caller: { id: string; role: UserRole };
  desired: {
    role: UserRole;
    owningTeamId: string | null;
    onBehalfOfRequired: boolean;
  };
}

export interface CreationGuardResult {
  ok: boolean;
  reason?: string;
}

export async function checkAgentCreation(args: CreationGuardArgs): Promise<CreationGuardResult> {
  const { caller, desired } = args;

  // Admins bypass all the tier checks.
  if (caller.role === "admin") return { ok: true };

  // Only admins can mint admin-role agents — that's by definition the
  // privilege-escalation that this guard exists to prevent.
  if (desired.role === "admin") {
    return { ok: false, reason: "Only admins can create admin-role agents" };
  }

  // Only admins can create autonomous (no-invoker) agents.
  if (!desired.onBehalfOfRequired) {
    return {
      ok: false,
      reason: "Only admins can create agents with onBehalfOfRequired=false",
    };
  }

  if (desired.owningTeamId) {
    // Team-owned agents require the caller to be a lead of that team.
    const membership = await prisma.teamMembership.findUnique({
      where: { teamId_userId: { teamId: desired.owningTeamId, userId: caller.id } },
      select: { role: true },
    });
    if (!membership || membership.role !== "lead") {
      return {
        ok: false,
        reason: "Only a team lead can create team-owned agents for that team",
      };
    }
    // Team-owned agents are capped at member.
    if (desired.role !== "member" && desired.role !== "guest") {
      return { ok: false, reason: "Team-owned agents are capped at role=member" };
    }
    return { ok: true };
  }

  // Personal agents — cap at the caller's own role.
  if (caller.role === "guest" && desired.role !== "guest") {
    return { ok: false, reason: "Guest users can only create guest-role agents" };
  }
  // member callers can create member or guest agents (role ≤ self).
  return { ok: true };
}
