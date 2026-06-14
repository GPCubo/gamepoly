import es from "./es";
import en from "./en";

export const DEFAULT_LOCALE = "es";

export const LOCALE_STORAGE_KEY = "gamepoly.locale";

export const dictionaries = {
  es,
  en,
} as const;

export type LocaleCode = keyof typeof dictionaries;
export type TranslationKey = keyof typeof es;

export interface LocaleOption {
  code: LocaleCode;
  labelKey: TranslationKey;
}

export const availableLocales: LocaleOption[] = [
  { code: "es", labelKey: "language.es" },
  { code: "en", labelKey: "language.en" },
];

export function isLocaleCode(value: string | null | undefined): value is LocaleCode {
  return Boolean(value && value in dictionaries);
}
