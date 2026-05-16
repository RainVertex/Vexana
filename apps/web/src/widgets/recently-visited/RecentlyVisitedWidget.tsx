import { Link } from "react-router-dom";
import { useRecentlyVisited } from "../useVisitTracker";
import { useCatalogEntityNames } from "../useCatalogEntityNames";
import { formatPath, formatRelativeTime } from "../formatters";

export function RecentlyVisitedWidget() {
  const recent = useRecentlyVisited(8);
  const entityNames = useCatalogEntityNames();

  if (recent.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-app-text-muted">
        Nothing here yet — navigate around the platform to populate this list.
      </div>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-app-border">
      {recent.map((entry) => (
        <li key={entry.path}>
          <Link
            to={entry.path}
            className="flex items-center justify-between gap-3 py-2 hover:text-app-primary transition-colors"
          >
            <span className="text-sm font-medium text-app-text truncate">
              {formatPath(entry.path, entityNames)}
            </span>
            <span className="text-xs text-app-text-muted shrink-0">
              {formatRelativeTime(entry.lastVisit)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
