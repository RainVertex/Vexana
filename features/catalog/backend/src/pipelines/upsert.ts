// Webhook-driven ingestion for GitHub Actions runs and deployments.
//
// Both `workflow_run` and `deployment` / `deployment_status` events arrive at
// the existing /integrations/github/app-webhook receiver and fan out from
// dispatch() in ../github-sync/webhook.ts. Each handler:
//   1. Resolves the repository back to a CatalogEntity via githubRepoId
//      (the same join key bulk-sync uses).
//   2. Upserts on the GitHub-stable id (run_id / deployment_id), so re-deliveries
//      and reconciliation from the cron sweep converge on the same row.
//   3. Touches PipelineSyncCursor.lastWebhookAt so operators can see when
//      events last flowed.
//
// Unknown repos are silently no-op'd — that's expected for installations whose
// catalog entries haven't been created yet, and for repos outside our catalog.

import { prisma } from "@internal/db";

interface RepoRef {
  id: number;
}

function readRepo(payload: Record<string, unknown>): RepoRef | null {
  const repo = payload.repository as Record<string, unknown> | undefined;
  if (!repo || typeof repo !== "object") return null;
  const id = repo.id;
  if (typeof id !== "number" || !Number.isFinite(id)) return null;
  return { id };
}

async function findEntityIdByRepoId(repoId: number): Promise<string | null> {
  const row = await prisma.catalogEntity.findUnique({
    where: { githubRepoId: repoId },
    select: { id: true },
  });
  return row?.id ?? null;
}

async function touchWebhookCursor(entityId: string): Promise<void> {
  const now = new Date();
  await prisma.pipelineSyncCursor.upsert({
    where: { entityId },
    create: { entityId, lastWebhookAt: now },
    update: { lastWebhookAt: now },
  });
}

// ---------------------------------------------------------------------------
// workflow_run
// ---------------------------------------------------------------------------
//
// Payload shape (subset):
//   action: "requested" | "in_progress" | "completed"
//   workflow_run: {
//     id, name, path, run_number, event, status, conclusion,
//     head_branch, head_sha, html_url, run_started_at, updated_at,
//     actor: { login }, ...
//   }
//   repository: { id, ... }

interface WorkflowRunPayload {
  id: number;
  name?: string | null;
  path?: string | null;
  display_title?: string | null;
  run_number?: number | null;
  event?: string | null;
  status?: string | null;
  conclusion?: string | null;
  head_branch?: string | null;
  head_sha?: string | null;
  html_url?: string | null;
  run_started_at?: string | null;
  updated_at?: string | null;
  actor?: { login?: string | null } | null;
}

function readWorkflowRun(payload: Record<string, unknown>): WorkflowRunPayload | null {
  const wr = payload.workflow_run as WorkflowRunPayload | undefined;
  if (!wr || typeof wr !== "object") return null;
  if (typeof wr.id !== "number" || !Number.isFinite(wr.id)) return null;
  return wr;
}

export async function upsertWorkflowRun(payload: Record<string, unknown>): Promise<void> {
  const repo = readRepo(payload);
  const wr = readWorkflowRun(payload);
  if (!repo || !wr) return;

  const entityId = await findEntityIdByRepoId(repo.id);
  if (!entityId) {
    // Repo isn't registered as a catalog entity. Common for installations
    // whose catalog import hasn't run yet, or repos outside our catalog —
    // silently drop.
    return;
  }

  const data = {
    entityId,
    workflowName: wr.name ?? wr.display_title ?? "(unnamed)",
    workflowPath: wr.path ?? "",
    runNumber: typeof wr.run_number === "number" ? wr.run_number : 0,
    event: wr.event ?? "unknown",
    status: wr.status ?? "queued",
    conclusion: wr.conclusion ?? null,
    headBranch: wr.head_branch ?? null,
    headSha: wr.head_sha ?? "",
    actorLogin: wr.actor?.login ?? null,
    htmlUrl: wr.html_url ?? "",
    runStartedAt: wr.run_started_at ? new Date(wr.run_started_at) : null,
    runUpdatedAt: wr.updated_at ? new Date(wr.updated_at) : null,
  };

  await prisma.workflowRun.upsert({
    where: { githubRunId: BigInt(wr.id) },
    create: { ...data, githubRunId: BigInt(wr.id) },
    update: data,
  });
  await touchWebhookCursor(entityId);
}

