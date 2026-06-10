import { useTranslation } from "@internal/i18n";
import { WidgetEditToolbar, WidgetGrid, useGridLayout } from "@internal/shared-ui";
import { useEntityOverviewContext } from "../EntityOverviewContext";
import {
  DEFAULT_ENTITY_WIDGETS,
  ENTITY_WIDGETS,
  entityLayoutStorageKey,
  useLocalizedEntityWidgets,
} from "../widgets/registry";

export function OverviewTab() {
  const { data } = useEntityOverviewContext();
  const { t } = useTranslation("catalog");
  const localizedWidgets = useLocalizedEntityWidgets();
  const localizedWidgetList = Object.values(localizedWidgets);
  const layout = useGridLayout({
    storageKey: entityLayoutStorageKey(data.entity.id),
    defaultWidgets: DEFAULT_ENTITY_WIDGETS,
    registry: ENTITY_WIDGETS,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <WidgetEditToolbar layout={layout} availableWidgets={localizedWidgetList} />
      </div>
      <WidgetGrid
        widgets={layout.widgets}
        editMode={layout.editMode}
        registry={ENTITY_WIDGETS}
        onLayoutChange={layout.updateLayout}
        onRemove={layout.removeWidget}
        emptyState={{
          title: t("overview.emptyTitle"),
          hint: t("overview.emptyHint"),
        }}
      />
    </div>
  );
}
