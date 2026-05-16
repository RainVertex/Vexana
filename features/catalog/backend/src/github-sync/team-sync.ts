// Org-level team sync driven by a GitHub App installation. Mirrors the
// repo-side bulk-sync pattern: pull a snapshot from GitHub, diff against
// the platform DB, apply the delta in one transaction, and write a run
// record. The same `runReconciliation` entry point is used by all three
// reconciliation layers (webhook, manual /resync, weekly cron) — the source
// argument only flavors the audit row.
//
// Design constraints (from the plan):
//   - Idempotent: re-running yields the same end state.
//   - Concurrency-safe with itself: two overlapping runs both diff against
//     current DB state, so the second one sees the first's writes and is a
//     near-noop. The transaction prevents intermediate-state reads.
//   - Members not yet on the platform are buffered into PendingTeamMembership
//     with a 7-day TTL, drained by the SSO user-creation hook.
//   - Outside collaborators (not org members) are filtered out at queue entry.

import { Prisma, prisma } from "@internal/db";
import { GitHubAppNotConfiguredError, octokitForInstallation } from "@feature/integrations-backend";
import type { Octokit as OctokitClient } from "octokit";

export type ReconciliationSource = "webhook" | "cron" | "manual";

export interface ReconciliationResult {
  runId: string;
  installationId: number;
  source: ReconciliationSource;
  ok: boolean;
  skippedReason?: "user_account" | "no_org_login" | "app_not_configured";
  teamsCreated: number;
  teamsUpdated: number;
  teamsDeleted: number;
  membersAdded: number;
  membersRemoved: number;
  pendingQueued: number;
  pendingResolved: number;
  errors: Array<{ scope: string; reason: string }>;
  startedAt: Date;
  finishedAt: Date;
}

interface GithubTeamRecord {
  nodeId: string; // stable across renames — used as Team.externalId
  databaseId: number;
  slug: string;
  name: string;
  description: string | null;
  parentNodeId: string | null;
  members: Array<{ githubId: string; login: string; role: "lead" | "member" }>;
}

interface GithubState {
  teams: GithubTeamRecord[];
  orgMemberIds: Set<string>; // githubIds for outside-collab filtering
  orgLogin: string;
}

interface DbTeamRecord {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  externalId: string;
  externalSlug: string | null;
  parentTeamId: string | null;
  memberUserIds: Set<string>;
  pendingGithubIds: Set<string>;
}

interface DbState {
  teamsByExternalId: Map<string, DbTeamRecord>;
  // githubId → User.id, for translating GH members to platform users
  userIdByGithubId: Map<string, string>;
  // slugs currently in use by NON-github teams that are not soft-deleted —
  // used to detect collisions when assigning slugs to imported teams.
  manualSlugs: Set<string>;
}

export interface ReconciliationDiff {
  teamsToCreate: GithubTeamRecord[];
  teamsToUpdate: Array<{ existing: DbTeamRecord; gh: GithubTeamRecord }>;
  teamsToSoftDelete: DbTeamRecord[];
  // Per-team adds/removes. teamRef identifies the team either by its existing
  // DB id (for updates) or by externalId (for newly-created teams resolved
  // mid-transaction).
  membershipsToAdd: Array<{
    teamExternalId: string;
    userId: string;
    role: "lead" | "member";
  }>;
  membershipsToRemove: Array<{ teamId: string; userId: string }>;
  pendingToQueue: Array<{
    teamExternalId: string;
    githubId: string;
    githubLogin: string;
    role: "lead" | "member";
  }>;
}

