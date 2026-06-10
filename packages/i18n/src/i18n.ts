import i18next, { type i18n as I18nInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./locales/en";
import { tr } from "./locales/tr";
import { fr } from "./locales/fr";
import { de } from "./locales/de";
import { es } from "./locales/es";
import { detectInitialLocale } from "./detect";
import { DEFAULT_LOCALE } from "./locales";

export const SHELL_NS = "shell";

export const i18n: I18nInstance = i18next.createInstance();

void i18n.use(initReactI18next).init({
  resources: {
    en: { [SHELL_NS]: en },
    tr: { [SHELL_NS]: tr },
    fr: { [SHELL_NS]: fr },
    de: { [SHELL_NS]: de },
    es: { [SHELL_NS]: es },
  },
  lng: detectInitialLocale(),
  fallbackLng: DEFAULT_LOCALE,
  defaultNS: SHELL_NS,
  ns: [SHELL_NS],
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
