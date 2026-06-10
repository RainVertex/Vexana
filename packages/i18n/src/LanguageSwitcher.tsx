import { useTranslation } from "react-i18next";
import { useLocale } from "./I18nProvider";
import type { LocaleCode } from "./locales";

interface LanguageSwitcherProps {
  variant?: "select" | "grid";
}

export function LanguageSwitcher({ variant = "select" }: LanguageSwitcherProps) {
  const { locale, setLocale, locales } = useLocale();
  const { t } = useTranslation();

  if (variant === "select") {
    return (
      <label className="flex items-center gap-2 text-xs text-app-text-muted">
        <span className="hidden sm:inline">{t("settings.languageTitle")}</span>
        <span className="relative inline-flex items-center">
          <select
            aria-label={t("settings.languageTitle")}
            value={locale}
            onChange={(e) => setLocale(e.target.value as LocaleCode)}
            className="appearance-none bg-none rounded-md border border-app-border bg-app-surface py-1.5 pl-3 pr-8 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-app-primary"
          >
            {locales.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-muted"
          >
            <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </label>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {locales.map((option) => {
        const active = option.code === locale;
        return (
          <button
            key={option.code}
            type="button"
            onClick={() => setLocale(option.code)}
            aria-pressed={active}
            className={`flex items-center justify-between gap-2 rounded-lg border p-3 text-left transition-colors ${
              active
                ? "border-app-primary bg-app-primary-soft"
                : "border-app-border bg-app-surface hover:bg-app-surface-hover"
            }`}
          >
            <span
              className={`text-sm font-medium ${
                active ? "text-app-primary-soft-foreground" : "text-app-text"
              }`}
            >
              {option.label}
            </span>
            {active && (
              <span className="text-xs font-semibold text-app-primary">{t("common.active")}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
