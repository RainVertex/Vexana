// Shared draft/committed/editMode state and widget mutations behind useGridLayout and useRemoteGridLayout.
import { useCallback, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Layout } from "react-grid-layout";
import type { WidgetInstance, WidgetRegistry } from "./types";

export interface GridLayoutCore<TId extends string> {
  committed: WidgetInstance<TId>[];
  setCommitted: Dispatch<SetStateAction<WidgetInstance<TId>[]>>;
  draft: WidgetInstance<TId>[];
  setDraft: Dispatch<SetStateAction<WidgetInstance<TId>[]>>;
  editMode: boolean;
  setEditMode: Dispatch<SetStateAction<boolean>>;
  widgets: WidgetInstance<TId>[];
  isDirty: boolean;
  clearAll: () => void;
  updateLayout: (layout: Layout) => void;
  addWidget: (widgetId: TId, initialConfig?: Record<string, unknown>) => void;
  removeWidget: (instanceId: string) => void;
  updateWidgetConfig: (instanceId: string, config: Record<string, unknown>) => void;
}

// `initial` may be a lazy initializer so callers reading from storage do the work once.
export function useGridLayoutCore<TId extends string>(
  registry: WidgetRegistry<TId>,
  initial: WidgetInstance<TId>[] | (() => WidgetInstance<TId>[]),
): GridLayoutCore<TId> {
  const [committed, setCommitted] = useState<WidgetInstance<TId>[]>(initial);
  const [draft, setDraft] = useState<WidgetInstance<TId>[]>(committed);
  const [editMode, setEditMode] = useState(false);

  const widgets = editMode ? draft : committed;

  const clearAll = useCallback(() => {
    setDraft([]);
  }, []);

  const updateLayout = useCallback((layout: Layout) => {
    setDraft((prev) =>
      prev.map((widget) => {
        const l = layout.find((item) => item.i === widget.i);
        if (!l) return widget;
        return { ...widget, x: l.x, y: l.y, w: l.w, h: l.h };
      }),
    );
  }, []);

  const addWidget = useCallback(
    (widgetId: TId, initialConfig?: Record<string, unknown>) => {
      setDraft((prev) => {
        const def = registry[widgetId];
        const maxY = prev.reduce((max, w) => Math.max(max, w.y + w.h), 0);
        const config = initialConfig ?? def.defaultConfig;
        const instance: WidgetInstance<TId> = {
          i: `${widgetId}-${Date.now().toString(36)}`,
          widgetId,
          x: 0,
          y: maxY,
          w: def.defaultSize.w,
          h: def.defaultSize.h,
          ...(config ? { config } : {}),
        };
        return [...prev, instance];
      });
    },
    [registry],
  );

  const removeWidget = useCallback((instanceId: string) => {
    setDraft((prev) => prev.filter((w) => w.i !== instanceId));
  }, []);

  const updateWidgetConfig = useCallback((instanceId: string, config: Record<string, unknown>) => {
    setDraft((prev) => prev.map((w) => (w.i === instanceId ? { ...w, config } : w)));
  }, []);

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(committed),
    [draft, committed],
  );

  return {
    committed,
    setCommitted,
    draft,
    setDraft,
    editMode,
    setEditMode,
    widgets,
    isDirty,
    clearAll,
    updateLayout,
    addWidget,
    removeWidget,
    updateWidgetConfig,
  };
}
