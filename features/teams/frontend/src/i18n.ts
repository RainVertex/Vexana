import { registerLocaleBundle } from "@internal/i18n";
import { en } from "./locales/en";
import { tr } from "./locales/tr";

export const NS = "teams";
registerLocaleBundle(NS, { en, tr });
