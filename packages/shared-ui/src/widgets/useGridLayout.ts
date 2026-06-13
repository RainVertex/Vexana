// localStorage-backed widget grid layout state with edit/draft/commit flow.
import { useCallback, useEffect } from "react";
import type { Layout } from "react-grid-layout";
import type { WidgetInstance, WidgetRegistry } from "./types";
import { useGridLayoutCore } from "./useGridLayoutCore";

interface UseGridLayoutOptions<TId extends string> {
  storageKey: string;
  defaultWidgets: WidgetInstance<TId>[];
  registry: WidgetRegistry<TId>;
}

export interface UseGridLayoutResult<TId extends string> {
  widgets: WidgetInstance<TId>[];
  editMode: boolean;
  isDirty: boolean;
  enterEdit: () => void;
  save: () => void;
  cancel: () => void;
  clearAll: () => void;
  resetToDefault: () => void;
  updateLayout: (layout: Layout) => void;
  addWidget: (widgetId: TId, initialConfig?: Record<string, unknown>) => void;
  removeWidget: (instanceId: string) => void;
  updateWidgetConfig: (instanceId: string, config: Record<string, unknown>) => void;
}

export function useGridLayout<TId extends string>({
  storageKey,
  defaultWidgets,
  registry,
}: UseGridLayoutOptions<TId>): UseGridLayoutResult<TId> {
  const readStored = useCallback((): WidgetInstance<TId>[] => {
    if (typeof window === "undefined") return defaultWidgets;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return defaultWidgets;
      const parsed = JSON.parse(raw) as WidgetInstance<TId>[];
      if (!Array.isArray(parsed) || parsed.length === 0) return defaultWidgets;
      return parsed.filter((w) => w && registry[w.widgetId]);
    } catch {
      return defaultWidgets;
    }
  }, [storageKey, defaultWidgets, registry]);

  const persist = useCallback(
    (widgets: WidgetInstance<TId>[]) => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(widgets));
      } catch {
        // ignore
      }
    },
    [storageKey],
  );

  const {
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
  } = useGridLayoutCore(registry, readStored);

  // Reload from storage when the key changes (navigating between entities).
  useEffect(() => {
    const next = readStored();
    setCommitted(next);
    setDraft(next);
    setEditMode(false);
  }, [readStored, setCommitted, setDraft, setEditMode]);

  useEffect(() => {
    if (!editMode) persist(committed);
  }, [committed, editMode, persist]);

  const enterEdit = useCallback(() => {
    setDraft(committed);
    setEditMode(true);
  }, [committed, setDraft, setEditMode]);

  const save = useCallback(() => {
    setCommitted(draft);
    setEditMode(false);
  }, [draft, setCommitted, setEditMode]);

  const cancel = useCallback(() => {
    setDraft(committed);
    setEditMode(false);
  }, [committed, setDraft, setEditMode]);

  const resetToDefault = useCallback(() => {
    setCommitted(defaultWidgets);
    setDraft(defaultWidgets);
  }, [defaultWidgets, setCommitted, setDraft]);

  return {
    widgets,
    editMode,
    isDirty,
    enterEdit,
    save,
    cancel,
    clearAll,
    resetToDefault,
    updateLayout,
    addWidget,
    removeWidget,
    updateWidgetConfig,
  };
}
