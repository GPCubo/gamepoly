// Preserves the /en/ URL prefix across all internal navigations.
// When the user is on /en/game and clicks a link to /setup,
// this middleware redirects to /en/setup automatically.
//
// Language switching bypasses this via the localeRedirectSuppressed flag
// set by setLocale() in useI18n.ts.
export default defineNuxtRouteMiddleware((to, from) => {
  // Allow explicit language switches (setLocale sets this flag)
  const suppress = useState("localeRedirectSuppressed", () => false);
  if (suppress.value) {
    suppress.value = false;
    return;
  }

  const fromIsEn =
    from?.path === "/en" || (from?.path?.startsWith("/en/") ?? false);
  const toIsEn = to.path === "/en" || to.path.startsWith("/en/");

  if (fromIsEn && !toIsEn) {
    // Use fullPath to preserve query params (e.g. ?tableId=...&playerId=...)
    return navigateTo("/en" + to.fullPath, { replace: true });
  }
});
