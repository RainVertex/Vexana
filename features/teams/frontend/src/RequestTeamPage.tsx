import { useNavigate } from "react-router-dom";
import { PageLayout } from "@internal/shared-ui";
import { useTranslation } from "@internal/i18n";
import { RequestTeamForm } from "./RequestTeamForm";

// Full-page (non-modal) wrapper that renders the team-request form.
export function RequestTeamPage() {
  const navigate = useNavigate();
  const { t } = useTranslation("teams");
  return (
    <PageLayout title={t("page.requestTeamTitle")} description={t("page.requestTeamDescription")}>
      <RequestTeamForm variant="page" onSubmitted={() => navigate("/requests/team")} />
    </PageLayout>
  );
}
