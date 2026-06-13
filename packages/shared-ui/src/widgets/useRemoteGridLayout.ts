// Server-backed widget grid layout state with edit/draft/commit and async save.
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Layout } from "react-grid-layout";
import type { WidgetInstance, WidgetRegistry } from "./types";
import { useGridLayoutCore } from "./useGridLayoutCore";

interface UseRemoteGridLayoutOptions<TId extends string> {
  initialWidgets: WidgetInstance<TId>[];
  registry: WidgetRegistry<TId>;
  /** Persist `draft` to the server. */
  onSave: (widgets: WidgetInstance<TId>[]) => Promise<void>;
  /** When true, edit mode cannot be entered. */
  readOnly?: boolean;
}

export interface UseRemoteGridLayoutResult<TId extends string> {
  widgets: WidgetInstance<TId>[];
  editMode: boolean;
  isDirty: boolean;
  isSaving: boolean;
  saveError: string | null;
  enterEdit: () => void;
  save: () => Promise<void>;
  cancel: () => void;
  clearAll: () => void;
  /** No-op for remote layouts. */
  resetToDefault: () => void;
  updateLayout: (layout: Layout) => void;
  addWidget: (widgetId: TId, initialConfig?: Record<string, unknown>) => void;
  removeWidget: (instanceId: string) => void;
  updateWidgetConfig: (instanceId: string, config: Record<string, unknown>) => void;
}

/** Server-backed twin of `useGridLayout`. */
export function useRemoteGridLayout<TId extends string>({
  initialWidgets,
  registry,
  onSave,
  readOnly = false,
}: UseRemoteGridLayoutOptions<TId>): UseRemoteGridLayoutResult<TId> {
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
  } = useGridLayoutCore(registry, initialWidgets);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Compare initialWidgets by content so an unmemoized but equal array does not reset editMode mid-edit.
  const initialKey = useMemo(() => JSON.stringify(initialWidgets), [initialWidgets]);
  useEffect(() => {
    setCommitted(initialWidgets);
    setDraft(initialWidgets);
    setEditMode(false);
    setSaveError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey]);

  const enterEdit = useCallback(() => {
    if (readOnly) return;
    setDraft(committed);
    setSaveError(null);
    setEditMode(true);
  }, [committed, readOnly, setDraft, setEditMode]);

  const save = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave(draft);
      setCommitted(draft);
      setEditMode(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save layout");
    } finally {
      setIsSaving(false);
    }
  }, [draft, isSaving, onSave, setCommitted, setEditMode]);

  const cancel = useCallback(() => {
    setDraft(committed);
    setSaveError(null);
    setEditMode(false);
  }, [committed, setDraft, setEditMode]);

  const resetToDefault = useCallback(() => {
    // Remote layouts have no inherent default, kept as a no-op for parity with useGridLayout.
  }, []);

  return {
    widgets,
    editMode,
    isDirty,
    isSaving,
    saveError,
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
