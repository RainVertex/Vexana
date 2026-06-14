import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "@internal/api-client";
import { PageLayout } from "@internal/shared-ui";
import { useApi } from "@internal/api-client/react";
import { useTranslation } from "@internal/i18n";
import type {
  MaintainerRequestDto,
  MaintainerRequestStatus,
  TeamRequestDto,
  TeamRequestStatus,
} from "@internal/shared-types";
import { ProposedMembersList, RejectMaintainerRequestDialog } from "@feature/teams-frontend";

const PENDING_TEAM_STATUSES: ReadonlySet<TeamRequestStatus> = new Set([
  "pending",
  "awaiting_user_confirmation",
]);

/** Combined "My Approvals" page, pending + history of requests where I'm authorized to act. */
export function MyApprovalsTeamPage() {
  const { t } = useTranslation("requests");
  const api = useApi();
  const navigate = useNavigate();
  const [maintainerRows, setMaintainerRows] = useState<MaintainerRequestDto[] | null>(null);
  const [teamRows, setTeamRows] = useState<TeamRequestDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<MaintainerRequestDto | null>(null);

  const load = useCallback(() => {
    setError(null);
    // Maintainer is the universal approver view (admin or any lead), team creation is admin-only.
    api.maintainerRequests
      .forMeAsApprover()
      .then((r) => setMaintainerRows(r.items))
      .catch((err) => setError(err instanceof Error ? err.message : t("errors.failedToLoad")));
    api.teamRequests
      .forMeAsApprover()
      .then((r) => setTeamRows(r.items))
      .catch((err) => {
        // 403 just means the user isn't an admin, expected so suppress.
        if (err instanceof ApiError && err.status === 403) {
          setTeamRows([]);
          return;
        }
        setError(err instanceof Error ? err.message : t("errors.failedToLoadTeam"));
        setTeamRows([]);
      });
  }, [api, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleApprove(r: MaintainerRequestDto) {
    setBusyId(r.id);
    setError(null);
    try {
      await api.maintainerRequests.approve(r.id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.approvalFailed"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(reason: string) {
    if (!rejecting) return;
    const id = rejecting.id;
    setBusyId(id);
    setError(null);
    try {
      await api.maintainerRequests.reject(id, reason);
      setRejecting(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.rejectionFailed"));
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

  const loading = maintainerRows === null || teamRows === null;
  const teamPending = (teamRows ?? []).filter((r) => PENDING_TEAM_STATUSES.has(r.status));
  const teamResolved = (teamRows ?? []).filter((r) => !PENDING_TEAM_STATUSES.has(r.status));
  const maintPending = (maintainerRows ?? []).filter((r) => r.status === "pending");
  const maintResolved = (maintainerRows ?? []).filter((r) => r.status !== "pending");

  return (
    <PageLayout title={t("page.myApprovalsTitle")} description={t("page.myApprovalsDescription")}>
      {error && <p className="mb-3 text-sm text-app-danger">{error}</p>}
      {loading && <p className="text-sm text-app-text-muted">{t("loading")}</p>}

      {!loading && maintainerRows!.length === 0 && teamRows!.length === 0 && (
        <p className="text-sm text-app-text-muted">{t("empty.nothingPending")}</p>
      )}

      {!loading && teamRows!.length > 0 && (
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
                      <div className="text-sm font-medium text-app-text">
                        {r.requestedBy.displayName} → {r.name}
                      </div>
                    </div>
                    <div className="text-xs text-app-text-muted">{r.slug}</div>
                    <ProposedMembersList request={r} />
                    {r.rejectionReason && (
                      <p className="mt-1 text-xs text-app-danger">
                        {t("labels.rejected", { reason: r.rejectionReason })}
                      </p>
                    )}
                    <div className="mt-1 text-xs text-app-text-muted">
                      {t("labels.submitted", { date: new Date(r.createdAt).toLocaleString() })}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 text-right text-xs">
                    <div className="text-app-text">{teamStatusLabel[r.status]}</div>
                    {/* Negotiation UI lives on the deep admin page, keep this row a link only. */}
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/team-requests`)}
                      className="rounded-md border border-app-border px-2 py-0.5 text-app-text-muted hover:text-app-text"
                    >
                      {t("actions.openInAdmin")}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!loading && maintainerRows!.length > 0 && (
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
                      <div className="text-sm font-medium text-app-text">
                        {r.requestedBy.displayName} → {r.teamName}
                      </div>
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
                    <div className="mt-1 text-xs text-app-text-muted">
                      {t("labels.submitted", { date: new Date(r.createdAt).toLocaleString() })}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {r.status === "pending" ? (
                      <>
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          onClick={() => setRejecting(r)}
                          className="rounded-md border border-app-border px-3 py-1 text-xs text-app-text-muted hover:text-app-danger disabled:opacity-50"
                        >
                          {t("actions.reject")}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          onClick={() => void handleApprove(r)}
                          className="rounded-md bg-app-primary px-3 py-1 text-xs text- disabled:opacity-50"
                        >
                          {t("actions.approve")}
                        </button>
                      </>
                    ) : (
                      <span className="rounded-md border border-app-border px-3 py-1 text-xs text-app-text-muted">
                        {maintainerStatusLabel[r.status]}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <RejectMaintainerRequestDialog
        open={rejecting !== null}
        submitting={busyId !== null && busyId === rejecting?.id}
        request={rejecting}
        onSubmit={handleReject}
        onClose={() => setRejecting(null)}
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
