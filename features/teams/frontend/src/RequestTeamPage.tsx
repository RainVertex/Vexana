import { useNavigate } from "react-router-dom";
import { PageLayout } from "@internal/shared-ui";
import { RequestTeamForm } from "./RequestTeamForm";

/** Self-service initiate page: the team-request form rendered as a full page (no modal). */
export function RequestTeamPage() {
  const navigate = useNavigate();
  return (
    <PageLayout
      title="Request a team"
      description="Submit a request for an admin to review. Optionally mirror the new team to a connected GitHub org."
    >
      <RequestTeamForm variant="page" onSubmitted={() => navigate("/requests/team")} />
    </PageLayout>
  );
}
