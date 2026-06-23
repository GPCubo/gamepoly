export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },
  css: ["~/assets/global.css"],
  modules: ["@tresjs/nuxt", "@pinia/nuxt"],
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
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "",
        },
        // Fuentes de texto: en el HTML SSR para que el navegador las
        // descargue durante el parseo inicial (antes se inyectaban tras
        // hidratar el JS, retrasando el render).
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&family=Hanken+Grotesk:wght@400;500;600&display=swap",
        },
        // Iconos Material Symbols: subset SOLO a los iconos usados en la app
        // (icon_names) en vez de la fuente variable completa de varios MB.
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&icon_names=account_balance,account_balance_wallet,add_circle,add_home,apartment,arrow_back,arrow_forward,casino,check,chevron_left,chevron_right,close,fact_check,gavel,groups,handshake,history,home_work,hourglass_empty,location_on,lock_open,login,map,monitoring,navigate_next,not_interested,paid,payments,person,play_arrow,public,real_estate_agent,search,sell,settings,skip_next,smart_toy,stadium,style,swap_horiz,sync_alt,timer,tune,videocam,view_in_ar,warning,wifi,wifi_off&display=block",
        },
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
