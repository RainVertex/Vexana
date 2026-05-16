import { WidgetEditToolbar, WidgetGrid, useGridLayout } from "@internal/shared-ui";
import { useEntityOverviewContext } from "../EntityOverviewContext";
import {
  DEFAULT_ENTITY_WIDGETS,
  ENTITY_WIDGETS,
  ENTITY_WIDGET_LIST,
  entityLayoutStorageKey,
} from "../widgets/registry";

export function OverviewTab() {
  const { data } = useEntityOverviewContext();
  const layout = useGridLayout({
    storageKey: entityLayoutStorageKey(data.entity.id),
    defaultWidgets: DEFAULT_ENTITY_WIDGETS,
    registry: ENTITY_WIDGETS,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <WidgetEditToolbar layout={layout} availableWidgets={ENTITY_WIDGET_LIST} />
      </div>
      <WidgetGrid
        widgets={layout.widgets}
        editMode={layout.editMode}
        registry={ENTITY_WIDGETS}
        onLayoutChange={layout.updateLayout}
        onRemove={layout.removeWidget}
        emptyState={{
          title: "No widgets on this entity overview",
          hint: 'Click "Customize" then "Add widget" to bring widgets back.',
        }}
      />
    </div>
  );
}
