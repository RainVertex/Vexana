import { Link } from "react-router-dom";
import { PageLayout } from "@internal/shared-ui";
import { ApprovalInbox } from "./components/ApprovalInbox";

// Top-level page hosting the ApprovalInbox component. Reachable from the
// Agents sidebar at /agents/approvals.
export function AgentApprovalsPage() {
  return (
    <PageLayout
      title="Agent approvals"
      description="Pending tool calls from autonomous agent runs awaiting your decision."
    >
      <ApprovalInbox />
      <p className="mt-4">
        <Link to="/agents" className="text-sm text-app-text-muted hover:underline">
          ← Back to agents
        </Link>
      </p>
    </PageLayout>
  );
}
