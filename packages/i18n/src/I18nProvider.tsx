// Locale context: reads/persists the active locale and applies it to <html lang>. Mirrors ThemeProvider.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { I18nextProvider } from "react-i18next";
import { i18n } from "./i18n";
import { detectInitialLocale } from "./detect";
import {
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  isSupportedLocale,
  type LocaleCode,
  type LocaleOption,
} from "./locales";

interface LocaleContextValue {
  locale: LocaleCode;
  setLocale: (code: LocaleCode) => void;
  locales: LocaleOption[];
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function I18nProvider({ children }: PropsWithChildren) {
  const [locale, setLocaleState] = useState<LocaleCode>(() => {
    const initial = detectInitialLocale();
    if (i18n.language !== initial) void i18n.changeLanguage(initial);
    return initial;
  });

  useEffect(() => {
    document.documentElement.setAttribute("lang", locale);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // ignore persistence failure
    }
  }, [locale]);

  const setLocale = useCallback((code: LocaleCode) => {
    if (!isSupportedLocale(code)) return;
    void i18n.changeLanguage(code);
    setLocaleState(code);
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, locales: SUPPORTED_LOCALES }),
    [locale, setLocale],
  );

  return (
    <I18nextProvider i18n={i18n}>
      <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
    </I18nextProvider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside <I18nProvider>");
  return ctx;
}
