import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { WidgetDefinition } from "./types";

interface AddWidgetMenuProps<TId extends string> {
  widgets: WidgetDefinition<TId>[];
  onAdd: (id: TId) => void;
}

export function AddWidgetMenu<TId extends string>({ widgets, onAdd }: AddWidgetMenuProps<TId>) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  // Position the menu under the button. Recompute on open and on scroll/resize so
  // the menu doesn't drift when the page reflows.
  useLayoutEffect(() => {
    if (!open) return;
    function reposition() {
      const b = buttonRef.current;
      if (!b) return;
      const rect = b.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 8, // matches mt-2 (8px)
        right: window.innerWidth - rect.right,
      });
    }
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-app-border bg-app-surface text-sm text-app-text hover:bg-app-surface-hover transition-colors"
      >
        <PlusIcon />
        Add widget
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: coords.top, right: coords.right }}
            className="fixed z-50 w-72 rounded-lg border border-app-border bg-app-surface shadow-lg overflow-hidden"
          >
            <ul className="py-1 max-h-80 overflow-auto">
              {widgets.map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onAdd(w.id);
                      setOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-app-surface-hover transition-colors"
                  >
                    <div className="text-sm font-medium text-app-text">{w.title}</div>
                    <div className="text-xs text-app-text-muted">{w.description}</div>
                  </button>
                </li>
              ))}
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}

function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
