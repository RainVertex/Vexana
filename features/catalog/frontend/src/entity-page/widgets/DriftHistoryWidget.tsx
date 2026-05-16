import { Link } from "react-router-dom";
import { useEntityOverviewContext } from "../EntityOverviewContext";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  applied: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  ignored: "bg-app-surface-hover text-app-text-muted",
  superseded: "bg-app-surface-hover text-app-text-muted",
};

export function DriftHistoryWidget() {
  const { data } = useEntityOverviewContext();
  const drifts = data.drifts;
  if (drifts.length === 0) {
    return <p className="text-sm text-app-text-muted">No drift detected for this entity.</p>;
  }
  const recent = drifts.slice(0, 10);
  return (
    <ul className="divide-y divide-app-border text-sm">
      {recent.map((d) => (
        <li key={d.id} className="flex items-center justify-between py-2">
          <div className="min-w-0">
            <div className="text-app-text">{d.kind}</div>
            <div className="text-xs text-app-text-muted">
              {new Date(d.detectedAt).toLocaleString()}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[d.status] ?? ""}`}
            >
              {d.status}
            </span>
            <Link to="/catalog/drift" className="text-xs text-app-primary-on hover:underline">
              view
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
