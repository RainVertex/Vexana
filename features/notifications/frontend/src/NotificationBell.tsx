// Header notification bell: polls unread count and renders a dropdown inbox.
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "@internal/api-client/react";
import { useTranslation } from "@internal/i18n";
import type { NotificationDto } from "@internal/shared-types";
import type { TFunction } from "i18next";

const POLL_INTERVAL_MS = 30_000;

function notificationHref(n: NotificationDto): string | null {
  const p = n.payload as Record<string, unknown>;
  // *.submitted routes to the approver inbox, everything else to requester status.
  if (n.kind === "team.request.submitted" || n.kind === "team.maintainer_request.submitted") {
    return "/approvals/team";
  }
  if (n.kind.startsWith("team.request.") || n.kind.startsWith("team.maintainer_request.")) {
    return "/requests/team";
  }
  if (typeof p.teamSlug === "string") return `/teams/${p.teamSlug}`;
  if (n.kind.startsWith("projects.")) {
    return typeof p.taskId === "string" ? `/tasks/${p.taskId}` : "/projects";
  }
  return null;
}

function notificationSummary(n: NotificationDto, t: TFunction): string {
  switch (n.kind) {
    case "team.request.submitted": {
      const name = (n.payload as Record<string, unknown>).requestedByDisplayName;
      return typeof name === "string"
        ? t("bellSummary.teamRequestSubmittedBy", { name })
        : t("bellSummary.teamRequestSubmitted");
    }
    case "team.request.approved":
      return t("bellSummary.teamRequestApproved");
    case "team.request.rejected": {
      const reason = (n.payload as Record<string, unknown>).reason;
      return typeof reason === "string"
        ? t("bellSummary.teamRequestRejectedWithReason", { reason })
        : t("bellSummary.teamRequestRejected");
    }
    case "team.request.changes_proposed":
      return t("bellSummary.teamRequestChangesProposed");
    case "team.request.counter_proposed": {
      const name = (n.payload as Record<string, unknown>).requestedByDisplayName;
      return typeof name === "string"
        ? t("bellSummary.teamRequestCounterProposedBy", { name })
        : t("bellSummary.teamRequestCounterProposed");
    }
    case "team.request.auto_cancelled":
      return t("bellSummary.teamRequestAutoCancelled");
    case "team.request.expired":
      return t("bellSummary.teamRequestExpired");
    case "team.maintainer_request.submitted": {
      const name = (n.payload as Record<string, unknown>).requestedByDisplayName;
      const teamName = (n.payload as Record<string, unknown>).teamName;
      return typeof name === "string" && typeof teamName === "string"
        ? t("bellSummary.maintainerRequestSubmittedBy", { name, teamName })
        : t("bellSummary.maintainerRequestSubmitted");
    }
    case "team.maintainer_request.approved":
      return t("bellSummary.maintainerRequestApproved");
    case "team.maintainer_request.rejected": {
      const reason = (n.payload as Record<string, unknown>).reason;
      return typeof reason === "string"
        ? t("bellSummary.maintainerRequestRejectedWithReason", { reason })
        : t("bellSummary.maintainerRequestRejected");
    }
    case "team.member.added":
      return t("bellSummary.memberAdded");
    case "team.member.removed":
      return t("bellSummary.memberRemoved");
    case "projects.task.assigned": {
      const p = n.payload as Record<string, unknown>;
      const title = typeof p.taskTitle === "string" ? p.taskTitle : t("fallback.aTask");
      return t("bellSummary.taskAssigned", { title });
    }
    case "projects.task.commentAdded": {
      const p = n.payload as Record<string, unknown>;
      const title = typeof p.taskTitle === "string" ? p.taskTitle : t("fallback.aTask");
      const author = typeof p.authorName === "string" ? p.authorName : t("fallback.someone");
      return t("bellSummary.taskCommented", { author, title });
    }
    default:
      return n.kind;
  }
}

export function NotificationBell() {
  const api = useApi();
  const { t } = useTranslation("notifications");
  const [unread, setUnread] = useState<number>(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationDto[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(async () => {
    try {
      const res = await api.notifications.unreadCount();
      setUnread(res.count);
    } catch {
      // network blip, leave previous count
    }
  }, [api]);

  useEffect(() => {
    void refreshCount();
    const timer = setInterval(refreshCount, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refreshCount]);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function handleOpen() {
    setOpen((prev) => !prev);
    if (!open) {
      try {
        const res = await api.notifications.list({ limit: 20 });
        setItems(res.items);
      } catch {
        setItems([]);
      }
    }
  }

  async function markAllRead() {
    try {
      await api.notifications.markAllRead();
      setUnread(0);
      setItems(
        (prev) =>
          prev?.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) ?? null,
      );
    } catch {
      // ignore
    }
  }

  async function handleNotificationClick(n: NotificationDto) {
    setOpen(false);
    if (n.readAt) return;
    // Optimistic update so the badge drops immediately on click.
    const nowIso = new Date().toISOString();
    setItems(
      (prev) => prev?.map((it) => (it.id === n.id ? { ...it, readAt: nowIso } : it)) ?? null,
    );
    setUnread((prev) => Math.max(0, prev - 1));
    try {
      await api.notifications.markRead(n.id);
    } catch {
      // Revert and resync if the server rejected our optimistic update.
      void refreshCount();
    }
  }

  const ariaLabel =
    unread > 0 ? t("bell.ariaLabelWithCount", { count: unread }) : t("bell.ariaLabel");

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => void handleOpen()}
        aria-label={ariaLabel}
        className="relative rounded-full border border-app-border bg-app-surface px-3 py-1 text-sm text-app-text hover:bg-app-surface-hover"
      >
        {t("bell.buttonLabel")}
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 rounded-full bg-app-primary px-1.5 py-0.5 text-[10px] font-medium leading-none text-app-primary-on">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-app-border bg-app-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-app-border px-3 py-2 text-xs">
            <span className="font-semibold text-app-text">{t("bell.heading")}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-app-text-muted hover:text-app-text"
              >
                {t("bell.markAllRead")}
              </button>
              <Link to="/notifications" className="text-app-primary">
                {t("bell.viewAll")}
              </Link>
            </div>
          </div>
          {items === null && (
            <div className="px-3 py-4 text-xs text-app-text-muted">{t("bell.loading")}</div>
          )}
          {items && items.length === 0 && (
            <div className="px-3 py-4 text-xs text-app-text-muted">{t("bell.empty")}</div>
          )}
          {items && items.length > 0 && (
            <ul className="max-h-80 overflow-y-auto">
              {items.map((n) => {
                const href = notificationHref(n);
                const isUnread = !n.readAt;
                const content = (
                  <div className="flex items-start gap-2 px-3 py-2">
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        isUnread ? "bg-app-primary" : "bg-transparent"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-xs ${
                          isUnread ? "font-medium text-app-text" : "text-app-text-muted"
                        }`}
                      >
                        {notificationSummary(n, t)}
                        {isUnread && <span className="sr-only"> {t("bell.unreadSrOnly")}</span>}
                      </div>
                      <div className="text-[10px] text-app-text-muted">
                        {new Date(n.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
                return (
                  <li
                    key={n.id}
                    className={`border-t border-app-border first:border-t-0 ${
                      isUnread ? "bg-app-primary-soft" : ""
                    }`}
                  >
                    {href ? (
                      <Link
                        to={href}
                        onClick={() => void handleNotificationClick(n)}
                        className="block hover:bg-app-surface-hover"
                      >
                        {content}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleNotificationClick(n)}
                        className="block w-full text-left hover:bg-app-surface-hover"
                      >
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
