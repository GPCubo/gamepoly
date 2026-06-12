import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// ─── types (mirrors backend game.GameState) ────────────────────────────────

export interface MPPlayerState {
  id: string
  name: string
  tokenModel: string
  position: number
  cash: number
  inJail: boolean
  jailTurns: number
  consecutiveDoubles: number
  isBot: boolean
  botDifficulty: 'regular' | 'difficult' | null
}

export interface MPPropertyDevelopment {
  houses: number
  hotel: boolean
  mortgaged: boolean
}

export interface MPAuctionState {
  tileIndex: number
  currentBid: number
  leaderId: string
  activeBidders: string[]
  bidderIdx: number
}

export interface MPExchangeProposal {
  fromPlayerId: string
  toPlayerId: string
  offerProperties: number[]
  offerMoney: number
  requestProperties: number[]
  requestMoney: number
  renegotiationCount: number
}

export interface MPGameCard {
  id: string
  group: 'chance' | 'community'
  text: string
  action: string
  amount?: number
  tileIndex?: number
}

export interface MPEconomicHistoryItem {
  id: number
  type: string
  title: string
  detail: string
  amount?: number
  playerIds: string[]
  createdAt: number
}

export interface MPMovementHistoryItem {
  id: number
  playerId: string
  playerName: string
  source: 'dice' | 'card' | string
  diceValues: [number, number]
  diceTotal: number
  from: number
  to: number
  cardId?: string
  cardText?: string
  createdAt: number
}

export interface MPCardHistoryItem {
  id: number
  playerId: string
  playerName: string
  cardId: string
  group: 'chance' | 'community'
  text: string
  action: string
  amount?: number
  tileIndex?: number
  effect: string
  createdAt: number
}

export interface MPGameState {
  phase: 'setup' | 'playing'
  tableId: string
  players: MPPlayerState[]
  activePlayerIndex: number
  isTurnComplete: boolean
  isDoubles: boolean
  diceValues: [number, number]
  statusMessage: string
  goSalary: number
  jailBailCost: number
  canSkipBuy: boolean
  auctionOnly: boolean
  doublesGiveExtraTurn: boolean
  propertyOwners: Record<number, string>
  propertyDevelopments: Record<number, MPPropertyDevelopment>
  bankruptPlayers: string[]
  isAuctionActive: boolean
  auction: MPAuctionState | null
  exchangeProposal: MPExchangeProposal | null
  activeCard: MPGameCard | null
  economicHistory: MPEconomicHistoryItem[]
  movementHistory: MPMovementHistoryItem[]
  cardHistory: MPCardHistoryItem[]
}

