import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@internal/shared-ui";
import { useApi } from "@internal/api-client/react";
import { useTranslation } from "@internal/i18n";
import type {
  CurrentUser,
  MaintainerRequestDto,
  TeamDetail,
  TeamSummary,
} from "@internal/shared-types";
import { RequestMaintainerDialog } from "./RequestMaintainerDialog";

// Self-service page to request maintainership on a team where I'm a member but not lead.
export function RequestMaintainerPickerPage() {
  const api = useApi();
  const navigate = useNavigate();
  const { t } = useTranslation("teams");
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [teams, setTeams] = useState<TeamSummary[] | null>(null);
  const [details, setDetails] = useState<Record<string, TeamDetail>>({});
  const [pending, setPending] = useState<MaintainerRequestDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<{ slug: string; name: string } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [meRes, teamsRes, mineRes] = await Promise.all([
        api.auth.me(),
        api.teams.list(),
        api.maintainerRequests.list(),
      ]);
      setMe(meRes);
      setTeams(teamsRes.items);
      setPending(mineRes.items.filter((r) => r.status === "pending"));
      // The list endpoint omits full memberships, so fetch each team's detail to learn my role.
      const detailEntries = await Promise.all(
        teamsRes.items.map(async (t) => {
          try {
            const detail = await api.teams.get(t.slug);
            return [t.slug, detail] as const;
          } catch {
            return null;
          }
        }),
      );
      const next: Record<string, TeamDetail> = {};
      for (const entry of detailEntries) {
        if (entry) next[entry[0]] = entry[1];
      }
      setDetails(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.failedToLoad"));
    }
  }, [api, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const eligible = useMemo(() => {
    if (!teams || !me) return null;
    return teams.filter((t) => {
      const detail = details[t.slug];
      if (!detail) return false;
      const myMembership = detail.members.find((m) => m.userId === me.id);
      if (!myMembership) return false;
      if (myMembership.role === "lead") return false;
      if (pending.some((p) => p.teamSlug === t.slug)) return false;
      return true;
    });
  }, [teams, details, me, pending]);

  return (
    <PageLayout
      title={t("page.requestMaintainerTitle")}
      description={t("page.requestMaintainerDescription")}
    >
      {error && <p className="mb-3 text-sm text-app-danger">{error}</p>}
      {eligible === null && <p className="text-sm text-app-text-muted">{t("status.loading")}</p>}
      {eligible !== null && eligible.length === 0 && (
        <p className="text-sm text-app-text-muted">{t("empty.alreadyLeadOrPending")}</p>
      )}
      {eligible !== null && eligible.length > 0 && (
        <ul className="divide-y divide-app-border rounded-lg border border-app-border bg-app-surface">
          {eligible.map((team) => (
            <li key={team.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-app-text">{team.name}</div>
                <div className="text-xs text-app-text-muted">{team.slug}</div>
                {team.description && (
                  <p className="mt-1 text-xs text-app-text-muted">{team.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPicked({ slug: team.slug, name: team.name })}
                className="shrink-0 rounded-md bg-app-primary px-3 py-1 text-xs text-"
              >
                {t("actions.requestMaintainership")}
              </button>
            </li>
          ))}
        </ul>
      )}

      <RequestMaintainerDialog
        open={picked !== null}
        teamSlug={picked?.slug ?? ""}
        teamName={picked?.name ?? ""}
        onClose={() => setPicked(null)}
        onSubmitted={() => {
          setPicked(null);
          navigate("/requests/team");
        }}
      />
    </PageLayout>
  );
}
