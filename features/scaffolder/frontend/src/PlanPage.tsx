import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageLayout } from "@internal/shared-ui";
import { useApi } from "@internal/api-client/react";
import type {
  CurrentUser,
  ScaffolderMutation,
  ScaffolderPlan,
  ScaffolderPlanStep,
} from "@internal/shared-types";
import { DiffView } from "./components/DiffView";

export function PlanPage() {
  const { planId } = useParams<{ planId: string }>();
  const api = useApi();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<ScaffolderPlan | null>(null);
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    if (!planId) return;
    api.scaffolder
      .getPlan(planId)
      .then(setPlan)
      .catch((err) => setError(err.message ?? "Failed to load plan"));
    api.auth
      .me()
      .then(setMe)
      .catch(() => setMe(null));
  }, [api, planId]);

  async function approveAll() {
    if (!plan || plan.requiresApproval.length === 0) return;
    setApproving(true);
    setError(null);
    try {
      const result = await api.scaffolder.approvePlan(
        plan.id,
        plan.requiresApproval.map((r) => r.capability),
      );
      if (result.plan) setPlan(result.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setApproving(false);
    }
  }

  async function apply(dryRun: boolean) {
    if (!plan) return;
    setApplying(true);
    setError(null);
    try {
      const result = await api.scaffolder.applyPlan(plan.id, { dryRun });
      navigate(`/scaffolder/tasks/${result.taskId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Apply failed");
    } finally {
      setApplying(false);
    }
  }

  if (error && !plan)
    return (
      <PageLayout title="Plan">
        <p className="text-sm text-red-600">{error}</p>
      </PageLayout>
    );
  if (!plan)
    return (
      <PageLayout title="Plan">
        <p className="text-sm text-app-text-muted">Loading…</p>
      </PageLayout>
    );

  const expired = new Date(plan.expiresAt).getTime() <= Date.now();
  const blocked = plan.requiresApproval.length > 0 || expired;
  const canApprove = me?.role === "admin" && plan.requiresApproval.length > 0;

  return (
    <PageLayout
      title={`Plan: ${plan.templateId}`}
      description={`v${plan.templateVersion} · ${plan.mode} · target=${plan.target}`}
      actions={
        <>
          {canApprove && (
            <button
              type="button"
              disabled={approving}
              onClick={approveAll}
              className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
            >
              {approving ? "Approving…" : `Approve ${plan.requiresApproval.length}`}
            </button>
          )}
          <button
            type="button"
            disabled={applying}
            onClick={() => apply(true)}
            className="rounded-md border border-app-border px-3 py-1.5 text-sm text-app-text-muted hover:bg-app-surface-hover disabled:opacity-50"
          >
            Dry run
          </button>
          <button
            type="button"
            disabled={applying || blocked}
            onClick={() => apply(false)}
            className="rounded-md bg-app-primary px-3 py-1.5 text-sm font-medium text-app-primary-on disabled:opacity-50"
          >
            {applying ? "Applying…" : "Apply"}
          </button>
        </>
      }
    >
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="mb-4 rounded-md border border-app-border bg-app-surface p-3 text-xs">
        <div className="flex flex-wrap gap-3 text-app-text-muted">
          <span>
            Mode: <span className="font-medium text-app-text">{plan.mode}</span>
          </span>
          <span>
            Capabilities:{" "}
            {plan.capabilities.length === 0 ? (
              <span className="text-app-text-muted">none</span>
            ) : (
              plan.capabilities.map((c) => (
                <span
                  key={c}
                  className="ml-1 rounded bg-app-surface-hover px-1.5 py-0.5 text-[10px]"
                >
                  {c}
                </span>
              ))
            )}
          </span>
          {plan.irreversible && (
            <span className="rounded bg-rose-100 px-1.5 py-0.5 text-rose-700">
              Contains irreversible actions
            </span>
          )}
          {expired && (
            <span className="rounded bg-rose-100 px-1.5 py-0.5 text-rose-700">Expired</span>
          )}
        </div>
        {plan.requiresApproval.length > 0 && (
          <div className="mt-2 rounded bg-amber-50 p-2 text-amber-800">
            Requires approval for:{" "}
            {plan.requiresApproval.map((r) => (
              <span key={r.capability} className="mr-2 font-mono">
                {r.capability}
              </span>
            ))}
          </div>
        )}
      </div>

      <ol className="space-y-4">
        {plan.steps.map((step) => (
          <PlanStepCard key={step.stepId} step={step} />
        ))}
      </ol>
    </PageLayout>
  );
}

function PlanStepCard({ step }: { step: ScaffolderPlanStep }) {
  return (
    <li className="rounded-md border border-app-border bg-app-surface">
      <div className="flex items-center justify-between border-b border-app-border px-3 py-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="rounded bg-app-surface-hover px-1.5 py-0.5 font-mono">
            {step.action}
          </span>
          <span className="text-app-text-muted">{step.stepId}</span>
        </div>
        <div className="flex items-center gap-2 text-app-text-muted">
          <span>{step.matched}</span>
          {!step.reversible && (
            <span className="rounded bg-rose-100 px-1.5 py-0.5 text-rose-700">irreversible</span>
          )}
        </div>
      </div>
      <div className="space-y-3 p-3">
        {step.mutations.length === 0 && (
          <p className="text-xs text-app-text-muted">No mutations.</p>
        )}
        {step.mutations.map((m, i) => (
          <MutationView key={i} mutation={m} />
        ))}
      </div>
    </li>
  );
}

function MutationView({ mutation }: { mutation: ScaffolderMutation }) {
  switch (mutation.kind) {
    case "fs.write":
      return (
        <div>
          <div className="mb-1 text-xs font-mono text-app-text">{mutation.path}</div>
          <DiffView
            path={mutation.path}
            before={mutation.contentDiff.before}
            after={mutation.contentDiff.after}
          />
        </div>
      );
    case "fs.delete":
      return (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs">
          <span className="font-medium text-rose-700">delete</span>{" "}
          <span className="font-mono">{mutation.path}</span>
        </div>
      );
    case "fs.rename":
      return (
        <div className="rounded-md border border-app-border bg-app-surface-hover p-2 text-xs font-mono">
          rename {mutation.from} → {mutation.to}
        </div>
      );
    case "db.upsert":
      return (
        <div className="rounded-md border border-app-border bg-app-surface-hover p-2 text-xs">
          <div className="font-medium">db.upsert {mutation.model}</div>
          <pre className="mt-1 overflow-x-auto text-[10px]">
            {JSON.stringify(mutation.data, null, 2)}
          </pre>
        </div>
      );
    case "catalog.register":
      return (
        <div className="rounded-md border border-app-border bg-app-surface-hover p-2 text-xs">
          <div className="font-medium">catalog.register</div>
          <pre className="mt-1 overflow-x-auto text-[10px]">
            {JSON.stringify(mutation.entity, null, 2)}
          </pre>
        </div>
      );
    case "github.createRepo":
      return (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">
          <span className="font-medium">⚠ irreversible</span> github.createRepo {mutation.org}/
          {mutation.name} ({mutation.visibility})
        </div>
      );
    case "github.push":
      return (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">
          <span className="font-medium">⚠ irreversible</span> github.push to {mutation.remoteUrl} ·{" "}
          {mutation.branch} · {mutation.fileCount} files
        </div>
      );
    case "debug.log":
      return (
        <div className="rounded-md border border-app-border bg-app-surface-hover p-2 text-xs font-mono">
          log: {mutation.message}
        </div>
      );
    default:
      return null;
  }
}
