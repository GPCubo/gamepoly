// useAnalytics — thin wrapper over Firebase Analytics.
// The analytics instance is set by plugins/firebase.client.ts so this file
// never imports from 'firebase/analytics' directly (avoids SSR bundle issues).

type LogEventFn = (analytics: unknown, event: string, params?: Record<string, unknown>) => void

let _analytics: unknown = null
let _logEvent: LogEventFn | null = null

const ALLOWED_EVENTS = new Set([
  "page_view",
  "lobby_opened",
  "table_created",
  "table_joined",
  "multiplayer_game_started",
  "dice_rolled",
  "property_bought",
  "auction_started",
  "auction_bid",
  "auction_won",
  "card_drawn",
  "player_jailed",
  "bankruptcy_triggered",
  "debt_resolution_started",
  "trade_proposed",
  "trade_accepted",
  "game_finished",
  "websocket_connected",
  "websocket_disconnected",
  "websocket_error",
  "client_exception",
])

/** Called once from plugins/firebase.client.ts after Analytics is ready. */
export function setAnalyticsInstance(instance: unknown, logEventFn: LogEventFn) {
  _analytics = instance
  _logEvent = logEventFn
}

export function useAnalytics() {
  function track(
    event: string,
    params?: Record<string, string | number | boolean>,
  ) {
    if (import.meta.server) return
    if (!_analytics || !_logEvent) return
    if (!ALLOWED_EVENTS.has(event)) return
    try {
      _logEvent(_analytics, event, params as Record<string, unknown>)
    } catch {
      // silently ignore
    }
  }

  return { track }
}