const PENDING_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Top-level entry point. */
export async function runReconciliation(
  installationId: number,
  source: ReconciliationSource,
): Promise<ReconciliationResult> {
  const startedAt = new Date();
  const run = await prisma.githubReconciliationRun.create({
    data: { source, installationId, startedAt },
  });

  const result: ReconciliationResult = {
    runId: run.id,
    installationId,
    source,
    ok: true,
    teamsCreated: 0,
    teamsUpdated: 0,
    teamsDeleted: 0,
    membersAdded: 0,
    membersRemoved: 0,
    pendingQueued: 0,
    pendingResolved: 0,
    errors: [],
    startedAt,
    finishedAt: startedAt,
  };

  let octo: OctokitClient;
  try {
    octo = await octokitForInstallation(installationId);
  } catch (err) {
    if (err instanceof GitHubAppNotConfiguredError) {
      await closeRun(run.id, result, { ok: false, skippedReason: "app_not_configured" });
      return result;
    }
    throw err;
  }

  const orgLogin = await readInstallationOrgLogin(installationId);
  if (!orgLogin) {
    await closeRun(run.id, result, { ok: false, skippedReason: "no_org_login" });
    return result;
  }

  // GitHub installations on personal accounts have no teams — the teams
  // endpoint returns 404. Skip cleanly so cron loops don't fail.
  let github: GithubState;
  try {
    github = await fetchGithubState(octo, orgLogin);
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404) {
      await closeRun(run.id, result, { ok: false, skippedReason: "user_account" });
      return result;
    }
    result.errors.push({ scope: "fetch", reason: errMessage(err) });
    await closeRun(run.id, result, { ok: false });
    return result;
  }

  const db = await loadDbState(installationId);
  const diff = computeDiff(github, db);
  const applied = await applyDiff(diff, db, github, installationId);

  result.teamsCreated = applied.teamsCreated;
  result.teamsUpdated = applied.teamsUpdated;
  result.teamsDeleted = applied.teamsDeleted;
  result.membersAdded = applied.membersAdded;
  result.membersRemoved = applied.membersRemoved;
  result.pendingQueued = applied.pendingQueued;
  result.errors.push(...applied.errors);

  await closeRun(run.id, result, { ok: applied.errors.length === 0 });
  return result;
}

/** Resolve the org login for an installation. */
async function readInstallationOrgLogin(installationId: number): Promise<string | null> {
  const rows = await prisma.integration.findMany({
    where: { kind: "github" },
    select: { config: true },
  });
  for (const row of rows) {
    const cfg =
      row.config && typeof row.config === "object" && !Array.isArray(row.config)
        ? (row.config as Record<string, unknown>)
        : null;
    if (!cfg) continue;
    if (cfg.installationId !== installationId) continue;
    if (cfg.accountType !== "Organization") return null;
    const login = typeof cfg.accountLogin === "string" ? cfg.accountLogin : null;
    return login && login.length > 0 ? login : null;
  }
  return null;
}

/** Pull a complete snapshot of teams + memberships + org membership for the given org. */
export async function fetchGithubState(
  octo: OctokitClient,
  orgLogin: string,
): Promise<GithubState> {
  type TeamApi = {
    id: number;
    node_id: string;
    slug: string;
    name: string;
    description: string | null;
    parent: { node_id: string } | null;
  };
  type MemberApi = { id: number; login: string };

  const teamsRaw = (await octo.paginate(octo.rest.teams.list, {
    org: orgLogin,
    per_page: 100,
  })) as TeamApi[];

  const orgMembersRaw = (await octo.paginate(octo.rest.orgs.listMembers, {
    org: orgLogin,
    per_page: 100,
  })) as MemberApi[];
  const orgMemberIds = new Set(orgMembersRaw.map((m) => String(m.id)));

  const teams: GithubTeamRecord[] = [];
  for (const t of teamsRaw) {
    let members: GithubTeamRecord["members"] = [];
    try {
      const maintainersRaw = (await octo.paginate(octo.rest.teams.listMembersInOrg, {
        org: orgLogin,
        team_slug: t.slug,
        role: "maintainer",
        per_page: 100,
      })) as MemberApi[];
      const allRaw = (await octo.paginate(octo.rest.teams.listMembersInOrg, {
        org: orgLogin,
        team_slug: t.slug,
        role: "all",
        per_page: 100,
      })) as MemberApi[];
      const maintainerIds = new Set(maintainersRaw.map((m) => String(m.id)));
      members = allRaw.map((m) => ({
        githubId: String(m.id),
        login: m.login,
        role: maintainerIds.has(String(m.id)) ? ("lead" as const) : ("member" as const),
      }));
    } catch (err) {
      // 404 here means the team disappeared between list and members fetch.
      // Treat as empty membership and continue — diff will pick this up.
      if ((err as { status?: number }).status !== 404) throw err;
    }
    teams.push({
      nodeId: t.node_id,
      databaseId: t.id,
      slug: t.slug,
      name: t.name,
      description: t.description,
      parentNodeId: t.parent?.node_id ?? null,
      members,
    });
  }

  return { teams, orgMemberIds, orgLogin };
}

