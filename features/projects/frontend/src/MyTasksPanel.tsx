import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "@internal/i18n";
import type { Task } from "./api";

const PRIORITY_COLORS: Record<number, string> = {
  0: "bg-gray-600",
  1: "bg-blue-600",
  2: "bg-yellow-600",
  3: "bg-orange-600",
  4: "bg-red-600",
};

const PRIORITY_KEYS: Record<number, string> = {
  0: "priority.none",
  1: "priority.low",
  2: "priority.med",
  3: "priority.high",
  4: "priority.urg",
};

interface Props {
  userId: string;
}

export function MyTasksPanel({ userId }: Props) {
  const { t } = useTranslation("projects");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/projects/users/${userId}/tasks?limit=10`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (!cancelled) setTasks(d as Task[]);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) return <p className="text-xs text-app-text-muted">{t("loading.tasks")}</p>;
  if (error) return <p className="text-xs text-app-danger">{error}</p>;
  if (tasks.length === 0)
    return <p className="text-xs text-app-text-muted">{t("empty.noTasksAssigned")}</p>;

  return (
    <div className="space-y-1">
      {tasks.map((task) => (
        <Link
          key={task.id}
          to={`/tasks/${task.id}`}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-app-surface-hover transition-colors"
        >
          <span
            className={`inline-block h-2 w-2 shrink-0 rounded-full ${PRIORITY_COLORS[task.priority] ?? "bg-gray-600"}`}
            title={t(PRIORITY_KEYS[task.priority] ?? "priority.none")}
          />
          <span className="flex-1 truncate text-sm text-app-text">{task.title}</span>
          {task.projectTitle && (
            <span className="shrink-0 text-[11px] text-app-text-muted">{task.projectTitle}</span>
          )}
          {task.dueDate && (
            <span className="shrink-0 text-[11px] text-app-text-muted">
              {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
        </Link>
      ))}
      {tasks.length >= 10 && (
        <Link to="/projects" className="block px-2 py-1 text-xs text- hover:underline">
          {t("actions.viewAll")}
        </Link>
      )}
    </div>
  );
}
