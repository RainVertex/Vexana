import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageLayout } from "@internal/shared-ui";
import { useApi } from "@internal/api-client/react";
import { useTranslation } from "@internal/i18n";
import type { CurrentUser, TeamSummary } from "@internal/shared-types";
import { RequestTeamDialog } from "./RequestTeamDialog";

export function TeamsPage() {
  const api = useApi();
  const navigate = useNavigate();
  const { t } = useTranslation("teams");
  const [items, setItems] = useState<TeamSummary[] | null>(null);
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [showAllOrgs, setShowAllOrgs] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.teams.list({ allOrgs: showAllOrgs });
      setItems(res.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.failedToLoadTeams"));
    }
  }, [api, showAllOrgs, t]);

  useEffect(() => {
    void load();
    api.auth
      .me()
      .then(setMe)
      .catch(() => setMe(null));
  }, [api, load]);

  const isAdmin = me?.role === "admin";

  return (
    <PageLayout
      title={t("page.teamsTitle")}
      description={t("page.teamsDescription")}
      actions={
        <>
          <button
            type="button"
            onClick={() => setRequestOpen(true)}
            className="rounded-md border border-app-border px-3 py-1 text-sm text-app-text hover:bg-app-surface-hover"
          >
            {t("actions.requestTeam")}
          </button>
          {isAdmin && (
            <Link
              to="/admin/team-requests"
              className="rounded-md bg-app-primary px-3 py-1 text-sm text-app-primary-on"
            >
              {t("actions.reviewRequests")}
            </Link>
          )}
        </>
      }
    >
      <label className="mb-3 flex cursor-pointer items-center gap-2 text-xs text-app-text-muted">
        <input
          type="checkbox"
          checked={showAllOrgs}
          onChange={(e) => setShowAllOrgs(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-app-border accent-app-primary"
        />
        {t("filter.showAllOrgs")}
      </label>

      {error && <p className="mb-3 text-sm text-app-danger">{error}</p>}
      {!error && items === null && (
        <p className="text-sm text-app-text-muted">{t("status.loading")}</p>
      )}
      {items && items.length === 0 && (
        <p className="text-sm text-app-text-muted">{t("empty.noTeams")}</p>
      )}
      {items && items.length > 0 && (
        <ul className="divide-y divide-app-border rounded-lg border border-app-border bg-app-surface">
          {items.map((team) => (
            <li key={team.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    to={`/teams/${team.slug}`}
                    className="text-sm font-medium text-app-text hover:text-app-primary"
                  >
                    {team.name}
                  </Link>
                  <div className="text-xs text-app-text-muted">{team.slug}</div>
                  {team.description && (
                    <p className="mt-1 text-sm text-app-text-muted">{team.description}</p>
                  )}
                </div>
                <div className="text-right text-xs text-app-text-muted">
                  <div>
                    {t(team.memberCount === 1 ? "teamMeta.member_one" : "teamMeta.member_other", {
                      count: team.memberCount,
                    })}
                  </div>
                  {team.leads.length > 0 ? (
                    <div className="mt-1">
                      {t(team.leads.length === 1 ? "teamMeta.lead_one" : "teamMeta.lead_other")}:{" "}
                      {team.leads.map((l) => l.displayName).join(", ")}
                    </div>
                  ) : (
                    <div className="mt-1 italic">{t("teamMeta.noLead")}</div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <RequestTeamDialog
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        onSubmitted={(createdTeamSlug) => {
          if (createdTeamSlug) {
            navigate(`/teams/${createdTeamSlug}`);
          } else {
            navigate("/teams/requests");
          }
        }}
      />
    </PageLayout>
  );
}
