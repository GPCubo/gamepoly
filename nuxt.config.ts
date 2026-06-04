export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },
  css: ["~/assets/global.css"],
  modules: ["@tresjs/nuxt", "@pinia/nuxt"],
  tres: {
    devtools: true,
  },
  routeRules: {
    "/": { ssr: false },
    "/game": { ssr: false },
  },
});
