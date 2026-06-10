import { Link } from "react-router-dom";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "@internal/i18n";
import type { Task } from "../api";

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

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  const { t } = useTranslation("projects");
  return (
    <div className="rounded-md border border-app-border bg-app-surface p-3 shadow-sm">
      <Link to={`/tasks/${task.id}`} className="text-sm font-medium text-app-text hover:underline">
        {task.title}
      </Link>
      <div className="mt-2 flex items-center gap-2">
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] text-white ${PRIORITY_COLORS[task.priority] ?? "bg-gray-600"}`}
        >
          {t(PRIORITY_KEYS[task.priority] ?? "priority.none")}
        </span>
        {task.assignees?.map((a) => (
          <span
            key={a.id}
            title={a.name || a.username}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-app-primary/30 text-[9px] font-medium text-app-text"
          >
            {getInitials(a.name || a.username)}
          </span>
        ))}
        {task.dueDate && (
          <span className="ml-auto text-[10px] text-app-text-muted">
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}

export function SortableTaskCard({ task }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} />
    </div>
  );
}
