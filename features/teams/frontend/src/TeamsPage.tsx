import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageLayout } from "@internal/shared-ui";
import { useApi } from "@internal/api-client/react";
import type { CurrentUser, TeamSummary } from "@internal/shared-types";
import { RequestTeamDialog } from "./RequestTeamDialog";

export function TeamsPage() {
  const api = useApi();
  const navigate = useNavigate();
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
      setError(err instanceof Error ? err.message : "Failed to load teams");
    }
  }, [api, showAllOrgs]);

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
      title="Teams"
      description="People, roles, ownership."
      actions={
        <>
          <button
            type="button"
            onClick={() => setRequestOpen(true)}
            className="rounded-md border border-app-border px-3 py-1 text-sm text-app-text hover:bg-app-surface-hover"
          >
            Request team
          </button>
          {isAdmin && (
            <Link
              to="/admin/team-requests"
              className="rounded-md bg-app-primary px-3 py-1 text-sm text-app-primary-on"
            >
              Review requests
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
        Tüm organizasyonlardaki team'leri göster
      </label>

      {error && <p className="mb-3 text-sm text-app-danger">{error}</p>}
      {!error && items === null && <p className="text-sm text-app-text-muted">Loading…</p>}
      {items && items.length === 0 && <p className="text-sm text-app-text-muted">No teams yet.</p>}
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
                    {team.memberCount} member{team.memberCount === 1 ? "" : "s"}
                  </div>
                  {team.leads.length > 0 ? (
                    <div className="mt-1">
                      {team.leads.length === 1 ? "Lead" : "Leads"}:{" "}
                      {team.leads.map((l) => l.displayName).join(", ")}
                    </div>
                  ) : (
                    <div className="mt-1 italic">no lead</div>
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
