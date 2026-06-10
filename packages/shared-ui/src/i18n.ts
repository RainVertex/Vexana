import { registerLocaleBundle } from "@internal/i18n";
import { en } from "./locales/en";
import { tr } from "./locales/tr";

export const UI_NS = "ui";

registerLocaleBundle(UI_NS, { en, tr });
