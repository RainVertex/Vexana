import {
  Prisma,
  prisma,
  type CatalogEntity,
  type CatalogEntityKind,
  type CatalogEntitySource,
} from "@internal/db";
import { evaluateScorecardsForEntity } from "./scorecards/evaluator";
import { syncDevDocsForEntity } from "./devdocs/sync";

export type RegisterCatalogEntityInput = {
  kind: CatalogEntityKind;
  name: string;
  description?: string | null;
  ownerTeamIds?: string[] | null;
  repoUrl?: string | null;
  tags?: string[];
  yamlSpec?: Prisma.InputJsonValue | null;
  // Org the entity belongs to. Required on create; on update the existing
  // row's accountLogin is preserved (cross-org transfers are not allowed).
  accountLogin?: string;
};

export type RegisterCatalogEntityOptions = {
  source: CatalogEntitySource;
  sourceRef?: string | null;
  /** When true, skips DB writes and returns the would-be result. */
  dryRun?: boolean;
  /** GitHub App auto-import bookkeeping. */
  needsOnboarding?: boolean;
  installationId?: number | null;
  githubRepoId?: number | null;
};

export type RegisterCatalogEntityResult = {
  entityId: string;
  action: "created" | "updated" | "noop";
  before: CatalogEntity | null;
  after: CatalogEntity | null;
};

/** Single canonical write path for catalog entities. */
export async function registerCatalogEntity(
  input: RegisterCatalogEntityInput,
  opts: RegisterCatalogEntityOptions,
): Promise<RegisterCatalogEntityResult> {
  // Lookup precedence: githubRepoId is the stable id and survives renames, so
  // try it first when provided. Fall back to (name, kind) — both for legacy
  // callers and for the "claim" path where a manually-registered entity is
  // later observed via the App.
  const existing = await findExisting(input, opts);

  if (opts.dryRun) {
    return {
      entityId: existing?.id ?? "dry-run",
      action: existing ? "updated" : "created",
      before: existing,
      after: null,
    };
  }

  // unowned is derived: empty owner set on a discovery entity. We compute it
  // from the *resolved* ownerTeamIds (input override or existing) so a manual
  // edit that adds owners flips it false on the next write.
  const finalOwners =
    input.ownerTeamIds !== undefined
      ? (input.ownerTeamIds ?? [])
      : existing
        ? existing.owners.map((o) => o.teamId)
        : [];

  if (!existing) {
    // If the caller didn't pass an accountLogin explicitly (e.g. GitHub
    // auto-sync), derive it from the installationId so we don't force every
    // caller to look it up. Manual paths must pass it directly.
    let accountLogin = input.accountLogin ?? null;
    if (!accountLogin && opts.installationId != null) {
      accountLogin = await resolveAccountLoginByInstallation(opts.installationId);
    }
    if (!accountLogin) {
      throw new Error("accountLogin is required when creating a catalog entity");
    }
    await assertOwnerTeamsMatchOrg(finalOwners, accountLogin);
    const created = await prisma.catalogEntity.create({
      data: {
        kind: input.kind,
        name: input.name,
        description: input.description ?? null,
        repoUrl: input.repoUrl ?? null,
        tags: input.tags ?? [],
        source: opts.source,
        sourceRef: opts.sourceRef ?? null,
        accountLogin,
        yamlSpec: input.yamlSpec ?? Prisma.JsonNull,
        lastSeenAt: new Date(),
        needsOnboarding: opts.needsOnboarding ?? false,
        unowned: finalOwners.length === 0 && opts.source === "discovery",
        installationId: opts.installationId ?? null,
        githubRepoId: opts.githubRepoId ?? null,
        owners:
          finalOwners.length > 0
            ? { create: finalOwners.map((teamId) => ({ teamId })) }
            : undefined,
      },
    });
    fireScorecardEvaluation(created.id);
    fireDevDocsSync(created.id);
    return { entityId: created.id, action: "created", before: null, after: created };
  }

  const patch: Prisma.CatalogEntityUncheckedUpdateInput = {
    source: opts.source,
    sourceRef: opts.sourceRef ?? existing.sourceRef,
    lastSeenAt: new Date(),
    staleSince: null,
  };
  if (input.description !== undefined) patch.description = input.description;
  if (input.repoUrl !== undefined) patch.repoUrl = input.repoUrl;
  if (input.tags !== undefined) patch.tags = input.tags;
  if (input.yamlSpec !== undefined) {
    patch.yamlSpec = input.yamlSpec === null ? Prisma.JsonNull : input.yamlSpec;
  }
  // Allow App-driven updates to fix up name/kind when a repo is renamed —
  // only when we matched on githubRepoId (otherwise we'd silently rewrite
  // identity for a (name, kind) match).
  if (opts.githubRepoId != null && existing.githubRepoId === opts.githubRepoId) {
    if (input.name !== existing.name) patch.name = input.name;
    if (input.kind !== existing.kind) patch.kind = input.kind;
  }
  // Sticky downgrade for needsOnboarding: only flips true → false. Once a
  // valid yaml has been seen, a later stub-from-metadata write must not
  // resurrect the onboarding flag.
  if (opts.needsOnboarding === false && existing.needsOnboarding) {
    patch.needsOnboarding = false;
  }
  // Always reflect current owner count for unowned. Manual edits hit this
  // path too because the route layer calls registerCatalogEntity.
  patch.unowned = finalOwners.length === 0 && opts.source === "discovery";
  // Write-once for installationId / githubRepoId — *except* during revival.
  // When an entity is stale (uninstall-marked) and is being re-discovered by
  // a new installation, the new installationId must overwrite the old one,
  // otherwise the next disconnect of the new install can't find this entity
  // to re-stale.
  const isReviving = existing.staleSince !== null;
  if (opts.installationId != null && (existing.installationId == null || isReviving)) {
    patch.installationId = opts.installationId;
  }
  if (opts.githubRepoId != null && existing.githubRepoId == null) {
    patch.githubRepoId = opts.githubRepoId;
  }

  if (isNoopUpdate(existing, input, opts)) {
    return { entityId: existing.id, action: "noop", before: existing, after: existing };
  }

  if (input.ownerTeamIds !== undefined) {
    await assertOwnerTeamsMatchOrg(input.ownerTeamIds ?? [], existing.accountLogin);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.catalogEntity.update({
      where: { id: existing.id },
      data: patch,
    });
    if (input.ownerTeamIds !== undefined) {
      const desired = input.ownerTeamIds ?? [];
      await tx.catalogEntityOwner.deleteMany({ where: { entityId: existing.id } });
      if (desired.length > 0) {
        await tx.catalogEntityOwner.createMany({
          data: desired.map((teamId) => ({ entityId: existing.id, teamId })),
          skipDuplicates: true,
        });
      }
    }
    return row;
  });
  fireScorecardEvaluation(existing.id);
  fireDevDocsSync(existing.id);
  return { entityId: existing.id, action: "updated", before: existing, after: updated };
}

