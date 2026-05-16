export interface ExternalDocsCardProps {
  url: string;
}

export function ExternalDocsCard({ url }: ExternalDocsCardProps) {
  return (
    <div className="rounded-lg border border-app-border bg-app-surface p-6">
      <h2 className="text-sm font-semibold text-app-text mb-2">External documentation</h2>
      <p className="text-sm text-app-text-muted mb-3">
        This entity&rsquo;s docs live on an external site.
      </p>
      <a
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        className="text-sm text-app-primary-on hover:underline break-all"
      >
        {url} ↗
      </a>
    </div>
  );
}
