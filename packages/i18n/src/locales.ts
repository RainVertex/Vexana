export type LocaleCode = "en" | "tr";

export interface LocaleOption {
  code: LocaleCode;
  label: string;
}

export const SUPPORTED_LOCALES: LocaleOption[] = [
  { code: "en", label: "English" },
  { code: "tr", label: "Türkçe" },
];

export const DEFAULT_LOCALE: LocaleCode = "en";
export const LOCALE_STORAGE_KEY = "mep:locale";

const CODES = new Set<string>(SUPPORTED_LOCALES.map((l) => l.code));

export function isSupportedLocale(value: string): value is LocaleCode {
  return CODES.has(value);
}
