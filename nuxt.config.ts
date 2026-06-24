export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },
  css: ["~/assets/global.css"],
  modules: ["@tresjs/nuxt", "@pinia/nuxt"],
  experimental: {
    inlineSSRStyles: true,
  },
  tres: {
    devtools: true,
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (
              id.includes("three") ||
              id.includes("@tresjs") ||
              id.includes("troika")
            ) {
              return "three-vendor";
            }
          },
        },
      },
    },
  },
  app: {
    head: {
      link: [
        // Preload: browser descarga la fuente de iconos en el primer request,
        // antes de parsear CSS, eliminando el flash de texto en iconos.
        {
          rel: "preload",
          as: "font",
          type: "font/woff2",
          crossorigin: "anonymous",
          href: "/fonts/material-symbols-outlined.woff2?v=5",
        },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "",
        },
        // Fuentes de texto: preload no-blocking → no retrasa el FCP
        {
          rel: "preload",
          as: "style",
          href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&family=Hanken+Grotesk:wght@400;500;600&display=swap",
          onload: "this.rel='stylesheet'",
        },
        // Material Symbols self-hosted: public/fonts/material-symbols-outlined.woff2
        // @font-face declarado en assets/global.css
      ],
    },
  },
  runtimeConfig: {
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || "https://gamepoly.app",
      showAllHouses: process.env.NUXT_PUBLIC_SHOW_ALL_HOUSES === "true",
      hideAllHouses: process.env.NUXT_PUBLIC_HIDE_ALL_HOUSES === "true",
      // Firebase Analytics
      firebaseEnabled: process.env.NUXT_PUBLIC_FIREBASE_ENABLED === "true",
      firebaseApiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY || "",
      firebaseAuthDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
      firebaseProjectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || "",
      firebaseStorageBucket:
        process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
      firebaseMessagingSenderId:
        process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
      firebaseAppId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID || "",
      firebaseMeasurementId:
        process.env.NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
      analyticsEnvironment:
        process.env.NUXT_PUBLIC_ANALYTICS_ENVIRONMENT || "production",
    },
  },
  routeRules: {
    "/_nuxt/**": {
      headers: { "cache-control": "public, max-age=31536000, immutable" },
    },
    "/setup": { ssr: false },
    "/game": { ssr: false },
    "/multiplayer/**": { ssr: false },
    "/en/setup": { ssr: false },
    "/en/game": { ssr: false },
    "/en/multiplayer/**": { ssr: false },
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
