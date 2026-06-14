import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmDialog, PageLayout } from "@internal/shared-ui";
import { useApi } from "@internal/api-client/react";
import { useTranslation } from "@internal/i18n";
import { ProposedMembersList } from "@feature/teams-frontend";
import type {
  MaintainerRequestDto,
  MaintainerRequestStatus,
  TeamRequestDto,
  TeamRequestStatus,
} from "@internal/shared-types";

const PENDING_TEAM_STATUSES: ReadonlySet<TeamRequestStatus> = new Set([
  "pending",
  "awaiting_user_confirmation",
]);

function timeRemaining(iso: string, t: ReturnType<typeof useTranslation>["t"]): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return t("time.expired");
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days >= 1) return t("time.daysRemaining", { count: days });
  const hours = Math.floor(ms / (60 * 60 * 1000));
  return t("time.hoursRemaining", { count: hours });
}

// Combined "My Requests" page listing the user's team-creation and maintainer requests.
export function MyRequestsTeamPage() {
  const { t } = useTranslation("requests");
  const api = useApi();
  const [teamRequests, setTeamRequests] = useState<TeamRequestDto[] | null>(null);
  const [maintainerRequests, setMaintainerRequests] = useState<MaintainerRequestDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cancellingTeam, setCancellingTeam] = useState<TeamRequestDto | null>(null);
  const [cancellingMaintainer, setCancellingMaintainer] = useState<MaintainerRequestDto | null>(
    null,
  );

  const load = useCallback(() => {
    setError(null);
    Promise.all([api.teamRequests.list(), api.maintainerRequests.list()])
      .then(([t, m]) => {
        setTeamRequests(t.items);
        setMaintainerRequests(m.items);
      })
      .catch((err) => setError(err instanceof Error ? err.message : t("errors.failedToLoad")));
  }, [api, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmCancelTeam() {
    if (!cancellingTeam) return;
    const id = cancellingTeam.id;
    setBusyId(id);
    try {
      await api.teamRequests.cancel(id);
      setCancellingTeam(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.cancelFailed"));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmCancelMaintainer() {
    if (!cancellingMaintainer) return;
    const id = cancellingMaintainer.id;
    setBusyId(id);
    try {
      await api.maintainerRequests.cancel(id);
      setCancellingMaintainer(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.cancelFailed"));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmTeamProposal(request: TeamRequestDto) {
    setBusyId(request.id);
    try {
      await api.teamRequests.respond(request.id, { action: "confirm" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.confirmFailed"));
    } finally {
      setBusyId(null);
    }
  }

  const teamStatusLabel: Record<TeamRequestStatus, string> = {
    pending: t("status.teamPendingAdmin"),
    awaiting_user_confirmation: t("status.teamAwaitingUser"),
    approved: t("status.teamApproved"),
    rejected: t("status.teamRejected"),
    expired: t("status.teamExpired"),
    cancelled: t("status.teamCancelled"),
  };

  const maintainerStatusLabel: Record<MaintainerRequestStatus, string> = {
    pending: t("status.maintainerPending"),
    approved: t("status.maintainerApproved"),
    rejected: t("status.maintainerRejected"),
    expired: t("status.maintainerExpired"),
    cancelled: t("status.maintainerCancelled"),
  };

  const loading = teamRequests === null || maintainerRequests === null;
  const teamPending = (teamRequests ?? []).filter((r) => PENDING_TEAM_STATUSES.has(r.status));
  const teamResolved = (teamRequests ?? []).filter((r) => !PENDING_TEAM_STATUSES.has(r.status));
  const maintPending = (maintainerRequests ?? []).filter((r) => r.status === "pending");
  const maintResolved = (maintainerRequests ?? []).filter((r) => r.status !== "pending");

  return (
    <PageLayout title={t("page.myRequestsTitle")} description={t("page.myRequestsDescription")}>
      {error && <p className="mb-3 text-sm text-app-danger">{error}</p>}
      {loading && <p className="text-sm text-app-text-muted">{t("loading")}</p>}

      {!loading && teamRequests!.length === 0 && maintainerRequests!.length === 0 && (
        <p className="text-sm text-app-text-muted">{t("empty.noRequests")}</p>
      )}

      {!loading && teamRequests!.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-app-text">
            <TypeChip kind="team" t={t} />
            <span>{t("sections.teamCreation")}</span>
            <span className="text-app-text-muted">· {teamPending.length}</span>
          </h2>
          <ul className="divide-y divide-app-border rounded-lg border border-app-border bg-app-surface">
            {[...teamPending, ...teamResolved].map((r) => (
              <li key={r.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <TypeChip kind="team" t={t} />
                      <div className="text-sm font-medium text-app-text">{r.name}</div>
                    </div>
                    <div className="text-xs text-app-text-muted">{r.slug}</div>
                    {r.mirrorToGithub && r.githubOrgLogin && (
                      <div className="mt-0.5 text-xs text-app-text-muted">
                        {t("labels.mirrorGithub", { org: r.githubOrgLogin })}
                      </div>
                    )}
                    <ProposedMembersList request={r} />
                    {r.rejectionReason && (
                      <p className="mt-1 text-xs text-app-danger">
                        {t("labels.rejected", { reason: r.rejectionReason })}
                      </p>
                    )}
                    {r.autoCancelReason === "round_limit" && (
                      <p className="mt-1 text-xs text-app-danger">
                        {t("labels.autoCancelledRounds")}
                      </p>
                    )}
                    {r.createdTeamSlug && (
                      <Link
                        to={`/teams/${r.createdTeamSlug}`}
                        className="mt-1 inline-block text-xs text-app-primary"
                      >
                        {t("actions.openTeam")}
                      </Link>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 text-right text-xs">
                    <div className="text-app-text">{teamStatusLabel[r.status]}</div>
                    {PENDING_TEAM_STATUSES.has(r.status) && (
                      <div className="text-app-text-muted">
                        {t("labels.round", { current: r.roundCount, total: 3 })}
                      </div>
                    )}
                    {PENDING_TEAM_STATUSES.has(r.status) && (
                      <div className="text-app-text-muted">{timeRemaining(r.expiresAt, t)}</div>
                    )}
                    {r.status === "awaiting_user_confirmation" && (
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => void confirmTeamProposal(r)}
                        className="rounded-md bg-app-primary px-2 py-0.5 text-app-primary-foreground disabled:opacity-50"
                      >
                        {t("actions.confirm")}
                      </button>
                    )}
                    {PENDING_TEAM_STATUSES.has(r.status) && (
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => setCancellingTeam(r)}
                        className="rounded-md border border-app-border px-2 py-0.5 text-app-text-muted hover:text-app-danger disabled:opacity-50"
                      >
                        {t("actions.cancel")}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!loading && maintainerRequests!.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-app-text">
            <TypeChip kind="maintainer" t={t} />
            <span>{t("sections.maintainer")}</span>
            <span className="text-app-text-muted">· {maintPending.length}</span>
          </h2>
          <ul className="divide-y divide-app-border rounded-lg border border-app-border bg-app-surface">
            {[...maintPending, ...maintResolved].map((r) => (
              <li key={r.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <TypeChip kind="maintainer" t={t} />
                      <div className="text-sm font-medium text-app-text">{r.teamName}</div>
                    </div>
                    <Link
                      to={`/teams/${r.teamSlug}`}
                      className="text-xs text-app-primary hover:underline"
                    >
                      {r.teamSlug}
                    </Link>
                    {r.reason && (
                      <p className="mt-1 text-xs text-app-text-muted">
                        <span className="font-medium">{t("labels.reason")}:</span> {r.reason}
                      </p>
                    )}
                    {r.rejectionReason && (
                      <p className="mt-1 text-xs text-app-danger">
                        {t("labels.rejected", { reason: r.rejectionReason })}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 text-right text-xs">
                    <div className="text-app-text">{maintainerStatusLabel[r.status]}</div>
                    {r.status === "pending" && (
                      <div className="text-app-text-muted">{timeRemaining(r.expiresAt, t)}</div>
                    )}
                    {r.reviewedBy && (
                      <div className="text-app-text-muted">
                        {t("labels.reviewedBy", { name: r.reviewedBy.displayName })}
                      </div>
                    )}
                    {r.status === "pending" && (
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => setCancellingMaintainer(r)}
                        className="rounded-md border border-app-border px-2 py-0.5 text-app-text-muted hover:text-app-danger disabled:opacity-50"
                      >
                        {t("actions.cancel")}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={cancellingTeam !== null}
        title={t("dialogs.cancelTeamTitle")}
        message={
          cancellingTeam
            ? t("dialogs.cancelTeamMessage", {
                name: cancellingTeam.name,
                slug: cancellingTeam.slug,
              })
            : null
        }
        confirmLabel={t("dialogs.cancelRequestLabel")}
        cancelLabel={t("dialogs.keepItLabel")}
        destructive
        busy={busyId !== null && busyId === cancellingTeam?.id}
        onConfirm={() => void confirmCancelTeam()}
        onClose={() => setCancellingTeam(null)}
      />
      <ConfirmDialog
        open={cancellingMaintainer !== null}
        title={t("dialogs.cancelMaintainerTitle")}
        message={
          cancellingMaintainer
            ? t("dialogs.cancelMaintainerMessage", {
                teamName: cancellingMaintainer.teamName,
              })
            : null
        }
        confirmLabel={t("dialogs.cancelRequestLabel")}
        cancelLabel={t("dialogs.keepItLabel")}
        destructive
        busy={busyId !== null && busyId === cancellingMaintainer?.id}
        onConfirm={() => void confirmCancelMaintainer()}
        onClose={() => setCancellingMaintainer(null)}
      />
    </PageLayout>
  );
}

function TypeChip({
  kind,
  t,
}: {
  kind: "team" | "maintainer";
  t: ReturnType<typeof useTranslation>["t"];
}) {
  if (kind === "team") {
    return (
      <span className="inline-flex items-center rounded-full border border-app-primary/40 bg-app-primary-soft px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-app-primary">
        {t("chips.team")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-app-border bg-app-surface-hover px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-app-text-muted">
      {t("chips.maintainer")}
    </span>
  );
}
