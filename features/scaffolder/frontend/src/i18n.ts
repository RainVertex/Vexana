import { registerLocaleBundle } from "@internal/i18n";
import { en } from "./locales/en";
import { tr } from "./locales/tr";

export const NS = "scaffolder";
registerLocaleBundle(NS, { en, tr });
