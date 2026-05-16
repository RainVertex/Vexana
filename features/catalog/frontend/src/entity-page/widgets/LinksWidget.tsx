import { useEntityOverviewContext } from "../EntityOverviewContext";

const ICON_MAP: Record<string, string> = {
  github: "↗",
  docs: "📖",
  dashboard: "📊",
  slack: "💬",
  pagerduty: "🚨",
};

export function LinksWidget() {
  const { data } = useEntityOverviewContext();
  const links = data.links;
  if (links.length === 0) {
    return (
      <p className="text-sm text-app-text-muted">
        No links yet. Add to <code>metadata.links</code> in <code>catalog-info.yaml</code>.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-1.5 text-sm">
      {links.map((l) => (
        <li key={l.url}>
          <a
            href={l.url}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-2 text-app-primary-on hover:underline"
          >
            <span aria-hidden="true">{(l.icon && ICON_MAP[l.icon]) ?? "🔗"}</span>
            <span className="truncate">{l.title}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
