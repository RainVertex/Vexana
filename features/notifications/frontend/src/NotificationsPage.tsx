import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageLayout } from "@internal/shared-ui";
import { useNotificationsApi } from "./client";
import { notificationHref, notificationSummary } from "./render";
import { useTranslation } from "@internal/i18n";
import type { NotificationDto, NotificationPreferenceDto } from "@feature/notifications-shared";

function PreferenceCenter() {
  const api = useNotificationsApi();
  const { t } = useTranslation("notifications");
  const [prefs, setPrefs] = useState<NotificationPreferenceDto[] | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.preferences();
        setPrefs(res.items);
      } catch {
        setPrefs([]);
      }
    })();
  }, [api]);

  async function toggle(category: NotificationPreferenceDto["category"], muted: boolean) {
    setPrefs((prev) => prev?.map((p) => (p.category === category ? { ...p, muted } : p)) ?? null);
    try {
      await api.setPreference(category, muted);
    } catch {
      setPrefs(
        (prev) => prev?.map((p) => (p.category === category ? { ...p, muted: !muted } : p)) ?? null,
      );
    }
  }

  if (!prefs) return null;

  return (
    <section className="mb-5 rounded-lg border border-app-border bg-app-surface p-4">
      <h2 className="text-sm font-semibold text-app-text">{t("preferences.heading")}</h2>
      <p className="mb-3 text-xs text-app-text-muted">{t("preferences.description")}</p>
      <ul className="divide-y divide-app-border">
        {prefs.map((p) => (
          <li key={p.category} className="flex items-center justify-between gap-3 py-2">
            <span className="text-sm text-app-text">{t(`category.${p.category}`)}</span>
            <label className="inline-flex items-center gap-2 text-xs text-app-text-muted">
              <input
                type="checkbox"
                checked={p.muted}
                onChange={(e) => void toggle(p.category, e.target.checked)}
              />
              {t("preferences.mute")}
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function NotificationsPage() {
  const api = useNotificationsApi();
  const { t } = useTranslation("notifications");
  const [items, setItems] = useState<NotificationDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.list({ unread: unreadOnly, limit: 200 });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("page.errorLoad"));
    }
  }, [api, unreadOnly, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markRead(id: string) {
    await api.markRead(id);
    await load();
  }

  async function markAll() {
    await api.markAllRead();
    await load();
  }

  return (
    <PageLayout
      title={t("page.title")}
      description={t("page.description")}
      actions={
        <button
          type="button"
          onClick={() => void markAll()}
          className="rounded-md border border-app-border px-3 py-1 text-sm text-app-text hover:bg-app-surface-hover"
        >
          {t("page.markAllRead")}
        </button>
      }
    >
      <PreferenceCenter />
      {error && <p className="mb-3 text-sm text-app-danger">{error}</p>}
      <label className="mb-3 inline-flex items-center gap-2 text-xs text-app-text-muted">
        <input
          type="checkbox"
          checked={unreadOnly}
          onChange={(e) => setUnreadOnly(e.target.checked)}
        />
        {t("page.unreadOnly")}
      </label>
      {!items && <p className="text-sm text-app-text-muted">{t("page.loading")}</p>}
      {items && items.length === 0 && (
        <p className="text-sm text-app-text-muted">{t("page.empty")}</p>
      )}
      {items && items.length > 0 && (
        <ul className="divide-y divide-app-border rounded-lg border border-app-border bg-app-surface">
          {items.map((n) => {
            const isUnread = !n.readAt;
            const href = notificationHref(n);
            const body = (
              <div className="min-w-0">
                <div className={isUnread ? "font-medium text-app-text" : "text-app-text-muted"}>
                  {notificationSummary(n, t)}
                  {isUnread && <span className="sr-only"> {t("page.unreadSrOnly")}</span>}
                </div>
                <div className="text-xs text-app-text-muted">
                  {new Date(n.createdAt).toLocaleString()}
                </div>
              </div>
            );
            return (
              <li
                key={n.id}
                className={`flex items-start justify-between gap-3 px-4 py-3 text-sm ${
                  isUnread ? "bg-app-primary-soft" : ""
                }`}
              >
                <div className="flex min-w-0 items-start gap-2">
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      isUnread ? "bg-app-primary" : "bg-transparent"
                    }`}
                  />
                  {href ? (
                    <Link to={href} className="min-w-0 hover:underline">
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </div>
                {isUnread && (
                  <button
                    type="button"
                    onClick={() => void markRead(n.id)}
                    className="shrink-0 text-xs text-app-primary"
                  >
                    {t("page.markRead")}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </PageLayout>
  );
}
