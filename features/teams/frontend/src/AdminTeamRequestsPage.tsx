// Admin queue to approve, reject, or propose changes to pending team-creation requests.
import { useCallback, useEffect, useState } from "react";
import { PageLayout } from "@internal/shared-ui";
import { useApi } from "@internal/api-client/react";
import { useTranslation } from "@internal/i18n";
import type { TeamRequestDto } from "@internal/shared-types";
import { RejectTeamRequestDialog } from "./RejectTeamRequestDialog";
import { ProposeChangesDialog } from "./ProposeChangesDialog";
import { ProposedMembersList } from "./ProposedMembersList";
import { RequestDiff } from "./RequestDiff";

export function AdminTeamRequestsPage() {
  const api = useApi();
  const { t } = useTranslation("teams");
  const [items, setItems] = useState<TeamRequestDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<TeamRequestDto | null>(null);
  const [proposing, setProposing] = useState<TeamRequestDto | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      // Queue shows both pending (admin's turn) and awaiting_user_confirmation.
      const [pending, awaiting] = await Promise.all([
        api.teamRequests.list({ status: "pending" }),
        api.teamRequests.list({ status: "awaiting_user_confirmation" }),
      ]);
      const combined = [...pending.items, ...awaiting.items].sort((a, b) =>
        a.createdAt < b.createdAt ? 1 : -1,
      );
      setItems(combined);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.failedToLoad"));
    }
  }, [api, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await api.teamRequests.approve(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.approveFailed"));
    } finally {
      setBusyId(null);
    }
  }

  async function submitRejection(reason: string) {
    if (!rejecting) return;
    const id = rejecting.id;
    setBusyId(id);
    try {
      await api.teamRequests.reject(id, reason);
      setRejecting(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.rejectFailed"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <PageLayout title={t("page.teamRequestsTitle")} description={t("page.teamRequestsDescription")}>
      {error && <p className="mb-3 text-sm text-app-danger">{error}</p>}
      {!items && !error && <p className="text-sm text-app-text-muted">{t("status.loading")}</p>}
      {items && items.length === 0 && (
        <p className="text-sm text-app-text-muted">{t("empty.queueEmpty")}</p>
      )}
      {items && items.length > 0 && (
        <ul className="divide-y divide-app-border rounded-lg border border-app-border bg-app-surface">
          {items.map((r) => {
            const awaitingUser = r.status === "awaiting_user_confirmation";
            return (
              <li key={r.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-app-text">
                      <span>{r.name}</span>
                      {awaitingUser && (
                        <span className="rounded-full border border-app-border px-2 py-0.5 text-xs text-app-text-muted">
                          {t("status.waitingOnRequester")}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-app-text-muted">{r.slug}</div>
                    {r.description && (
                      <p className="mt-1 text-sm text-app-text-muted">{r.description}</p>
                    )}
                    <div className="mt-1 text-xs text-app-text-muted">
                      {t("requestList.byRound", {
                        name: r.requestedBy.displayName,
                        round: r.roundCount,
                      })}
                    </div>
                    {r.mirrorToGithub && r.githubOrgLogin && (
                      <div className="mt-0.5 text-xs text-app-text-muted">
                        {t("requestList.mirrorToOrg", { org: r.githubOrgLogin })}
                      </div>
                    )}
                    {r.mirrorToGithub && !r.githubOrgLogin && (
                      <div className="mt-0.5 text-xs text-app-danger">
                        {t("requestList.mirrorMissingIntegration")}
                      </div>
                    )}
                    <ProposedMembersList request={r} />
                    <RequestDiff request={r} />
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 text-sm">
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => void approve(r.id)}
                      className="rounded-md bg-app-primary px-3 py-1 text- disabled:opacity-50"
                    >
                      {t("actions.approve")}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => setRejecting(r)}
                      className="rounded-md border border-app-border px-3 py-1 text-app-text-muted hover:text-app-danger disabled:opacity-50"
                    >
                      {t("actions.reject")}
                    </button>
                    {!awaitingUser && (
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => setProposing(r)}
                        className="rounded-md border border-app-border px-3 py-1 text-app-text-muted hover:text-app-text disabled:opacity-50"
                      >
                        {t("actions.proposeChanges")}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <RejectTeamRequestDialog
        open={rejecting !== null}
        submitting={busyId !== null && busyId === rejecting?.id}
        requestName={rejecting?.name}
        onSubmit={(reason) => void submitRejection(reason)}
        onClose={() => setRejecting(null)}
      />
      <ProposeChangesDialog
        request={proposing}
        onClose={() => setProposing(null)}
        onProposed={() => void load()}
      />
    </PageLayout>
  );
}
