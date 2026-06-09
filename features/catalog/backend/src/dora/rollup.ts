// Computes DORA snapshots from ingested Deployment and WorkflowRun rows over a rolling window.
// Production is any environment whose name contains "prod"; each metric is an approximation.

import { prisma } from "@internal/db";

const WINDOW_DAYS = 30;
const WINDOW_MS = WINDOW_DAYS * 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

function isProd(environment: string): boolean {
  return /prod/i.test(environment);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

export async function computeDoraSnapshotForEntity(entityId: string, now: Date = new Date()) {
  const periodEnd = now;
  const periodStart = new Date(now.getTime() - WINDOW_MS);

  const deployments = await prisma.deployment.findMany({
    where: { entityId, deployedAt: { gte: periodStart, lte: periodEnd } },
    orderBy: { deployedAt: "asc" },
  });
  const prodDeploys = deployments.filter((d) => d.deployedAt !== null && isProd(d.environment));
  const successDeploys = prodDeploys.filter((d) => d.state === "success");
  const failedDeploys = prodDeploys.filter((d) => d.state === "failure" || d.state === "error");

  // Deploy frequency: successful production deploys per day across the window.
  const deployFrequencyPerDay = successDeploys.length / WINDOW_DAYS;

  // Change failure rate: failed or errored production deploys over all production deploys.
  const changeFailureRate =
    prodDeploys.length === 0 ? 0 : failedDeploys.length / prodDeploys.length;

  // Lead time: hours from the earliest CI run that built a sha to its successful deploy.
  const runs = await prisma.workflowRun.findMany({
    where: { entityId, runStartedAt: { not: null } },
    orderBy: { runStartedAt: "asc" },
    select: { headSha: true, runStartedAt: true },
  });
  const earliestRunBySha = new Map<string, Date>();
  for (const r of runs) {
    if (r.runStartedAt && !earliestRunBySha.has(r.headSha)) {
      earliestRunBySha.set(r.headSha, r.runStartedAt);
    }
  }
  const leadTimes: number[] = [];
  for (const d of successDeploys) {
    const started = earliestRunBySha.get(d.sha);
    if (started && d.deployedAt) {
      const hours = (d.deployedAt.getTime() - started.getTime()) / HOUR_MS;
      if (hours >= 0) leadTimes.push(hours);
    }
  }
  const leadTimeHours = median(leadTimes);

  // MTTR: hours from a failed production deploy to the next successful deploy in the same environment.
  const mttrs: number[] = [];
  for (const fail of failedDeploys) {
    const recovery = successDeploys.find(
      (s) =>
        s.environment === fail.environment && s.deployedAt!.getTime() > fail.deployedAt!.getTime(),
    );
    if (recovery) {
      mttrs.push((recovery.deployedAt!.getTime() - fail.deployedAt!.getTime()) / HOUR_MS);
    }
  }
  const mttrHours = median(mttrs);

  return prisma.doraMetricsSnapshot.create({
    data: {
      entityId,
      periodStart,
      periodEnd,
      deployFrequencyPerDay,
      leadTimeHours,
      changeFailureRate,
      mttrHours,
    },
  });
}

export async function computeAllDora(): Promise<{ entities: number; snapshots: number }> {
  const entities = await prisma.catalogEntity.findMany({
    where: { staleSince: null },
    select: { id: true },
  });
  let snapshots = 0;
  for (const e of entities) {
    // Skip entities with no deployment data so we do not flood the table with empty snapshots.
    const deployCount = await prisma.deployment.count({ where: { entityId: e.id } });
    if (deployCount === 0) continue;
    await computeDoraSnapshotForEntity(e.id);
    snapshots += 1;
  }
  return { entities: entities.length, snapshots };
}
