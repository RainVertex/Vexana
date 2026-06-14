import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "@internal/i18n";
import { useTheme } from "./ThemeContext";
import type { ThemeId, ThemeOption } from "./themes";

interface ThemeSwitcherProps {
  variant?: "select" | "grid";
}

export function ThemeSwitcher({ variant = "select" }: ThemeSwitcherProps) {
  const { theme, setTheme, themes } = useTheme();
  const { t } = useTranslation();

  const themeLabel = (option: ThemeOption) =>
    t(`themes.${option.id}.label`, { defaultValue: option.label });
  const themeDescription = (option: ThemeOption) =>
    t(`themes.${option.id}.description`, { defaultValue: option.description });

  if (variant === "select") {
    return (
      <ThemeSelect
        themes={themes}
        value={theme}
        onSelect={setTheme}
        label={t("settings.themeLabel")}
        renderLabel={themeLabel}
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {themes.map((option) => {
        const active = option.id === theme;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setTheme(option.id)}
            aria-pressed={active}
            className={`text-left rounded-lg border p-3 transition-colors ${
              active
                ? "border-app-primary bg-app-primary-soft"
                : "border-app-border bg-app-surface hover:bg-app-surface-hover"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={`text-sm font-medium ${
                  active ? "text-app-primary-soft-foreground" : "text-app-text"
                }`}
              >
                {themeLabel(option)}
              </span>
              {active && (
                <span className="text-xs font-semibold text-app-primary">{t("common.active")}</span>
              )}
            </div>
            <div className="mt-1 text-xs text-app-text-muted">{themeDescription(option)}</div>
            <div className="mt-3 flex gap-1.5" aria-hidden>
              <Swatch color={option.swatch.bg} />
              <Swatch color={option.swatch.surface} />
              <Swatch color={option.swatch.primary} />
              <Swatch color={option.swatch.accent} />
              <Swatch color={option.swatch.success} />
              <Swatch color={option.swatch.danger} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

interface ThemeSelectProps {
  themes: ThemeOption[];
  value: ThemeId;
  onSelect: (id: ThemeId) => void;
  label: string;
  renderLabel: (option: ThemeOption) => string;
}

function ThemeSelect({ themes, value, onSelect, label, renderLabel }: ThemeSelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  const selectedIndex = Math.max(
    0,
    themes.findIndex((option) => option.id === value),
  );
  const active = themes[selectedIndex];

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(selectedIndex);
    listRef.current?.focus();
  }, [open, selectedIndex]);

  // Keep the highlighted option scrolled into view as it moves.
  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    node?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  function commit(index: number) {
    const option = themes[index];
    if (option) onSelect(option.id);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onButtonKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      setOpen(true);
    }
  }

  function onListKeyDown(e: KeyboardEvent<HTMLUListElement>) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(themes.length - 1, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(themes.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(activeIndex);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onButtonKeyDown}
        className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-focus-ring ${
          open
            ? "border-app-border-strong bg-app-surface-hover text-app-text"
            : "border-app-border bg-app-surface text-app-text hover:bg-app-surface-hover"
        }`}
      >
        <span
          aria-hidden
          className="h-3 w-3 shrink-0 rounded-full border border-app-border"
          style={{ backgroundColor: active.swatch.primary }}
        />
        <span className="min-w-16 text-left">{renderLabel(active)}</span>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={`h-4 w-4 text-app-text-muted transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-activedescendant={`${listboxId}-${activeIndex}`}
          onKeyDown={onListKeyDown}
          className="absolute left-0 top-full z-50 mt-2 max-h-80 w-full overflow-y-auto rounded-app-lg border border-app-border bg-app-surface p-1 shadow-app-lg focus:outline-none"
        >
          {themes.map((option, index) => {
            const isSelected = index === selectedIndex;
            const isActive = index === activeIndex;
            return (
              <li
                key={option.id}
                id={`${listboxId}-${index}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => commit(index)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex cursor-pointer items-center gap-2.5 rounded-app-md px-2.5 py-1.5 text-sm text-app-text transition-colors ${
                  isActive ? "bg-app-surface-hover" : ""
                } ${isSelected ? "font-medium" : ""}`}
              >
                <span
                  aria-hidden
                  className="h-3.5 w-3.5 shrink-0 rounded-full border border-app-border"
                  style={{ backgroundColor: option.swatch.primary }}
                />
                <span className="flex-1 truncate">{renderLabel(option)}</span>
                {isSelected && (
                  <svg
                    aria-hidden
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4 shrink-0 text-app-primary"
                  >
                    <path d="M5 10l3.5 3.5L15 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Swatch({ color }: { color: string }) {
  return (
    <span
      className="h-5 w-5 rounded-md border border-app-border"
      style={{ backgroundColor: color }}
    />
  );
}
