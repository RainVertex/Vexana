// Onboarding checklist widget: lists tasks with complete/dismiss actions.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "@internal/api-client/react";
import { useTranslation } from "@internal/i18n";
import type { UserTaskDto } from "@internal/shared-types";

interface TaskPresenter {
  title: string;
  description: string;
  ctaHref: string;
  ctaLabel: string;
  autoCompletes: boolean;
}

type PresenterMap = Record<
  string,
  Omit<TaskPresenter, "title" | "description" | "ctaLabel"> & {
    title: string;
    description: string;
    ctaLabel: string;
  }
>;

function usePresenters(): (kind: string) => TaskPresenter {
  const { t } = useTranslation("onboarding");

  const map: PresenterMap = {
    "request-tool-access": {
      title: t("tasks.request-tool-access.title"),
      description: t("tasks.request-tool-access.description"),
      ctaHref: "/integrations",
      ctaLabel: t("tasks.request-tool-access.ctaLabel"),
      autoCompletes: false,
    },
    "team-join": {
      title: t("tasks.team-join.title"),
      description: t("tasks.team-join.description"),
      ctaHref: "/teams",
      ctaLabel: t("tasks.team-join.ctaLabel"),
      autoCompletes: true,
    },
  };

  return (kind: string) =>
    map[kind] ?? {
      title: kind,
      description: "",
      ctaHref: "/",
      ctaLabel: t("tasks.fallbackCtaLabel"),
      autoCompletes: false,
    };
}

export function OnboardingWidget() {
  const { t } = useTranslation("onboarding");
  const api = useApi();
  const [tasks, setTasks] = useState<UserTaskDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const presenterFor = usePresenters();

  useEffect(() => {
    let cancelled = false;
    api.onboarding
      .listTasks()
      .then((res) => {
        if (!cancelled) setTasks(res.items);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? t("errors.loadFailed"));
      });
    return () => {
      cancelled = true;
    };
  }, [api, t]);

  const markComplete = async (id: string) => {
    const previous = tasks;
    setTasks((prev) =>
      prev
        ? prev.map((task) =>
            task.id === id
              ? { ...task, status: "completed", completedAt: new Date().toISOString() }
              : task,
          )
        : prev,
    );
    try {
      await api.onboarding.completeTask(id);
    } catch (err) {
      console.error("Failed to complete task", err);
      if (previous) setTasks(previous);
    }
  };

  const dismiss = async (id: string) => {
    const previous = tasks;
    setTasks((prev) =>
      prev ? prev.map((task) => (task.id === id ? { ...task, status: "dismissed" } : task)) : prev,
    );
    try {
      await api.onboarding.dismissTask(id);
    } catch (err) {
      console.error("Failed to dismiss task", err);
      if (previous) setTasks(previous);
    }
  };

  if (error) return <Empty message={error} />;
  if (tasks === null) return <Loading />;

  const visible = tasks.filter((task) => task.status !== "dismissed");
  if (visible.length === 0) {
    return <Empty message={t("empty.allCaughtUp")} />;
  }
  const remaining = visible.filter((task) => task.status === "pending").length;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 text-xs text-app-text-muted">
        {t("progress.remaining", { remaining, total: visible.length })}
      </div>
      <ul className="flex flex-col divide-y divide-app-border">
        {visible.map((task) => {
          const p = presenterFor(task.kind);
          const done = task.status === "completed";
          return (
            <li key={task.id} className="flex items-start gap-3 py-3">
              <span
                aria-hidden
                className={`mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-app-border bg-app-surface"
                }`}
              >
                {done && <Check />}
              </span>
              <div className="min-w-0 flex-1">
                <div
                  className={`text-sm font-medium ${
                    done ? "text-app-text-muted line-through" : "text-app-text"
                  }`}
                >
                  {p.title}
                </div>
                {p.description && (
                  <div className="mt-0.5 text-xs text-app-text-muted">{p.description}</div>
                )}
                {!done && (
                  <div className="mt-2 flex items-center gap-3">
                    <Link
                      to={p.ctaHref}
                      className="text-sm font-medium text-app-primary hover:text-app-primary-hover"
                    >
                      {p.ctaLabel} →
                    </Link>
                    {!p.autoCompletes && (
                      <button
                        type="button"
                        onClick={() => markComplete(task.id)}
                        className="text-xs text-app-text-muted hover:text-app-text"
                      >
                        {t("actions.markDone")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => dismiss(task.id)}
                      className="text-xs text-app-text-muted hover:text-app-text"
                    >
                      {t("actions.dismiss")}
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex flex-col gap-2">
      <div className="h-4 rounded bg-app-surface-hover animate-pulse" />
      <div className="h-4 w-3/4 rounded bg-app-surface-hover animate-pulse" />
      <div className="h-4 w-1/2 rounded bg-app-surface-hover animate-pulse" />
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center py-6 text-center text-sm text-app-text-muted">
      {message}
    </div>
  );
}

function Check() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
      <path
        d="M2 5l2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