/** Snapshot the platform's current view of GitHub-sourced teams + membership plus the lookup */
async function loadDbState(installationId: number): Promise<DbState> {
  const teams = await prisma.team.findMany({
    where: { source: "github", installationId },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      externalId: true,
      externalSlug: true,
      parentTeamId: true,
      memberships: { select: { userId: true } },
      pendingMemberships: { select: { githubId: true } },
    },
  });

  const teamsByExternalId = new Map<string, DbTeamRecord>();
  for (const t of teams) {
    if (!t.externalId) continue; // shouldn't happen for source=github, defensive
    teamsByExternalId.set(t.externalId, {
      id: t.id,
      slug: t.slug,
      name: t.name,
      description: t.description,
      externalId: t.externalId,
      externalSlug: t.externalSlug,
      parentTeamId: t.parentTeamId,
      memberUserIds: new Set(t.memberships.map((m) => m.userId)),
      pendingGithubIds: new Set(t.pendingMemberships.map((p) => p.githubId)),
    });
  }

  // Only fetch users with a githubId set (which is all of them per current
  // schema, but the column is technically NOT NULL — keep the where for
  // future flexibility).
  const users = await prisma.user.findMany({
    where: { githubId: { not: "" } },
    select: { id: true, githubId: true },
  });
  const userIdByGithubId = new Map(users.map((u) => [u.githubId, u.id]));

  const manual = await prisma.team.findMany({
    where: { source: { not: "github" }, deletedAt: null },
    select: { slug: true },
  });
  const manualSlugs = new Set(manual.map((t) => t.slug));

  return { teamsByExternalId, userIdByGithubId, manualSlugs };
}

/** Pure diff: given GitHub + DB snapshots, return action lists. */
export function computeDiff(github: GithubState, db: DbState): ReconciliationDiff {
  const diff: ReconciliationDiff = {
    teamsToCreate: [],
    teamsToUpdate: [],
    teamsToSoftDelete: [],
    membershipsToAdd: [],
    membershipsToRemove: [],
    pendingToQueue: [],
  };

  const seenExternalIds = new Set<string>();

  for (const gh of github.teams) {
    seenExternalIds.add(gh.nodeId);
    const existing = db.teamsByExternalId.get(gh.nodeId);
    if (!existing) {
      diff.teamsToCreate.push(gh);
    } else if (
      existing.name !== gh.name ||
      existing.description !== gh.description ||
      existing.externalSlug !== gh.slug
      // parent reconciled in second pass after creates land
    ) {
      diff.teamsToUpdate.push({ existing, gh });
    }

    // Membership diff per team. We can only emit add/remove for users we
    // already know about; unknown githubIds become pending entries.
    const desiredUserIds = new Map<string, "lead" | "member">();
    for (const m of gh.members) {
      if (!github.orgMemberIds.has(m.githubId)) {
        // Outside collaborator on a team — by policy we don't track those.
        continue;
      }
      const userId = db.userIdByGithubId.get(m.githubId);
      if (userId) {
        desiredUserIds.set(userId, m.role);
      } else {
        diff.pendingToQueue.push({
          teamExternalId: gh.nodeId,
          githubId: m.githubId,
          githubLogin: m.login,
          role: m.role,
        });
      }
    }

    if (existing) {
      // Add: in desired, not in existing.
      for (const [userId, role] of desiredUserIds) {
        if (!existing.memberUserIds.has(userId)) {
          diff.membershipsToAdd.push({
            teamExternalId: gh.nodeId,
            userId,
            role,
          });
        }
      }
      // Remove: in existing, not in desired.
      for (const userId of existing.memberUserIds) {
        if (!desiredUserIds.has(userId)) {
          diff.membershipsToRemove.push({ teamId: existing.id, userId });
        }
      }
    } else {
      // Brand-new team: every desired membership is an add. teamId resolved
      // after the create lands.
      for (const [userId, role] of desiredUserIds) {
        diff.membershipsToAdd.push({
          teamExternalId: gh.nodeId,
          userId,
          role,
        });
      }
    }
  }

  // Teams in DB but no longer on GitHub → soft-delete.
  for (const dbTeam of db.teamsByExternalId.values()) {
    if (!seenExternalIds.has(dbTeam.externalId)) {
      diff.teamsToSoftDelete.push(dbTeam);
    }
  }

  return diff;
}

