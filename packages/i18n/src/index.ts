export { I18nProvider, useLocale } from "./I18nProvider";
export { LanguageSwitcher } from "./LanguageSwitcher";
export { detectInitialLocale, readStoredLocale } from "./detect";
export {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  isSupportedLocale,
  type LocaleCode,
  type LocaleOption,
} from "./locales";
export { i18n, SHELL_NS } from "./i18n";
export { useTranslation, Trans } from "react-i18next";
