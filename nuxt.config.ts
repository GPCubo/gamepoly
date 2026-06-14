export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },
  css: ["~/assets/global.css"],
  modules: ["@tresjs/nuxt", "@pinia/nuxt"],
  tres: {
    devtools: true,
  },
  runtimeConfig: {
    public: {
      showAllHouses: process.env.NUXT_PUBLIC_SHOW_ALL_HOUSES === "true",
      hideAllHouses: process.env.NUXT_PUBLIC_HIDE_ALL_HOUSES === "true",
      // Firebase Analytics
      firebaseEnabled: process.env.NUXT_PUBLIC_FIREBASE_ENABLED === "true",
      firebaseApiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY || "",
      firebaseAuthDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
      firebaseProjectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || "",
      firebaseStorageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
      firebaseMessagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
      firebaseAppId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID || "",
      firebaseMeasurementId: process.env.NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
      analyticsEnvironment: process.env.NUXT_PUBLIC_ANALYTICS_ENVIRONMENT || "production",
    },
  },
  routeRules: {
    "/": { ssr: false },
    "/setup": { ssr: false },
    "/game": { ssr: false },
    "/multiplayer/**": { ssr: false },
    "/en/**": { ssr: false },
  },
  hooks: {
    // Mirror every page route under /en/* so the Vue router recognises
    // /en/game, /en/setup, etc. and renders the same component.
    // Locale detection in useI18n reads the /en/ prefix from the URL.
    "pages:extend"(pages) {
      const enPages = pages
        .filter((p) => !p.path.startsWith("/en"))
        .map((p) => ({
          ...p,
          name: `en_${String(p.name ?? p.path)}`,
          path: `/en${p.path}`,
        }));
      pages.push(...enPages);
    },
  },
});