interface ApplyResult {
  teamsCreated: number;
  teamsUpdated: number;
  teamsDeleted: number;
  membersAdded: number;
  membersRemoved: number;
  pendingQueued: number;
  errors: Array<{ scope: string; reason: string }>;
}

/** Apply the diff atomically. */
async function applyDiff(
  diff: ReconciliationDiff,
  db: DbState,
  github: GithubState,
  installationId: number,
): Promise<ApplyResult> {
  const out: ApplyResult = {
    teamsCreated: 0,
    teamsUpdated: 0,
    teamsDeleted: 0,
    membersAdded: 0,
    membersRemoved: 0,
    pendingQueued: 0,
    errors: [],
  };

  const expiresAt = new Date(Date.now() + PENDING_TTL_MS);

  await prisma.$transaction(async (tx) => {
    // Pass 1a: create new teams.
    const createdByExternalId = new Map<string, string>(); // externalId → Team.id
    for (const gh of diff.teamsToCreate) {
      const slug = pickSlug(gh, db, github.orgLogin);
      const created = await tx.team.create({
        data: {
          slug,
          name: gh.name,
          description: gh.description,
          source: "github",
          externalId: gh.nodeId,
          externalSlug: gh.slug,
          installationId,
          lastSyncedAt: new Date(),
        },
        select: { id: true },
      });
      createdByExternalId.set(gh.nodeId, created.id);
      // Track the slug so subsequent picks within the same run don't collide.
      db.manualSlugs.add(slug);
      out.teamsCreated++;
    }

    // Pass 1b: update existing teams (name / description / externalSlug only).
    for (const { existing, gh } of diff.teamsToUpdate) {
      await tx.team.update({
        where: { id: existing.id },
        data: {
          name: gh.name,
          description: gh.description,
          externalSlug: gh.slug,
          lastSyncedAt: new Date(),
        },
      });
      out.teamsUpdated++;
    }

    // Pass 1c: soft-delete teams gone from GitHub.
    for (const dbTeam of diff.teamsToSoftDelete) {
      await tx.team.update({
        where: { id: dbTeam.id },
        data: { deletedAt: new Date() },
      });
      out.teamsDeleted++;
    }

    // Helper to resolve a team by externalId post-create.
    const resolveTeamId = (externalId: string): string | null => {
      const existing = db.teamsByExternalId.get(externalId);
      if (existing) return existing.id;
      return createdByExternalId.get(externalId) ?? null;
    };

    // Pass 2: parent links. We process every team in the GitHub snapshot so
    // re-parents and unparents both land. Skip soft-deleted ones.
    const softDeletedExternalIds = new Set(diff.teamsToSoftDelete.map((t) => t.externalId));
    for (const gh of github.teams) {
      if (softDeletedExternalIds.has(gh.nodeId)) continue;
      const teamId = resolveTeamId(gh.nodeId);
      if (!teamId) continue;
      const desiredParentId = gh.parentNodeId ? resolveTeamId(gh.parentNodeId) : null;
      const wasJustCreated = createdByExternalId.has(gh.nodeId);
      const currentParentId = wasJustCreated
        ? null
        : (db.teamsByExternalId.get(gh.nodeId)?.parentTeamId ?? null);
      if (currentParentId !== desiredParentId) {
        await tx.team.update({
          where: { id: teamId },
          data: { parentTeamId: desiredParentId },
        });
      }
    }

    // Pass 3a: membership adds. createMany skipDuplicates handles the case
    // where another transaction inserted a row first (unlikely under our
    // single-flight discipline but cheap insurance).
    if (diff.membershipsToAdd.length > 0) {
      const addRows = diff.membershipsToAdd
        .map((a) => {
          const teamId = resolveTeamId(a.teamExternalId);
          if (!teamId) return null;
          return { teamId, userId: a.userId, role: a.role };
        })
        .filter(
          (r): r is { teamId: string; userId: string; role: "lead" | "member" } => r !== null,
        );
      if (addRows.length > 0) {
        const inserted = await tx.teamMembership.createMany({
          data: addRows,
          skipDuplicates: true,
        });
        out.membersAdded += inserted.count;
      }
    }

    // Pass 3b: membership removes (per team to keep blast radius bounded).
    for (const r of diff.membershipsToRemove) {
      try {
        await tx.teamMembership.delete({
          where: { teamId_userId: { teamId: r.teamId, userId: r.userId } },
        });
        out.membersRemoved++;
      } catch (err) {
        // P2025 = record not found — already removed by another path.
        if ((err as { code?: string }).code !== "P2025") throw err;
      }
    }

    // Pass 3c: pending memberships. Upsert refreshes expiresAt so we don't
    // accidentally drop someone whose onboarding takes >7d after they first
    // appeared on a GH team.
    for (const p of diff.pendingToQueue) {
      const teamId = resolveTeamId(p.teamExternalId);
      if (!teamId) continue;
      await tx.pendingTeamMembership.upsert({
        where: { teamId_githubId: { teamId, githubId: p.githubId } },
        update: { githubLogin: p.githubLogin, role: p.role, expiresAt },
        create: {
          teamId,
          githubId: p.githubId,
          githubLogin: p.githubLogin,
          role: p.role,
          expiresAt,
        },
      });
      out.pendingQueued++;
    }
  });

  return out;
}

