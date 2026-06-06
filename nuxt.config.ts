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
    },
  },
  routeRules: {
    "/": { ssr: false },
    "/game": { ssr: false },
  },
});
