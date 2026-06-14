import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
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
  // 1. URL path has highest priority (e.g. /en/ → English)
  const path = window.location.pathname;
  if (path === "/en" || path.startsWith("/en/")) return "en" as LocaleCode;
  // 2. Saved locale in localStorage
  const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (isLocaleCode(saved)) return saved;
  // 3. Browser language
  const browserLocale = window.navigator.language?.slice(0, 2).toLowerCase();
  return isLocaleCode(browserLocale) ? browserLocale : DEFAULT_LOCALE;
}

function initLocale() {
  if (initialized) return;
  initialized = true;
  locale.value = detectInitialLocale();

  if (typeof window !== "undefined") {
    // Persist locale and update <html lang> immediately
    watch(
      locale,
      (value) => {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, value);
        document.documentElement.lang = value;
      },
      { immediate: true },
    );

    // Update URL prefix when locale changes (skip initial fire via oldValue check)
    let router: ReturnType<typeof useRouter> | undefined;
    try { router = useRouter(); } catch { /* not in router context */ }

    watch(locale, (value, oldValue) => {
      if (!router || oldValue === undefined) return;
      const path = router.currentRoute.value.fullPath;
      const bare = path.replace(/^\/en(?=\/|$)/, "") || "/";
      if (value === "en" && !path.startsWith("/en")) {
        router.push("/en" + bare);
      } else if (value !== "en" && path.startsWith("/en")) {
        router.push(bare);
      }
    });
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
