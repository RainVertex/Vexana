import { PageLayout, WidgetEditToolbar, WidgetGrid, useGridLayout } from "@internal/shared-ui";
import { useTranslation } from "@internal/i18n";
import { useCurrentUser } from "../auth";
import { DEFAULT_WIDGETS, WIDGETS, HOME_WIDGET_LIST } from "../widgets";
import { HOME_LAYOUT_STORAGE_KEY } from "../widgets/types";

export function HomePage() {
  const user = useCurrentUser();
  const { t } = useTranslation();
  const firstName = user.displayName.split(" ")[0] || user.displayName;
  const layout = useGridLayout({
    storageKey: HOME_LAYOUT_STORAGE_KEY,
    defaultWidgets: DEFAULT_WIDGETS,
    registry: WIDGETS,
  });

  return (
    <PageLayout
      title={t("home.welcome", { name: firstName })}
      description={t("home.subtitle")}
      actions={<WidgetEditToolbar layout={layout} availableWidgets={HOME_WIDGET_LIST} />}
    >
      <WidgetGrid
        widgets={layout.widgets}
        editMode={layout.editMode}
        registry={WIDGETS}
        onLayoutChange={layout.updateLayout}
        onRemove={layout.removeWidget}
        emptyState={{
          title: t("home.emptyTitle"),
          hint: t("home.emptyHint"),
        }}
      />
    </PageLayout>
  );
}
