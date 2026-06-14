import { useTranslation } from "@internal/i18n";
import { useLocalizedColumnMeta, type CatalogColumnId } from "./columns";

interface Props {
  column: CatalogColumnId;
  value: string;
  onRemove: () => void;
}

export function FilterChip({ column, value, onRemove }: Props) {
  const { t } = useTranslation("catalog");
  const localizedMeta = useLocalizedColumnMeta();
  const columnLabel = localizedMeta[column].label;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-app-primary bg-app-primary-soft px-2.5 py-0.5 text-xs text-">
      <span className="font-medium">{columnLabel}:</span>
      <span>{value}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t("filterChip.removeLabel", { column: columnLabel, value })}
        className="ml-0.5 rounded-full px-1 leading-none hover:bg-app-primary/20"
      >
        ×
      </button>
    </span>
  );
}
