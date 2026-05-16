import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageLayout, ConfirmDialog } from "@internal/shared-ui";
import { useApi } from "@internal/api-client/react";
import type {
  Agent,
  AgentRun,
  AgentToolDescriptor,
  ToolApprovalPolicy,
} from "@internal/shared-types";
import { ToolApprovalMatrix } from "./components/ToolApprovalMatrix";

// Tabbed detail page for one agent. Tabs: Overview · Model · Tools &
// Approvals · Permissions · Budgets · Runs.
//
// Read-mostly: each tab shows the current configuration plus targeted
// edit affordances (e.g. an inline approval-matrix editor on the Tools
// tab). Heavier edits route through the wizard's PATCH equivalent —
// not built in Pass 4 to keep scope manageable.
//
// The route is /agents/:userId, addressing the agent by its backing User
// id (Pass-1 schema). We fetch via api.agents.getByUser.

type TabKey = "overview" | "model" | "tools" | "permissions" | "budgets" | "runs";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "model", label: "Model" },
  { key: "tools", label: "Tools & Approvals" },
  { key: "permissions", label: "Permissions" },
  { key: "budgets", label: "Budgets" },
  { key: "runs", label: "Runs" },
];

export function AgentDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const api = useApi();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [tools, setTools] = useState<AgentToolDescriptor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("overview");
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const a = await api.agents.getByUser(userId);
      setAgent(a);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [api, userId]);

  useEffect(() => {
    void load();
    api.agents
      .listTools()
      .then((r) => setTools(r.items))
      .catch(() => {
        // tools list optional
      });
  }, [api, load]);

  async function savePolicy(next: ToolApprovalPolicy) {
    if (!agent) return;
    setSavingPolicy(true);
    try {
      const updated = await api.agents.update(agent.id, { toolApprovalPolicy: next });
      setAgent(updated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingPolicy(false);
    }
  }

  async function doDelete() {
    if (!agent) return;
    setDeleting(true);
    try {
      await api.agents.delete(agent.id);
      // Hard navigate so cached lists refresh.
      window.location.href = "/agents";
    } catch (e) {
      setError((e as Error).message);
      setDeleting(false);
    }
  }

  if (error)
    return (
      <PageLayout title="Agent">
        <p className="text-sm text-app-danger">{error}</p>
        <Link to="/agents" className="text-sm text-app-primary hover:underline">
          ← Back to agents
        </Link>
      </PageLayout>
    );
  if (!agent)
    return (
      <PageLayout title="Agent">
        <p className="text-sm text-app-text-muted">Loading…</p>
      </PageLayout>
    );

  return (
    <PageLayout
      title={agent.name}
      description={agent.description ?? "Agent configuration and run history."}
    >
      <div className="mb-4 flex items-center justify-between">
        <Badges agent={agent} />
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="rounded-md border border-app-danger/40 bg-app-surface px-3 py-1.5 text-sm text-app-danger hover:bg-app-danger hover:text-white"
        >
          Delete
        </button>
      </div>

      <Tabs current={tab} onChange={setTab} />

      <div className="mt-4 rounded-lg border border-app-border bg-app-surface p-5">
        {tab === "overview" && <OverviewTab agent={agent} />}
        {tab === "model" && <ModelTab agent={agent} />}
        {tab === "tools" && (
          <ToolsTab agent={agent} tools={tools} saving={savingPolicy} onSave={savePolicy} />
        )}
        {tab === "permissions" && <PermissionsTab agent={agent} />}
        {tab === "budgets" && <BudgetsTab agent={agent} />}
        {tab === "runs" && <RunsTab agent={agent} api={api} />}
      </div>

      <p className="mt-4">
        <Link to="/agents" className="text-sm text-app-text-muted hover:underline">
          ← Back to agents
        </Link>
      </p>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete agent?"
        message={`This will permanently delete "${agent.name}" and its backing User row, plus all conversations and runs. Cannot be undone.`}
        destructive
        busy={deleting}
        confirmLabel="Delete agent"
        onConfirm={() => void doDelete()}
        onClose={() => !deleting && setConfirmDelete(false)}
      />
    </PageLayout>
  );
}

// ---------------------------------------------------------------------------
// Tab panels
// ---------------------------------------------------------------------------

function OverviewTab({ agent }: { agent: Agent }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      <DefRow label="Status" value={agent.status} />
      <DefRow label="Kind" value={agent.kind} />
      <DefRow label="Created" value={new Date(agent.createdAt).toLocaleString()} />
      <DefRow label="Updated" value={new Date(agent.updatedAt).toLocaleString()} />
      <DefRow label="Backing user id" value={agent.userId} mono />
      <DefRow label="Agent id" value={agent.id} mono />
      <div className="sm:col-span-2">
        <dt className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">
          System prompt
        </dt>
        <dd>
          <pre className="mt-1 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md border border-app-border bg-app-surface-hover p-3 font-mono text-xs">
            {agent.instructions}
          </pre>
        </dd>
      </div>
    </dl>
  );
}

function ModelTab({ agent }: { agent: Agent }) {
  return (
    <dl className="space-y-3 text-sm">
      <DefRow label="Adapter" value={agent.modelProvider} />
      <DefRow
        label="Model"
        value={
          agent.llmModel
            ? `${agent.llmModel.displayName} (${agent.llmModel.provider.displayName})`
            : agent.modelId
        }
      />
      <DefRow label="Model id" value={agent.modelId} mono />
      <DefRow
        label="API key source"
        value={
          agent.secretId ? `Secret override (${agent.secretId})` : "Provider env var (default)"
        }
        mono={!!agent.secretId}
      />
    </dl>
  );
}

