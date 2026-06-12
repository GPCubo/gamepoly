// useClientErrors — captures frontend errors and sends them to the backend.
// Call initClientErrors() once from the firebase plugin before using captureError().

import { getApiBaseUrl } from "~/utils/env"

export interface ClientErrorPayload {
  occurredAt: string
  environment: string
  releaseVersion?: string
  source: "vue" | "window" | "unhandled_rejection" | "manual"
  severity: "error" | "warning" | "info"
  message: string
  errorName?: string
  stack?: string
  route?: string
  tableId?: string
  playerIdHash?: string
  eventName: string
  context?: Record<string, unknown>
}

interface ClientErrorConfig {
  apiBase: string
  enabled: boolean
  environment: string
  releaseVersion: string
}

let _config: ClientErrorConfig = {
  apiBase: "",
  enabled: false,
  environment: "production",
  releaseVersion: "",
}

/** Called once from plugins/firebase.client.ts. */
export function initClientErrors(cfg: ClientErrorConfig) {
  _config = cfg
}

export function useClientErrors(opts?: { tableId?: string }) {
  async function reportError(payload: ClientErrorPayload) {
    if (!_config.enabled || !_config.apiBase || import.meta.server) return
    try {
      await fetch(`${_config.apiBase}/api/v1/client-errors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    } catch {
      // silently ignore — error reporting must never break the app
    }
  }

  function captureError(
    error: unknown,
    source: ClientErrorPayload["source"],
    context?: Record<string, unknown>,
  ) {
    const err = error instanceof Error ? error : new Error(String(error))
    reportError({
      occurredAt: new Date().toISOString(),
      environment: _config.environment,
      releaseVersion: _config.releaseVersion || undefined,
      source,
      severity: "error",
      message: err.message.slice(0, 500),
      errorName: err.name,
      stack: err.stack?.slice(0, 5000),
      route: typeof window !== "undefined" ? window.location.pathname : undefined,
      tableId: opts?.tableId,
      eventName: "client_exception",
      context,
    })
  }

  return { reportError, captureError }
}
