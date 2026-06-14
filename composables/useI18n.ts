import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  DEFAULT_LOCALE,
  availableLocales,
  dictionaries,
  isLocaleCode,
  type LocaleCode,
  type TranslationKey,
} from "~/locales";
import { interpolate, translateLegacyText, type I18nParams } from "~/utils/i18nFormat";

// Module-level locale ref — updated reactively from the URL via initLocale().
// tStore() reads this directly (called outside component context).
const locale = ref<LocaleCode>(DEFAULT_LOCALE);
let initialized = false;

function localeFromPath(path: string): LocaleCode {
  if (path === "/en" || path.startsWith("/en/")) return "en" as LocaleCode;
  return DEFAULT_LOCALE;
}

function initLocale() {
  if (initialized) return;
  initialized = true;

  // Set locale from current URL (only source of truth — no localStorage, no browser lang)
  if (typeof window !== "undefined") {
    locale.value = localeFromPath(window.location.pathname);
  }

  if (typeof window !== "undefined") {
    // Keep <html lang> in sync
    watch(locale, (value) => {
      document.documentElement.lang = value;
    }, { immediate: true });
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

  // Capture router and suppress flag HERE (during setup context),
  // so setLocale can use them safely from event handlers.
  let _router: ReturnType<typeof useRouter> | undefined;
  try { _router = useRouter(); } catch { /* not in router context */ }

  const _suppress = useState("localeRedirectSuppressed", () => false);

  // Keep locale ref in sync whenever the route path changes
  if (_router) {
    watch(
      () => _router!.currentRoute.value.path,
      (path) => {
        const derived = localeFromPath(path);
        if (locale.value !== derived) locale.value = derived;
      },
    );
  }

  function setLocale(value: LocaleCode) {
    if (!_router) return;

    // Tell the middleware not to re-add /en/ for this navigation
    _suppress.value = true;

    const path = _router.currentRoute.value.fullPath;
    const bare = path.replace(/^\/en(?=\/|$)/, "") || "/";
    if (value === "en") {
      _router.push("/en" + bare);
    } else {
      _router.push(bare);
    }
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
