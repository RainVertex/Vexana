import { Link } from "react-router-dom";
import { useTopVisited } from "../useVisitTracker";
import { useCatalogEntityNames } from "../useCatalogEntityNames";
import { formatPath } from "../formatters";

export function TopVisitedWidget() {
  const top = useTopVisited(8);
  const entityNames = useCatalogEntityNames();

  if (top.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-app-text-muted">
        Visit pages to build your top list.
      </div>
    );
  }

  const max = Math.max(...top.map((t) => t.count), 1);

  return (
    <ul className="flex flex-col gap-2">
      {top.map((entry) => (
        <li key={entry.path}>
          <Link to={entry.path} className="block group">
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="text-sm font-medium text-app-text group-hover:text-app-primary transition-colors truncate">
                {formatPath(entry.path, entityNames)}
              </span>
              <span className="text-xs text-app-text-muted shrink-0">
                {entry.count} {entry.count === 1 ? "visit" : "visits"}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-app-surface-hover overflow-hidden">
              <div
                className="h-full bg-app-primary"
                style={{ width: `${(entry.count / max) * 100}%` }}
              />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