/** Choose a slug for a newly-imported GitHub team. */
function pickSlug(gh: GithubTeamRecord, db: DbState, orgLogin: string): string {
  const base = sanitizeSlug(gh.slug);
  if (!db.manualSlugs.has(base)) return base;
  const orgSuffix = sanitizeSlug(`${base}-${orgLogin}`);
  if (!db.manualSlugs.has(orgSuffix)) return orgSuffix;
  return sanitizeSlug(`${orgSuffix}-${shortHash(gh.nodeId)}`);
}

function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function shortHash(input: string): string {
  // 6-char DJB2 hash. Plenty for a tiebreak suffix; no need for crypto.
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  return h.toString(36).slice(0, 6);
}

async function closeRun(
  runId: string,
  result: ReconciliationResult,
  patch: { ok: boolean; skippedReason?: ReconciliationResult["skippedReason"] },
): Promise<void> {
  result.finishedAt = new Date();
  result.ok = patch.ok;
  if (patch.skippedReason) result.skippedReason = patch.skippedReason;
  await prisma.githubReconciliationRun.update({
    where: { id: runId },
    data: {
      finishedAt: result.finishedAt,
      teamsCreated: result.teamsCreated,
      teamsUpdated: result.teamsUpdated,
      teamsDeleted: result.teamsDeleted,
      membersAdded: result.membersAdded,
      membersRemoved: result.membersRemoved,
      pendingQueued: result.pendingQueued,
      pendingResolved: result.pendingResolved,
      errors:
        result.errors.length > 0 || patch.skippedReason
          ? ({
              items: result.errors,
              skippedReason: patch.skippedReason ?? null,
            } as Prisma.InputJsonValue)
          : Prisma.JsonNull,
    },
  });
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
