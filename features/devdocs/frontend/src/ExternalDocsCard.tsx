import { useTranslation } from "@internal/i18n";

export interface ExternalDocsCardProps {
  url: string;
}

export function ExternalDocsCard({ url }: ExternalDocsCardProps) {
  const { t } = useTranslation("devdocs");
  return (
    <div className="rounded-lg border border-app-border bg-app-surface p-6">
      <h2 className="text-sm font-semibold text-app-text mb-2">{t("external.heading")}</h2>
      <p className="text-sm text-app-text-muted mb-3">{t("external.description")}</p>
      <a
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        className="text-sm text- hover:underline break-all"
      >
        {url} ↗
      </a>
    </div>
  );
}
