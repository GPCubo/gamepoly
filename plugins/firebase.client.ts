// Firebase Analytics — client-only plugin (never runs on the server).
// The .client.ts suffix guarantees Nuxt will only execute this in the browser.

import { initializeApp, getApps } from "firebase/app"
import { getAnalytics, isSupported, logEvent } from "firebase/analytics"
import { setAnalyticsInstance } from "~/composables/useAnalytics"
import { initClientErrors, useClientErrors } from "~/composables/useClientErrors"
import { getApiBaseUrl } from "~/utils/env"

export default defineNuxtPlugin(async (nuxtApp) => {
  const config = useRuntimeConfig()

  // 1. Initialise client-error reporting (independent of Firebase).
  initClientErrors({
    apiBase: getApiBaseUrl(),
    enabled: import.meta.env.VITE_CLIENT_ERROR_REPORTING_ENABLED !== "false",
    environment: (config.public.analyticsEnvironment as string) || "production",
    releaseVersion: import.meta.env.VITE_APP_RELEASE_VERSION || "",
  })

  const { captureError } = useClientErrors()

  // 2. Hook Vue error handler.
  const vueApp = nuxtApp.vueApp
  const prevVueHandler = vueApp.config.errorHandler
  vueApp.config.errorHandler = (err: unknown, instance: unknown, info: string) => {
    captureError(err, "vue", { info })
    prevVueHandler?.(err, instance, info)
  }

  // 3. Hook window error handlers.
  window.addEventListener("error", (e: ErrorEvent) => {
    captureError(e.error ?? new Error(e.message), "window", {
      filename: e.filename,
      lineno: e.lineno,
    })
  })
  window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
    captureError(e.reason, "unhandled_rejection")
  })

  // 4. Initialise Firebase Analytics (skipped when not configured).
  if (!(config.public.firebaseEnabled as boolean) || !(config.public.firebaseApiKey as string)) {
    return
  }

  const supported = await isSupported()
  if (!supported) return

  const firebaseConfig = {
    apiKey:             config.public.firebaseApiKey as string,
    authDomain:         config.public.firebaseAuthDomain as string,
    projectId:          config.public.firebaseProjectId as string,
    storageBucket:      config.public.firebaseStorageBucket as string,
    messagingSenderId:  config.public.firebaseMessagingSenderId as string,
    appId:              config.public.firebaseAppId as string,
    measurementId:      config.public.firebaseMeasurementId as string,
  }

  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
  const analytics = getAnalytics(app)
  setAnalyticsInstance(analytics, logEvent as (analytics: unknown, event: string, params?: Record<string, unknown>) => void)
})
