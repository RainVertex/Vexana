import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, isSupportedLocale, type LocaleCode } from "./locales";

// Timezones that map to Turkey. The browser timezone is the closest client-side proxy for location.
const TURKEY_TIMEZONES = new Set(["Europe/Istanbul", "Asia/Istanbul", "Turkey"]);

export function readStoredLocale(): LocaleCode | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && isSupportedLocale(stored)) return stored;
  } catch {
    // localStorage blocked, fall through
  }
  return null;
}

function fromTimezone(): LocaleCode | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TURKEY_TIMEZONES.has(tz)) return "tr";
  } catch {
    // Intl unavailable, fall through
  }
  return null;
}

function fromNavigator(): LocaleCode | null {
  if (typeof navigator === "undefined") return null;
  const langs =
    navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
  for (const lang of langs) {
    if (!lang) continue;
    const base = lang.toLowerCase().split("-")[0];
    if (isSupportedLocale(base)) return base;
  }
  return null;
}

// Precedence: explicit stored choice, then location (timezone), then browser language, then default.
export function detectInitialLocale(): LocaleCode {
  return readStoredLocale() ?? fromTimezone() ?? fromNavigator() ?? DEFAULT_LOCALE;
}
