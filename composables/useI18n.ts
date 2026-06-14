import { computed, ref, watch } from "vue";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  availableLocales,
  dictionaries,
  isLocaleCode,
  type LocaleCode,
  type TranslationKey,
} from "~/locales";
import { interpolate, translateLegacyText, type I18nParams } from "~/utils/i18nFormat";

const locale = ref<LocaleCode>(DEFAULT_LOCALE);
let initialized = false;

function detectInitialLocale(): LocaleCode {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (isLocaleCode(saved)) return saved;
  const browserLocale = window.navigator.language?.slice(0, 2).toLowerCase();
  return isLocaleCode(browserLocale) ? browserLocale : DEFAULT_LOCALE;
}

function initLocale() {
  if (initialized) return;
  initialized = true;
  locale.value = detectInitialLocale();

  if (typeof window !== "undefined") {
    watch(
      locale,
      (value) => {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, value);
        document.documentElement.lang = value;
      },
      { immediate: true },
    );
  }
}

export function tStore(key: TranslationKey, params?: I18nParams): string {
  const dictionary = dictionaries[locale.value];
  const fallback = dictionaries[DEFAULT_LOCALE];
  return interpolate(dictionary[key] ?? fallback[key] ?? key, params);
}

export function useI18n() {
  initLocale();

  const currentLocale = computed(() => locale.value);

  function setLocale(value: LocaleCode) {
    locale.value = value;
  }

  function t(key: TranslationKey, params?: I18nParams) {
    const dictionary = dictionaries[locale.value];
    const fallback = dictionaries[DEFAULT_LOCALE];
    return interpolate(dictionary[key] ?? fallback[key] ?? key, params);
  }

  function hasTranslation(key: string): key is TranslationKey {
    return key in dictionaries[DEFAULT_LOCALE];
  }

  function tMaybe(key: string, params?: I18nParams) {
    return hasTranslation(key) ? t(key, params) : key;
  }

  function td(text: string) {
    return translateLegacyText(text, t);
  }

  function tileName(index: number, fallback = "") {
    const key = `tile.${index}.name` as any;
    return hasTranslation(key) ? t(key, {}) : fallback;
  }

  function tileShortName(index: number, fallback = "") {
    const key = `tile.${index}.short` as any;
    if (hasTranslation(key)) return t(key, {});
    return tileName(index, fallback);
  }

  function cardText(id: string, params?: I18nParams, fallback = "") {
    const key = `card.${id}.text`;
    const translated = tMaybe(key, params);
    return translated === key ? fallback : translated;
  }

  return {
    availableLocales,
    locale: currentLocale,
    setLocale,
    t,
    tMaybe,
    td,
    tileName,
    tileShortName,
    cardText,
  };
}
