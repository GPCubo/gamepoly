import { ref, onUnmounted } from 'vue'
import { getWsBaseUrl } from '~/utils/env'
import { useAnalytics } from '~/composables/useAnalytics'

export interface SocketMessage {
  v: number
  type: string
  payload?: unknown
}

export interface SendOptions {
  payload?: Record<string, unknown>
}

const RECONNECT_DELAY_MS = 2000
const MAX_RECONNECT_ATTEMPTS = 5
const HEARTBEAT_INTERVAL_MS = 10_000

export function useGameSocket() {
  const connected = ref(false)
  const reconnectAttempts = ref(0)
  const lastError = ref<string | null>(null)
  const { track } = useAnalytics()

  let ws: WebSocket | null = null
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let tableId = ''
  let playerId = ''
  let messageHandlers: Array<(msg: SocketMessage) => void> = []

  function onMessage(handler: (msg: SocketMessage) => void) {
    messageHandlers.push(handler)
    return () => {
      messageHandlers = messageHandlers.filter(h => h !== handler)
    }
  }

  function connect(tid: string, pid: string, token?: string) {
    tableId = tid
    playerId = pid

    const baseUrl = getWsBaseUrl()
    const url = `${baseUrl}/ws?tableId=${tid}&playerId=${pid}${token ? `&token=${token}` : ''}`

    ws = new WebSocket(url)

    ws.onopen = () => {
      connected.value = true
      reconnectAttempts.value = 0
      lastError.value = null
      startHeartbeat()
      track('websocket_connected')
    }

    ws.onmessage = (event) => {
      try {
        const msg: SocketMessage = JSON.parse(event.data)
        messageHandlers.forEach(h => h(msg))
      } catch {
        // ignore malformed messages
      }
    }

    ws.onclose = (event) => {
      connected.value = false
      stopHeartbeat()
      track('websocket_disconnected', { clean: event.wasClean ? 1 : 0 })
      if (!event.wasClean && reconnectAttempts.value < MAX_RECONNECT_ATTEMPTS) {
        scheduleReconnect()
      }
    }

    ws.onerror = (event) => {
      lastError.value = 'WebSocket error'
      console.error('[GameSocket] error', event)
      track('websocket_error')
    }
  }

  function send(type: string, payload?: Record<string, unknown>) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    const msg: SocketMessage = { v: 1, type, payload }
    ws.send(JSON.stringify(msg))
  }

  function disconnect() {
    stopHeartbeat()
    clearReconnectTimer()
    if (ws) {
      ws.close(1000, 'user disconnect')
      ws = null
    }
    connected.value = false
  }

  function startHeartbeat() {
    heartbeatTimer = setInterval(() => {
      send('heartbeat')
    }, HEARTBEAT_INTERVAL_MS)
  }

  function stopHeartbeat() {
    if (heartbeatTimer !== null) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  function scheduleReconnect() {
    reconnectAttempts.value++
    reconnectTimer = setTimeout(() => {
      connect(tableId, playerId)
    }, RECONNECT_DELAY_MS * reconnectAttempts.value)
  }

  function clearReconnectTimer() {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  onUnmounted(() => {
    disconnect()
  })

  return {
    connected,
    reconnectAttempts,
    lastError,
    connect,
    send,
    disconnect,
    onMessage,
  }
}
