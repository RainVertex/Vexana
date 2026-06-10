import { i18n } from "./i18n";
import type { LocaleCode } from "./locales";

// Lets a feature register its own namespace bundle on the shared instance (packages cannot import features).
export function registerLocaleBundle(
  ns: string,
  bundles: Partial<Record<LocaleCode, Record<string, unknown>>>,
): void {
  for (const code of Object.keys(bundles) as LocaleCode[]) {
    const resources = bundles[code];
    if (resources) i18n.addResourceBundle(code, ns, resources, true, true);
  }
}
