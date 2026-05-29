import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@internal/shared-ui";
import { useApi } from "@internal/api-client/react";
import type { AgentApprovalRequestDto } from "@internal/shared-types";

// ApprovalInbox, pending tool-call approvals from autonomous (non-chat)
// agent runs. Hosted by AgentApprovalsPage at /agents/approvals. Each row
// shows the requesting agent, the tool, the parsed arguments, and approve
// / reject buttons that route to /api/agent-approvals/:id/decision.
//
// Approving doesn't re-execute the tool, the autonomous run that wrote
// this row is responsible for picking up the decision on its next
// iteration. Rejecting marks the row final so the run knows not to
// retry.

interface ConfirmTarget {
  id: string;
  decision: "approved" | "rejected";
  agentName: string;
  toolName: string;
}

export function ApprovalInbox() {
  const api = useApi();
  const [rows, setRows] = useState<AgentApprovalRequestDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmTarget | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.agentApprovals.list("pending");
      setRows(r.items);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide() {
    if (!confirm) return;
    setBusyId(confirm.id);
    try {
      await api.agentApprovals.decide(confirm.id, confirm.decision);
      setRows((prev) => prev?.filter((r) => r.id !== confirm.id) ?? null);
      setConfirm(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  if (error)
    return (
      <div className="rounded-md border border-app-danger bg-app-surface px-3 py-2 text-sm text-app-danger">
        {error}
      </div>
    );
  if (!rows) return <p className="text-sm text-app-text-muted">Loading…</p>;
  if (rows.length === 0)
    return (
      <p className="text-sm text-app-text-muted">
        No pending approvals. When an autonomous agent hits a tool with{" "}
        <code className="text-app-text">requires_approval</code>, the request lands here.
      </p>
    );

  return (
    <>
      <div className="space-y-2">
        {rows.map((r) => (
          <div
            key={r.id}
            className="rounded-md border border-app-border bg-app-surface p-3 text-sm"
          >
            <div className="mb-2 flex items-center justify-between">
              <div>
                <span className="font-medium text-app-text">{r.agentName}</span>
                <span className="ml-2 text-xs text-app-text-muted">→ {r.toolName}</span>
              </div>
              <div className="text-xs text-app-text-muted">
                {new Date(r.requestedAt).toLocaleString()}
              </div>
            </div>
            <pre className="mb-2 max-h-40 overflow-y-auto whitespace-pre-wrap rounded bg-app-surface-hover p-2 font-mono text-xs">
              {JSON.stringify(r.parsedParams, null, 2)}
            </pre>
            <div className="flex items-center justify-between">
              <span className="text-xs text-app-text-muted">
                Expires {new Date(r.expiresAt).toLocaleString()}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() =>
                    setConfirm({
                      id: r.id,
                      decision: "rejected",
                      agentName: r.agentName,
                      toolName: r.toolName,
                    })
                  }
                  className="rounded-md border border-app-border bg-app-surface px-3 py-1.5 text-xs text-app-text-muted hover:bg-app-surface-hover disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() =>
                    setConfirm({
                      id: r.id,
                      decision: "approved",
                      agentName: r.agentName,
                      toolName: r.toolName,
                    })
                  }
                  className="rounded-md bg-app-primary px-3 py-1.5 text-xs font-medium text-app-primary-on hover:opacity-90 disabled:opacity-50"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={confirm != null}
        title={confirm?.decision === "approved" ? "Approve tool call?" : "Reject tool call?"}
        message={
          confirm
            ? `${confirm.decision === "approved" ? "Approving" : "Rejecting"} ${confirm.agentName}'s call to ${confirm.toolName}. The autonomous run that wrote this row picks up the decision on its next iteration.`
            : ""
        }
        destructive={confirm?.decision === "rejected"}
        busy={busyId != null}
        confirmLabel={confirm?.decision === "approved" ? "Approve" : "Reject"}
        onConfirm={() => void decide()}
        onClose={() => busyId == null && setConfirm(null)}
      />
    </>
  );
}
