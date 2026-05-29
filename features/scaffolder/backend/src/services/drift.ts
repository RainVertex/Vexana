import { prisma } from "@internal/db";
import { buildPlan, templateContentHash, type Actor } from "@internal/scaffolder-core";
import { getActionRegistry, getTemplateRegistry } from "./registry";
import { buildPlanCtx } from "./plan-ctx";
import { loadCapabilityPolicy } from "./policy";

// One-pass drift detection. For every active binding (optionally filtered to a
// single template), re-runs plan() against the current template module + the
// stored params. If the resulting plan's mode is anything other than no-op
// open a ScaffoldDrift row. Existing open drifts for the same (binding
// fromVersion, toVersion) are coalesced.

export interface DriftSweepInput {
  liveRepoRoot: string;
  /** Restrict to a specific templateId. otherwise scans all active bindings. */
  templateId?: string;
  /** Sample drift detection actor used for replans triggered by the system. */
  systemUserId?: string;
}

export interface DriftSweepResult {
  bindingsScanned: number;
  driftsOpened: number;
  driftsCoalesced: number;
  errors: number;
}

const SYSTEM_ACTOR_FALLBACK_ID = "system";

function systemActor(userId: string | undefined): Actor {
  return {
    kind: "agent",
    userId: userId ?? SYSTEM_ACTOR_FALLBACK_ID,
    teamIds: [],
  };
}

export async function runDriftSweep(input: DriftSweepInput): Promise<DriftSweepResult> {
  const out: DriftSweepResult = {
    bindingsScanned: 0,
    driftsOpened: 0,
    driftsCoalesced: 0,
    errors: 0,
  };

  const where = {
    active: true,
    ...(input.templateId ? { templateId: input.templateId } : {}),
  };
  const bindings = await prisma.scaffoldBinding.findMany({
    where,
    orderBy: { appliedAt: "asc" },
  });
  out.bindingsScanned = bindings.length;

  const registry = getTemplateRegistry();
  const actions = getActionRegistry();
  const policy = loadCapabilityPolicy();
  const actor = systemActor(input.systemUserId);

  for (const binding of bindings) {
    const template = registry.get(binding.templateId);
    if (!template) {
      out.errors++;
      continue;
    }

    const contentHash = templateContentHash({
      templateId: template.metadata.id,
      version: template.metadata.version,
      moduleSource: template.metadata.id + template.metadata.version,
    });

    // No version bump and no content change → nothing could have drifted.
    if (
      binding.templateVersion === template.metadata.version &&
      binding.templateHash === contentHash
    ) {
      continue;
    }

    try {
      const planCtx = buildPlanCtx({
        actor,
        target: binding.target as "main" | "branch" | "worktree",
        liveRepoRoot: input.liveRepoRoot,
      });
      const built = await buildPlan({
        template,
        rawParams: binding.params,
        actor,
        ctx: planCtx,
        templateContentHash: contentHash,
        target: binding.target as "main" | "branch" | "worktree",
        bindingId: binding.id,
        policy,
        actions,
      });

      // Drift exists only if the rebuilt plan would do something meaningful.
      if (built.plan.mode === "no-op") {
        // Bring the binding's templateHash up to date so we don't re-scan the
        // same delta indefinitely. Version stays as-is until the plan is
        // applied. this just records "we've considered this version a no-op".
        await prisma.scaffoldBinding.update({
          where: { id: binding.id },
          data: { templateHash: contentHash },
        });
        continue;
      }

      const fromVersion = binding.templateVersion;
      const toVersion = template.metadata.version;
      const existingOpen = await prisma.scaffoldDrift.findFirst({
        where: {
          bindingId: binding.id,
          status: "open",
          fromVersion,
          toVersion,
        },
        select: { id: true },
      });

      if (existingOpen) {
        out.driftsCoalesced++;
        continue;
      }

      await prisma.scaffoldDrift.create({
        data: {
          bindingId: binding.id,
          fromVersion,
          toVersion,
          diffSummary: {
            stepCount: built.plan.steps.length,
            actions: built.plan.steps.map((s) => s.action),
            mutationKinds: Array.from(
              new Set(built.plan.steps.flatMap((s) => s.mutations.map((m) => m.kind))),
            ),
          } as never,
          status: "open",
        },
      });
      out.driftsOpened++;
    } catch {
      out.errors++;
    }
  }

  return out;
}

// Records the current template content hash for every registered template.
// Returns the set of templateIds whose hash differs from the previous snapshot
// (or which were unseen), those are the ones that need an immediate sweep.
export async function reconcileTemplateHashSnapshots(): Promise<{
  changed: string[];
  unchanged: number;
}> {
  const registry = getTemplateRegistry();
  const templates = registry.list();
  const changed: string[] = [];
  let unchanged = 0;

  for (const template of templates) {
    const hash = templateContentHash({
      templateId: template.metadata.id,
      version: template.metadata.version,
      moduleSource: template.metadata.id + template.metadata.version,
    });
    const existing = await prisma.templateHashSnapshot.findUnique({
      where: { templateId: template.metadata.id },
    });
    if (existing && existing.templateHash === hash) {
      unchanged++;
      continue;
    }
    await prisma.templateHashSnapshot.upsert({
      where: { templateId: template.metadata.id },
      create: {
        templateId: template.metadata.id,
        templateVersion: template.metadata.version,
        templateHash: hash,
      },
      update: {
        templateVersion: template.metadata.version,
        templateHash: hash,
        observedAt: new Date(),
      },
    });
    changed.push(template.metadata.id);
  }

  return { changed, unchanged };
}