export const useMultiplayerStore = defineStore('multiplayer', () => {
  // ─── connection meta ──────────────────────────────────────────────────────
  const tableId = ref('')
  const myPlayerId = ref('')
  const isBotThinking = ref(false)
  const botActionMessage = ref('')
  const playerConnectedEvent = ref<{ playerId: string; name: string } | null>(null)
  const playerDisconnectedEvent = ref<{ playerId: string; gracePeriodMs: number } | null>(null)
  const isCamFollowActive = ref(true)

  // ─── game state (null until connected) ───────────────────────────────────
  const state = ref<MPGameState | null>(null)

  // ─── getters ──────────────────────────────────────────────────────────────

  const phase = computed(() => state.value?.phase ?? 'setup')
  const players = computed(() => state.value?.players ?? [])
  const activePlayerIndex = computed(() => state.value?.activePlayerIndex ?? 0)
  const activePlayer = computed(() => state.value?.players[state.value.activePlayerIndex] ?? null)
  const myPlayer = computed(() => state.value?.players.find(p => p.id === myPlayerId.value) ?? null)
  const isMyTurn = computed(() => activePlayer.value?.id === myPlayerId.value)
  const isCurrentPlayerBot = computed(() => activePlayer.value?.isBot ?? false)
  const isTurnComplete = computed(() => state.value?.isTurnComplete ?? false)
  const isDoubles = computed(() => state.value?.isDoubles ?? false)
  const diceValues = computed(() => state.value?.diceValues ?? [1, 1] as [number, number])
  const diceTotal = computed(() => (state.value?.diceValues[0] ?? 0) + (state.value?.diceValues[1] ?? 0))
  const statusMessage = computed(() => state.value?.statusMessage ?? '')
  const propertyOwners = computed(() => state.value?.propertyOwners ?? {})
  const propertyDevelopments = computed(() => state.value?.propertyDevelopments ?? {})
  const bankruptPlayers = computed(() => state.value?.bankruptPlayers ?? [])
  const isAuctionActive = computed(() => state.value?.isAuctionActive ?? false)
  const auction = computed(() => state.value?.auction ?? null)
  const exchangeProposal = computed(() => state.value?.exchangeProposal ?? null)
  const activeCard = computed(() => state.value?.activeCard ?? null)
  const economicHistory = computed(() => state.value?.economicHistory ?? [])
  const movementHistory = computed(() => state.value?.movementHistory ?? [])
  const cardHistory = computed(() => state.value?.cardHistory ?? [])

  const activePlayers = computed(() =>
    (state.value?.players ?? []).filter(p => !(state.value?.bankruptPlayers ?? []).includes(p.id))
  )

  const winner = computed((): MPPlayerState | null => {
    if (phase.value !== 'playing') return null
    const alive = activePlayers.value
    return alive.length === 1 ? alive[0] : null
  })

  const hasAnyPropertyOwned = computed(() =>
    Object.keys(state.value?.propertyOwners ?? {}).length > 0
  )

  function getPropertyDevelopment(tileIndex: number): MPPropertyDevelopment {
    return state.value?.propertyDevelopments[tileIndex] ?? { houses: 0, hotel: false, mortgaged: false }
  }

  function isBankrupt(playerId: string) {
    return (state.value?.bankruptPlayers ?? []).includes(playerId)
  }

  // ─── mutations (called by socket event handlers) ──────────────────────────

  function applySnapshot(newState: MPGameState) {
    state.value = newState
  }

  function setConnection(tid: string, pid: string) {
    tableId.value = tid
    myPlayerId.value = pid
  }

  function setBotThinking(thinking: boolean, msg = '') {
    isBotThinking.value = thinking
    botActionMessage.value = msg
  }

  function setPlayerConnected(payload: { playerId: string; name: string }) {
    playerConnectedEvent.value = payload
  }

  function setPlayerDisconnected(payload: { playerId: string; gracePeriodMs: number }) {
    playerDisconnectedEvent.value = payload
  }

  function toggleCameraFollow() {
    isCamFollowActive.value = !isCamFollowActive.value
  }

  function reset() {
    state.value = null
    tableId.value = ''
    myPlayerId.value = ''
    isBotThinking.value = false
    botActionMessage.value = ''
    isCamFollowActive.value = true
  }

  return {
    // meta
    tableId,
    myPlayerId,
    isBotThinking,
    botActionMessage,
    playerConnectedEvent,
    playerDisconnectedEvent,
    isCamFollowActive,
    // state
    state,
    // getters
    phase,
    players,
    activePlayerIndex,
    activePlayer,
    myPlayer,
    isMyTurn,
    isCurrentPlayerBot,
    isTurnComplete,
    isDoubles,
    diceValues,
    diceTotal,
    statusMessage,
    propertyOwners,
    propertyDevelopments,
    bankruptPlayers,
    isAuctionActive,
    auction,
    exchangeProposal,
    activeCard,
    economicHistory,
    movementHistory,
    cardHistory,
    activePlayers,
    winner,
    hasAnyPropertyOwned,
    // methods
    getPropertyDevelopment,
    isBankrupt,
    applySnapshot,
    setConnection,
    setBotThinking,
    setPlayerConnected,
    setPlayerDisconnected,
    toggleCameraFollow,
    reset,
  }
})