async function findExisting(input: RegisterCatalogEntityInput, opts: RegisterCatalogEntityOptions) {
  if (opts.githubRepoId != null) {
    const byRepoId = await prisma.catalogEntity.findUnique({
      where: { githubRepoId: opts.githubRepoId },
      include: { owners: true },
    });
    if (byRepoId) return byRepoId;
  }
  return prisma.catalogEntity.findUnique({
    where: { name_kind: { name: input.name, kind: input.kind } },
    include: { owners: true },
  });
}

function fireScorecardEvaluation(entityId: string): void {
  // Fire-and-forget: scorecard evaluation is a downstream concern that should
  // never fail or delay the catalog write path. Errors are swallowed; the
  // scheduled job (catalog.scorecardEvaluator) will reconcile state on its
  // next run.
  void evaluateScorecardsForEntity(entityId).catch(() => {});
}

function fireDevDocsSync(entityId: string): void {
  // Same fire-and-forget contract as scorecards. The scheduled
  // `catalog.devdocsSync` job reconciles anything missed here.
  void syncDevDocsForEntity(entityId).catch(() => {});
}

function isNoopUpdate(
  existing: CatalogEntity & { owners: { teamId: string }[] },
  input: RegisterCatalogEntityInput,
  opts: RegisterCatalogEntityOptions,
): boolean {
  if (existing.staleSince !== null) return false;
  if (existing.source !== opts.source) return false;
  if (
    opts.sourceRef !== undefined &&
    opts.sourceRef !== null &&
    existing.sourceRef !== opts.sourceRef
  ) {
    return false;
  }
  if (input.description !== undefined && input.description !== existing.description) return false;
  if (input.ownerTeamIds !== undefined) {
    const existingIds = existing.owners.map((o) => o.teamId).sort();
    const desiredIds = [...(input.ownerTeamIds ?? [])].sort();
    if (!sameStringArray(existingIds, desiredIds)) return false;
  }
  if (input.repoUrl !== undefined && input.repoUrl !== existing.repoUrl) return false;
  if (input.tags !== undefined && !sameStringArray(input.tags, existing.tags)) return false;
  if (input.yamlSpec !== undefined) return false;
  // App-import bookkeeping: a sync that would flip needsOnboarding off, or
  // populate installationId/githubRepoId on a row that's still missing them,
  // is a real write — not a noop.
  if (opts.needsOnboarding === false && existing.needsOnboarding) return false;
  if (opts.installationId != null && existing.installationId == null) return false;
  if (opts.githubRepoId != null && existing.githubRepoId == null) return false;
  // If a rename would propagate (githubRepoId match path), it's not a noop.
  if (opts.githubRepoId != null && existing.githubRepoId === opts.githubRepoId) {
    if (input.name !== existing.name) return false;
    if (input.kind !== existing.kind) return false;
  }
  // unowned drift: existing flag disagrees with the resolved owner count.
  if (opts.source === "discovery") {
    const finalOwners =
      input.ownerTeamIds !== undefined
        ? (input.ownerTeamIds ?? [])
        : existing.owners.map((o) => o.teamId);
    if (existing.unowned !== (finalOwners.length === 0)) return false;
  }
  return true;
}

