// Datasource picker for the Grafana connect/configure flows (Prometheus required, Loki/Tempo optional).

import { useTranslation } from "@internal/i18n";

export interface DatasourceCandidate {
  uid: string;
  name: string;
  isDefault: boolean;
}

export function pickDefaultUid(candidates: DatasourceCandidate[]): string {
  if (candidates.length === 0) return "";
  const flagged = candidates.find((c) => c.isDefault);
  return (flagged ?? candidates[0]).uid;
}

export function DatasourceSelect({
  label,
  value,
  onChange,
  candidates,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  candidates: DatasourceCandidate[];
  required?: boolean;
}) {
  const { t } = useTranslation("integrations");

  if (candidates.length === 0) {
    return (
      <div className="text-xs">
        <span className="text-app-text-muted">{label}</span>
        <p className="mt-1 rounded border border-dashed border-app-border px-2 py-1.5 text-app-text-muted">
          {required ? t("datasource.noDataRequired") : t("datasource.noDataOptional")}
        </p>
      </div>
    );
  }
  return (
    <label className="block text-xs">
      <span className="text-app-text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded border border-app-border bg-app-bg px-2 py-1.5 text-sm text-app-text"
      >
        {!required && <option value="">{t("datasource.noneOption")}</option>}
        {candidates.map((c) => (
          <option key={c.uid} value={c.uid}>
            {c.name}
            {c.isDefault ? t("datasource.defaultSuffix") : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
