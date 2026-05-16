import { COLUMN_META, type CatalogColumnId } from "./columns";

interface Props {
  column: CatalogColumnId;
  value: string;
  onRemove: () => void;
}

export function FilterChip({ column, value, onRemove }: Props) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-app-primary bg-app-primary-soft px-2.5 py-0.5 text-xs text-app-primary-on">
      <span className="font-medium">{COLUMN_META[column].label}:</span>
      <span>{value}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${COLUMN_META[column].label} filter ${value}`}
        className="ml-0.5 rounded-full px-1 leading-none hover:bg-app-primary/20"
      >
        ×
      </button>
    </span>
  );
}