function ToolsTab({
  agent,
  tools,
  saving,
  onSave,
}: {
  agent: Agent;
  tools: AgentToolDescriptor[];
  saving: boolean;
  onSave: (next: ToolApprovalPolicy) => void;
}) {
  const [draft, setDraft] = useState<ToolApprovalPolicy>(agent.toolApprovalPolicy);
  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(agent.toolApprovalPolicy),
    [draft, agent.toolApprovalPolicy],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-app-text">Tool approval policy</h3>
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={() => onSave(draft)}
          className="rounded-md bg-app-primary px-3 py-1.5 text-sm font-medium text-app-primary-on hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save policy"}
        </button>
      </div>
      <ToolApprovalMatrix
        policy={draft}
        enabledToolIds={agent.toolIds}
        tools={tools}
        onChange={setDraft}
      />
    </div>
  );
}

function PermissionsTab({ agent }: { agent: Agent }) {
  return (
    <dl className="space-y-3 text-sm">
      <DefRow
        label="On-behalf-of required"
        value={
          agent.onBehalfOfRequired
            ? "Yes (every action needs an invoking human)"
            : "No (autonomous)"
        }
      />
      <DefRow
        label="Owning team id"
        value={agent.owningTeamId ?? "— Personal —"}
        mono={!!agent.owningTeamId}
      />
      <DefRow
        label="Primary contact (owner) user id"
        value={agent.ownerUserId ?? "—"}
        mono={!!agent.ownerUserId}
      />
      <p className="text-xs text-app-text-muted">
        The agent's role and team memberships live on its backing User row. Manage those from Admin
        → Users (admin only).
      </p>
    </dl>
  );
}

function BudgetsTab({ agent }: { agent: Agent }) {
  return (
    <dl className="space-y-3 text-sm">
      <DefRow label="Per-run tool calls (max)" value={String(agent.maxToolCalls)} />
      <DefRow
        label="Per-run token budget"
        value={agent.tokenBudget == null ? "unlimited" : String(agent.tokenBudget)}
      />
      <DefRow
        label="Monthly token budget"
        value={
          agent.tokenBudgetMonthly == null
            ? "unlimited"
            : `${agent.tokenBudgetUsed} / ${agent.tokenBudgetMonthly}`
        }
      />
      <DefRow
        label="Monthly cost budget"
        value={
          agent.costBudgetMonthly == null
            ? "unlimited"
            : `$${agent.costBudgetUsed} / $${agent.costBudgetMonthly}`
        }
      />
    </dl>
  );
}

function RunsTab({ agent, api }: { agent: Agent; api: ReturnType<typeof useApi> }) {
  const [runs, setRuns] = useState<AgentRun[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Use the existing /:id endpoint which includes runs in the response.
    api.agents
      .get(agent.id)
      .then((full) => {
        const fullRuns = (full as Agent & { runs?: AgentRun[] }).runs;
        setRuns(fullRuns ?? []);
      })
      .catch((e) => setError((e as Error).message));
  }, [api, agent.id]);

  if (error) return <p className="text-sm text-app-danger">{error}</p>;
  if (!runs) return <p className="text-sm text-app-text-muted">Loading…</p>;
  if (runs.length === 0) return <p className="text-sm text-app-text-muted">No runs yet.</p>;

  return (
    <table className="w-full text-sm">
      <thead className="border-b border-app-border">
        <tr className="text-left text-xs uppercase tracking-wide text-app-text-muted">
          <th className="px-2 py-2">Started</th>
          <th className="px-2 py-2">Status</th>
          <th className="px-2 py-2">Tokens</th>
          <th className="px-2 py-2">Cost</th>
          <th className="px-2 py-2">Error</th>
        </tr>
      </thead>
      <tbody>
        {runs.map((r) => (
          <tr key={r.id} className="border-t border-app-border">
            <td className="px-2 py-2 text-app-text-muted">
              {new Date(r.startedAt).toLocaleString()}
            </td>
            <td className="px-2 py-2">{r.status}</td>
            <td className="px-2 py-2 text-app-text-muted">
              {(r.tokensInput ?? 0) + (r.tokensOutput ?? 0)}
            </td>
            <td className="px-2 py-2 text-app-text-muted">
              {r.costUsd != null ? `$${r.costUsd}` : "—"}
            </td>
            <td className="px-2 py-2 text-xs text-app-danger">{r.error ?? ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------------------
// Chrome
// ---------------------------------------------------------------------------

function Tabs({ current, onChange }: { current: TabKey; onChange: (k: TabKey) => void }) {
  return (
    <div className="flex gap-1 border-b border-app-border">
      {TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
            current === t.key
              ? "border-app-primary text-app-text"
              : "border-transparent text-app-text-muted hover:text-app-text"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function Badges({ agent }: { agent: Agent }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="rounded-full border border-app-border bg-app-surface px-2 py-0.5 text-app-text-muted">
        {agent.modelProvider}
      </span>
      {agent.llmModel && (
        <span className="rounded-full border border-app-border bg-app-surface px-2 py-0.5 text-app-text-muted">
          {agent.llmModel.displayName}
        </span>
      )}
      <span
        className={`rounded-full px-2 py-0.5 ${
          agent.status === "running"
            ? "bg-app-warning/10 text-app-warning"
            : agent.status === "failed"
              ? "bg-app-danger/10 text-app-danger"
              : "bg-app-surface text-app-text-muted"
        }`}
      >
        {agent.status}
      </span>
      {!agent.onBehalfOfRequired && (
        <span className="rounded-full bg-app-warning/10 px-2 py-0.5 text-app-warning">
          autonomous
        </span>
      )}
    </div>
  );
}

function DefRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">{label}</dt>
      <dd className={`text-app-text ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}
