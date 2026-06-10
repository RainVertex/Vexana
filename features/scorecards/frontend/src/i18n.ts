import { registerLocaleBundle } from "@internal/i18n";
import { en } from "./locales/en";
import { tr } from "./locales/tr";

export const NS = "scorecards";
registerLocaleBundle(NS, { en, tr });