function sameStringArray(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export class CrossOrgOwnerError extends Error {
  constructor(
    readonly entityAccountLogin: string,
    readonly mismatchedTeamIds: string[],
  ) {
    super(
      `Owner teams must belong to org "${entityAccountLogin}"; mismatched: ${mismatchedTeamIds.join(", ")}`,
    );
    this.name = "CrossOrgOwnerError";
  }
}

async function assertOwnerTeamsMatchOrg(teamIds: string[], accountLogin: string): Promise<void> {
  if (teamIds.length === 0) return;
  const teams = await prisma.team.findMany({
    where: { id: { in: teamIds } },
    select: { id: true, accountLogin: true },
  });
  const mismatched = teams.filter((t) => t.accountLogin !== accountLogin).map((t) => t.id);
  if (mismatched.length > 0) {
    throw new CrossOrgOwnerError(accountLogin, mismatched);
  }
}

async function resolveAccountLoginByInstallation(installationId: number): Promise<string | null> {
  const rows = await prisma.integration.findMany({
    where: { kind: "github" },
    select: { config: true },
  });
  for (const row of rows) {
    const cfg = row.config as { installationId?: unknown; accountLogin?: unknown } | null;
    if (
      cfg &&
      Number(cfg.installationId) === installationId &&
      typeof cfg.accountLogin === "string" &&
      cfg.accountLogin.length > 0
    ) {
      return cfg.accountLogin;
    }
  }
  return null;
}

/** Mark every entity with `repoUrl != null` whose `lastSeenAt` is older than `since` as stale. */
export async function markStaleEntities(since: Date): Promise<number> {
  const result = await prisma.catalogEntity.updateMany({
    where: {
      repoUrl: { not: null },
      lastSeenAt: { lt: since },
      staleSince: null,
    },
    data: { staleSince: new Date() },
  });
  return result.count;
}

export type RecordDriftInput = {
  entityId: string;
  kind: string;
  diff: Prisma.InputJsonValue;
  proposedBy: "agent" | "discovery";
  agentRunId?: string | null;
};

export async function recordDrift(input: RecordDriftInput): Promise<{ driftId: string }> {
  const created = await prisma.catalogDrift.create({
    data: {
      entityId: input.entityId,
      kind: input.kind,
      diff: input.diff,
      proposedBy: input.proposedBy,
      agentRunId: input.agentRunId ?? null,
    },
    select: { id: true },
  });
  return { driftId: created.id };
}
