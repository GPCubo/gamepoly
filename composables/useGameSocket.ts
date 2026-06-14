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
const PING_INTERVAL_MS = 3_000

export function useGameSocket() {
  const connected = ref(false)
  const reconnectAttempts = ref(0)
  const lastError = ref<string | null>(null)
  const pingMs = ref<number | null>(null)
  const { track } = useAnalytics()

  let ws: WebSocket | null = null
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let pingTimer: ReturnType<typeof setInterval> | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let tableId = ''
  let playerId = ''
  let messageHandlers: Array<(msg: SocketMessage) => void> = []
  let pingSeq = 0
  const pendingPings = new Map<number, number>()

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
        if (msg.type === 'pong') {
          const payload = msg.payload as { seq?: number } | undefined
          const seq = payload?.seq
          if (typeof seq === 'number' && pendingPings.has(seq)) {
            const startedAt = pendingPings.get(seq) ?? Date.now()
            pendingPings.delete(seq)
            const rtt = Date.now() - startedAt
            pingMs.value = pingMs.value === null
              ? rtt
              : Math.round(pingMs.value * 0.7 + rtt * 0.3)
          }
        }
        messageHandlers.forEach(h => h(msg))
      } catch {
        // ignore malformed messages
      }
    }

    ws.onclose = (event) => {
      connected.value = false
      stopHeartbeat()
      stopPing()
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
    stopPing()
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
    startPing()
  }

  function stopHeartbeat() {
    if (heartbeatTimer !== null) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  function startPing() {
    stopPing()
    pingTimer = setInterval(() => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return
      pingSeq += 1
      pendingPings.set(pingSeq, Date.now())
      send('ping', { seq: pingSeq, sentAt: Date.now() })
      for (const [seq, startedAt] of pendingPings) {
        if (Date.now() - startedAt > 15_000) pendingPings.delete(seq)
      }
    }, PING_INTERVAL_MS)
  }

  function stopPing() {
    if (pingTimer !== null) {
      clearInterval(pingTimer)
      pingTimer = null
    }
    pendingPings.clear()
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
    pingMs,
    connect,
    send,
    disconnect,
    onMessage,
  }
}
