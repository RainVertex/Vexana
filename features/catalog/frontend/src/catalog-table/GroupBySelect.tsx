import { COLUMN_META, COLUMN_ORDER, type CatalogColumnId } from "./columns";

interface Props {
  value: CatalogColumnId | null;
  onChange: (id: CatalogColumnId | null) => void;
}

export function GroupBySelect({ value, onChange }: Props) {
  const groupable = COLUMN_ORDER.filter((id) => COLUMN_META[id].groupable);
  return (
    <label className="flex items-center gap-2 text-xs text-app-text-muted">
      Group by:
      <select
        value={value ?? ""}
        onChange={(e) => onChange((e.target.value as CatalogColumnId) || null)}
        className="rounded-md border border-app-border bg-app-surface px-2 py-1 text-xs text-app-text focus:outline-none focus:ring-2 focus:ring-app-primary"
      >
        <option value="">none</option>
        {groupable.map((id) => (
          <option key={id} value={id}>
            {COLUMN_META[id].label}
          </option>
        ))}
      </select>
    </label>
  );
}