// ---------------------------------------------------------------------------
// deployment / deployment_status
// ---------------------------------------------------------------------------
//
// The two events overlap intentionally:
//   - `deployment` carries the canonical Deployment fields (env, ref, sha, ...)
//     but no state; new deployments arrive as `state: "pending"`.
//   - `deployment_status` carries the latest status for an existing deployment
//     id; this is what flips state to success/failure/inactive.
// We upsert on `deployment.id` from either event. For deployment_status we
// also overwrite state + deployedAt; for deployment we set state only on
// create (don't clobber a status that already landed).

interface DeploymentPayload {
  id: number;
  environment?: string | null;
  ref?: string | null;
  sha?: string | null;
  description?: string | null;
  url?: string | null;
  creator?: { login?: string | null } | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface DeploymentStatusPayload {
  state?: string | null;
  description?: string | null;
  log_url?: string | null;
  environment_url?: string | null;
  target_url?: string | null;
  creator?: { login?: string | null } | null;
  created_at?: string | null;
  updated_at?: string | null;
}

function readDeployment(payload: Record<string, unknown>): DeploymentPayload | null {
  const d = payload.deployment as DeploymentPayload | undefined;
  if (!d || typeof d !== "object") return null;
  if (typeof d.id !== "number" || !Number.isFinite(d.id)) return null;
  return d;
}

function readDeploymentStatus(payload: Record<string, unknown>): DeploymentStatusPayload | null {
  const ds = payload.deployment_status as DeploymentStatusPayload | undefined;
  if (!ds || typeof ds !== "object") return null;
  return ds;
}

function htmlUrlFromDeploymentUrl(apiUrl: string | null): string | null {
  if (!apiUrl) return null;
  // Convert /repos/<owner>/<repo>/deployments/<id> → /<owner>/<repo>/deployments/<id>
  const m = /^https:\/\/api\.github\.com\/repos\/(.+?)\/deployments\/(\d+)/.exec(apiUrl);
  if (!m) return null;
  return `https://github.com/${m[1]}/deployments/${m[2]}`;
}

export async function upsertDeployment(payload: Record<string, unknown>): Promise<void> {
  const repo = readRepo(payload);
  const dep = readDeployment(payload);
  if (!repo || !dep) return;

  const entityId = await findEntityIdByRepoId(repo.id);
  if (!entityId) return;

  const status = readDeploymentStatus(payload);
  const htmlUrl = htmlUrlFromDeploymentUrl(dep.url ?? null);

  const create = {
    entityId,
    githubDeploymentId: BigInt(dep.id),
    environment: dep.environment ?? "unknown",
    ref: dep.ref ?? "",
    sha: dep.sha ?? "",
    state: status?.state ?? "pending",
    actorLogin: status?.creator?.login ?? dep.creator?.login ?? null,
    description: status?.description ?? dep.description ?? null,
    htmlUrl,
    logUrl: status?.log_url ?? status?.target_url ?? null,
    deployedAt: status?.updated_at
      ? new Date(status.updated_at)
      : dep.updated_at
        ? new Date(dep.updated_at)
        : null,
  };

  // On update we only overwrite fields the new event actually carries.
  // A `deployment` event without a deployment_status block must not clobber a
  // state already advanced by an earlier deployment_status delivery.
  const update: Partial<typeof create> = {
    environment: create.environment,
    ref: create.ref,
    sha: create.sha,
    actorLogin: create.actorLogin,
    description: create.description,
    htmlUrl: create.htmlUrl,
  };
  if (status) {
    update.state = create.state;
    update.logUrl = create.logUrl;
    update.deployedAt = create.deployedAt;
  }

  await prisma.deployment.upsert({
    where: { githubDeploymentId: BigInt(dep.id) },
    create,
    update,
  });
  await touchWebhookCursor(entityId);
}
