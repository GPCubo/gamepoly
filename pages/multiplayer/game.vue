<template>
  <div class="mp-game-page">
    <!-- Connection overlay -->
    <div v-if="!socket.connected.value" class="conn-overlay">
      <div class="conn-card">
        <span class="material-symbols-outlined conn-icon">wifi_off</span>
        <p v-if="socket.reconnectAttempts.value > 0">
          Reconectando... (intento {{ socket.reconnectAttempts.value }}/5)
        </p>
        <p v-else>Conectando al servidor...</p>
      </div>
    </div>

    <!-- Winner overlay -->
    <div v-if="mpStore.winner" class="winner-overlay">
      <div class="winner-card">
        <span class="material-symbols-outlined winner-icon">emoji_events</span>
        <h2>¡{{ mpStore.winner.name }} ganó!</h2>
        <button class="action-btn" @click="navigateTo('/multiplayer/lobby')">
          Volver al lobby
        </button>
      </div>
    </div>

    <ClientOnly>
      <TresCanvas
        shadows
        clear-color="#1a1a2e"
        class="mp-board-canvas"
      >
        <TresPerspectiveCamera
          :position="[12, 15, 12]"
          :fov="45"
          :near="0.1"
          :far="1000"
        />
        <OrbitControls
          :enable-damping="true"
          :target="[0, 0, 0]"
        />
        <TresAmbientLight :intensity="1.8" />
        <TresDirectionalLight
          :position="[10, 20, 10]"
          :intensity="2"
          cast-shadow
        />
        <primitive
          v-if="tableroScene"
          :object="tableroScene"
          :position="[0, 0, 0]"
          :scale="1"
        />
        <template v-for="(scene, idx) in playerScenes" :key="playerSceneKeys[idx] ?? idx">
          <primitive
            v-if="scene && mpStore.players[idx] && !mpStore.bankruptPlayers.includes(mpStore.players[idx].id)"
            :object="scene"
            :position="[
              playerBoardPositions[idx]?.x ?? 0,
              playerBoardPositions[idx]?.y ?? 0,
              playerBoardPositions[idx]?.z ?? 0,
            ]"
            :scale="playerBoardScales[idx] ?? GAME_CONFIG.DEFAULT_SCALE"
          />
        </template>
      </TresCanvas>
      <div v-if="mpStore.state && !tableroScene && !boardLoadError" class="board-loading">
        Cargando mapa...
      </div>
      <div v-if="boardLoadError" class="board-loading board-error">
        No se pudo cargar el mapa 3D.
      </div>
    </ClientOnly>

    <!-- Connected players HUD -->
    <div class="players-hud" v-if="mpStore.state">
      <div class="players-hud-title">
        <span>Jugadores</span>
        <strong>{{ mpStore.players.length }}</strong>
      </div>
      <div
        v-for="(p, idx) in mpStore.players"
        :key="p.id"
        class="hud-player"
        :class="{
          'hud-active': p.id === mpStore.activePlayer?.id,
          'hud-bankrupt': mpStore.isBankrupt(p.id),
          'hud-me': p.id === mpStore.myPlayerId,
        }"
      >
        <span class="hud-icon">{{ tokenIcon(p.tokenModel, idx) }}</span>
        <div class="hud-copy">
          <span class="hud-name">
            {{ p.name }}
            <span v-if="p.isBot" class="hud-bot-badge" :class="p.botDifficulty === 'difficult' ? 'bot-hard' : 'bot-regular'">
              {{ p.botDifficulty === 'difficult' ? 'Difícil' : 'Regular' }}
            </span>
            <span v-if="p.id === mpStore.myPlayerId" class="hud-you-badge">Tú</span>
          </span>
          <span class="hud-position">Casilla {{ (p.position % 40) + 1 }}/40</span>
        </div>
        <span class="hud-cash" :class="{ 'hud-negative': p.cash < 0 }">
          ${{ p.cash.toLocaleString() }}
        </span>
      </div>
    </div>

    <!-- Status + action bar -->
    <div class="overlay-container" v-if="mpStore.state">
      <div class="status-card">
        <div class="status-player">
          <span class="status-token">{{ activeTokenIcon }}</span>
          <div>
            <span class="status-kicker">Turno actual</span>
            <strong>{{ mpStore.activePlayer?.name ?? '—' }}</strong>
          </div>
        </div>
        <div class="status-details">
          <span class="status-chip">
            <span class="material-symbols-outlined">location_on</span>
            Casilla {{ currentPosition }}/40
          </span>
          <span v-if="mpStore.isDoubles" class="doubles-badge">DOBLES</span>
          <span v-if="!socket.connected.value" class="offline-badge">
            <span class="material-symbols-outlined">wifi_off</span>
          </span>
        </div>
        <p>{{ mpStore.statusMessage }}</p>
      </div>

      <div class="action-buttons">
        <!-- Bot thinking -->
        <div v-if="mpStore.isBotThinking" class="bot-thinking-indicator">
          <span class="material-symbols-outlined bot-thinking-icon">smart_toy</span>
          <span>{{ mpStore.botActionMessage || 'Bot pensando...' }}</span>
        </div>

        <template v-else-if="mpStore.isMyTurn && !mpStore.isTurnComplete">
          <!-- Bail -->
          <button
            v-if="myPlayer?.inJail"
            class="action-btn bail-btn"
            :disabled="(myPlayer?.cash ?? 0) < (mpStore.state?.jailBailCost ?? 50)"
            @click="send('pay_bail')"
          >
            <span class="material-symbols-outlined">lock_open</span>
            Pagar fianza (${{ mpStore.state?.jailBailCost ?? 50 }})
          </button>

          <!-- Roll -->
          <button class="action-btn roll-btn" @click="send('roll_dice')">
            <span class="material-symbols-outlined">casino</span>
            Tirar Dados
          </button>
        </template>

        <template v-else-if="mpStore.isMyTurn && mpStore.isTurnComplete">
          <button class="action-btn next-btn" @click="send('next_turn')">
            <span class="material-symbols-outlined">navigate_next</span>
            Siguiente
          </button>
        </template>

        <template v-else-if="!mpStore.isMyTurn && !mpStore.isCurrentPlayerBot">
          <div class="waiting-indicator">
            <span class="material-symbols-outlined">hourglass_empty</span>
            Esperando a {{ mpStore.activePlayer?.name }}...
          </div>
        </template>
      </div>
    </div>

    <!-- Buy decision (landing on unowned property) -->
    <div v-if="showBuyPrompt && mpStore.isMyTurn" class="buy-overlay">
      <div class="buy-card">
        <h3>{{ buyTileName }}</h3>
        <p class="buy-price">${{ buyTilePrice }}</p>
        <div class="buy-actions">
          <button v-if="!mpStore.state?.auctionOnly" class="action-btn roll-btn" @click="confirmBuy">
            <span class="material-symbols-outlined">shopping_cart</span>
            Comprar
          </button>
          <button class="action-btn config-btn" @click="passBuy">
            <span class="material-symbols-outlined">gavel</span>
            {{ mpStore.state?.canSkipBuy ? 'Pasar / Subastar' : 'Subastar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Card overlay -->
    <div v-if="mpStore.activeCard && mpStore.isMyTurn" class="card-overlay">
      <div class="card-card">
        <span class="card-group">{{ mpStore.activeCard.group === 'chance' ? '🃏 Suerte' : '📦 Arca Comunal' }}</span>
        <p class="card-text">{{ mpStore.activeCard.text }}</p>
        <button class="action-btn roll-btn" @click="send('accept_card')">
          Aceptar
        </button>
      </div>
    </div>

    <!-- Auction -->
    <div v-if="mpStore.isAuctionActive && mpStore.auction" class="auction-overlay">
      <div class="auction-card">
        <div class="auction-header-section">
          <span class="auction-tag">🔨 Subasta</span>
          <strong>{{ auctionTileName }}</strong>
        </div>
        <div class="auction-bid-info">
          <div>
            <span class="bid-label">Puja actual</span>
            <span class="bid-amount">${{ mpStore.auction.currentBid }}</span>
          </div>
          <div>
            <span class="bid-label">Turno</span>
            <span class="bid-bidder">{{ currentAuctionBidderName }}</span>
          </div>
        </div>
        <div v-if="isMyAuctionTurn" class="auction-actions">
          <button
            v-for="inc in [10, 50, 100]"
            :key="inc"
            class="bid-btn"
            :disabled="(myPlayer?.cash ?? 0) < mpStore.auction.currentBid + inc"
            @click="send('place_bid', { increment: inc })"
          >
            +${{ inc }}<br/><small>${{ mpStore.auction.currentBid + inc }}</small>
          </button>
        </div>
        <button
          v-if="isMyAuctionTurn"
          class="pass-bid-btn"
          @click="send('pass_bid')"
        >
          Pasar turno
        </button>
        <p v-else class="waiting-auction">
          Esperando a {{ currentAuctionBidderName }}...
        </p>
      </div>
    </div>

    <!-- Connection status badge -->
    <div class="conn-badge" :class="{ online: socket.connected.value, offline: !socket.connected.value }">
      <span class="material-symbols-outlined">{{ socket.connected.value ? 'wifi' : 'wifi_off' }}</span>
      {{ socket.connected.value ? 'En línea' : 'Desconectado' }}
    </div>

    <!-- Dice display -->
    <div v-if="diceVisible" class="dado-wrapper">
      <div class="dado-titulo">
        Total: {{ mpStore.diceTotal }} | Casilla: {{ currentPosition }}/40
        <span v-if="mpStore.isDoubles" class="doubles-text"> DOBLES </span>
      </div>
      <div class="dados-row">
        <div v-for="(val, idx) in mpStore.diceValues" :key="idx" class="dado-pequeno">
          {{ val }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, onMounted, onUnmounted, watch } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { Group } from 'three'
import { useMultiplayerStore } from '~/stores/multiplayerStore'
import { useGameSocket } from '~/composables/useGameSocket'
import { useBoardGeometry } from '~/composables/useBoardGeometry'
import { GAME_CONFIG } from '~/config/gameConfig'
import { BOARD_TILES } from '~/config/boardTilesConfig'

const mpStore = useMultiplayerStore()
const socket = useGameSocket()
const route = useRoute()

const tableId = route.query.tableId as string
const playerId = route.query.playerId as string

const showBuyPrompt = ref(false)
const buyTileIndex = ref(0)
const diceVisible = ref(false)
const tableroScene = shallowRef<Group | null>(null)
const playerScenes = shallowRef<(Group | null)[]>([])
const boardLoadError = ref(false)
const playerSceneKeys = computed(() => mpStore.players.map((p, idx) => `${p.id}:${normalizedTokenModel(p.tokenModel, idx)}`))
const { getCasillaCoordinates } = useBoardGeometry()
let diceHideTimer: ReturnType<typeof setTimeout> | null = null
let loadedTokenSignature = ''
let boardLoadRequestId = 0

const normalizedPlayerTiles = computed(() =>
  mpStore.players.map(player => ((player.position % 40) + 40) % 40)
)

const playerBoardPositions = computed(() =>
  mpStore.players.map((player, idx) => {
    const tile = ((player.position % 40) + 40) % 40
    const base = getCasillaCoordinates(tile)
    const offset = sharedBoardOffset(idx)
    return {
      x: base.x + offset.x,
      y: base.y,
      z: base.z + offset.z,
    }
  })
)

const playerBoardScales = computed(() =>
  mpStore.players.map((_, idx) =>
    playerSharesTile(idx) ? GAME_CONFIG.SHARED_TILE_SCALE : GAME_CONFIG.DEFAULT_SCALE
  )
)

const currentPosition = computed(() => {
  const p = mpStore.activePlayer
  if (!p) return 0
  return ((p.position % 40) + 40) % 40 + 1
})

const myPlayer = computed(() => mpStore.myPlayer)

const activeTokenIcon = computed(() => {
  const p = mpStore.activePlayer
  if (!p) return '?'
  return tokenIcon(p.tokenModel, mpStore.activePlayerIndex)
})

function tokenConfig(file: string | undefined, idx = 0) {
  return GAME_CONFIG.TOKEN_MODELS.find(t => t.file === file)
    ?? GAME_CONFIG.TOKEN_MODELS[idx % GAME_CONFIG.TOKEN_MODELS.length]
    ?? GAME_CONFIG.TOKEN_MODELS[0]
}

function normalizedTokenModel(file: string | undefined, idx = 0) {
  return tokenConfig(file, idx)?.file ?? 'sombrero.glb'
}

function tokenIcon(file: string | undefined, idx = 0) {
  return tokenConfig(file, idx)?.icon ?? '?'
}

function playerSharesTile(idx: number) {
  const tile = normalizedPlayerTiles.value[idx]
  return normalizedPlayerTiles.value.some((candidate, i) => i !== idx && candidate === tile)
}

function sharedBoardOffset(idx: number): { x: number; z: number } {
  const tile = normalizedPlayerTiles.value[idx]
  const group = normalizedPlayerTiles.value
    .map((candidate, i) => ({ idx: i, tile: candidate }))
    .filter(candidate => candidate.tile === tile)

  if (group.length <= 1) return { x: 0, z: 0 }

  const posInGroup = group.findIndex(candidate => candidate.idx === idx)
  const angle = (posInGroup / group.length) * 2 * Math.PI
  const radius = GAME_CONFIG.SAME_TILE_SPACING

  return {
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
  }
}

async function loadBoardAssets() {
  if (typeof window === 'undefined') return

  const tokenModels = mpStore.players.map((player, idx) => normalizedTokenModel(player.tokenModel, idx))
  if (tokenModels.length === 0) return

  const signature = tokenModels.join('|')
  if (tableroScene.value && signature === loadedTokenSignature) return

  const requestId = ++boardLoadRequestId
  boardLoadError.value = false

  try {
    const loader = new GLTFLoader()
    const [boardResult, tokenResults] = await Promise.all([
      tableroScene.value ? Promise.resolve({ scene: tableroScene.value }) : loader.loadAsync('/models/tablero.glb'),
      Promise.all(tokenModels.map(file => loader.loadAsync(`/models/users/${file}`))),
    ])

    if (requestId !== boardLoadRequestId) return

    tableroScene.value = boardResult.scene as Group
    playerScenes.value = tokenResults.map(gltf => gltf.scene as Group)
    loadedTokenSignature = signature
  } catch (error) {
    boardLoadError.value = true
    console.error('Error loading multiplayer board assets', error)
  }
}

const buyTileName = computed(() => {
  const tile = BOARD_TILES.find(t => t.index === buyTileIndex.value)
  return tile?.name ?? 'Propiedad'
})

const buyTilePrice = computed(() => {
  const tile = BOARD_TILES.find(t => t.index === buyTileIndex.value)
  return tile?.price ?? 0
})

const auctionTileName = computed(() => {
  if (!mpStore.auction) return ''
  const tile = BOARD_TILES.find(t => t.index === mpStore.auction!.tileIndex)
  return tile?.name ?? 'Propiedad'
})

const isMyAuctionTurn = computed(() => {
  if (!mpStore.auction || !mpStore.myPlayerId) return false
  const idx = mpStore.auction.bidderIdx
  return mpStore.auction.activeBidders[idx] === mpStore.myPlayerId
})

const currentAuctionBidderName = computed(() => {
  if (!mpStore.auction) return ''
  const bidderId = mpStore.auction.activeBidders[mpStore.auction.bidderIdx]
  return mpStore.players.find(p => p.id === bidderId)?.name ?? bidderId
})

function send(type: string, payload?: Record<string, unknown>) {
  socket.send(type, payload)
}

function confirmBuy() {
  send('buy_property', { tileIndex: buyTileIndex.value })
  showBuyPrompt.value = false
}

function passBuy() {
  send('pass_buy')
  showBuyPrompt.value = false
}

let unsubscribeSocket: (() => void) | null = null
let stopBoardAssetWatch: (() => void) | null = null

// Handle incoming socket events
onMounted(() => {
  if (!tableId || !playerId) {
    navigateTo('/multiplayer/lobby')
    return
  }

  mpStore.setConnection(tableId, playerId)
  socket.connect(tableId, playerId)

  stopBoardAssetWatch = watch(
    () => mpStore.players.map((player, idx) => normalizedTokenModel(player.tokenModel, idx)).join('|'),
    () => { void loadBoardAssets() },
    { immediate: true }
  )

  unsubscribeSocket = socket.onMessage(msg => {
    switch (msg.type) {
      case 'game_snapshot': {
        const payload = msg.payload as { state: any }
        if (payload?.state) mpStore.applySnapshot(payload.state)
        break
      }
      case 'dice_rolled': {
        diceVisible.value = true
        if (diceHideTimer) clearTimeout(diceHideTimer)
        diceHideTimer = setTimeout(() => { diceVisible.value = false }, 2500)
        break
      }
      case 'player_connected':
        mpStore.setPlayerConnected(msg.payload as any)
        break
      case 'player_disconnected':
        mpStore.setPlayerDisconnected(msg.payload as any)
        break
      case 'bot_thinking': {
        const p = msg.payload as { playerId: string; delayMs: number }
        mpStore.setBotThinking(true, 'Bot pensando...')
        setTimeout(() => mpStore.setBotThinking(false), p.delayMs + 200)
        break
      }
      case 'auction_started': {
        showBuyPrompt.value = false
        break
      }
      case 'auction_ended': {
        // state will be refreshed via next game_snapshot
        break
      }
    }
  })
})

onUnmounted(() => {
  if (diceHideTimer) clearTimeout(diceHideTimer)
  stopBoardAssetWatch?.()
  unsubscribeSocket?.()
  socket.disconnect()
  mpStore.reset()
})

// Show buy prompt when landing on unowned buyable tile (only for this player)
watch(() => mpStore.state?.isTurnComplete, (done, prev) => {
  if (!done && prev === true) {
    // turn reset — check if we're the active player and on a buyable tile
    if (!mpStore.isMyTurn) return
    const p = myPlayer.value
    if (!p) return
    const pos = ((p.position % 40) + 40) % 40
    const tile = BOARD_TILES.find(t => t.index === pos)
    if (!tile?.price) return
    const ownerID = mpStore.propertyOwners[pos]
    if (!ownerID && !mpStore.isAuctionActive) {
      buyTileIndex.value = pos
      showBuyPrompt.value = true
    }
  }
})
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1");

.mp-game-page {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: #1a1a2e;
  overflow: hidden;
  font-family: "Inter", sans-serif;
  color: #f8fafc;
}

.mp-board-canvas {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
}

.board-loading {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 20;
  transform: translate(-50%, -50%);
  padding: 10px 14px;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  background: rgba(10,16,25,0.82);
  color: rgba(255,255,255,0.78);
  font-size: 13px;
  font-weight: 700;
  pointer-events: none;
}

.board-error {
  color: #fecaca;
  border-color: rgba(248,113,113,0.35);
}

.conn-overlay, .winner-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(6px);
}

.conn-card, .winner-card {
  background: rgba(15,23,42,0.96);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 16px;
  padding: 32px 40px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.conn-icon { font-size: 48px; color: #94a3b8; }
.winner-icon { font-size: 56px; color: #fbbf24; font-variation-settings: "FILL" 1; }
.winner-card h2 { font-size: 24px; font-weight: 800; margin: 0; }

.players-hud {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 100;
  width: min(300px, calc(100vw - 32px));
  display: flex;
  flex-direction: column;
  gap: 7px;
  pointer-events: none;
}

.players-hud-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2px 2px;
  color: rgba(255,255,255,0.6);
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
}

.players-hud-title strong {
  min-width: 24px;
  padding: 3px 7px;
  border-radius: 8px;
  color: #111827;
  background: #facc15;
  font-weight: 600;
  text-align: center;
}

.hud-player {
  display: grid;
  grid-template-columns: 34px minmax(0,1fr) auto;
  gap: 9px;
  align-items: center;
  padding: 8px 10px;
  color: #fff;
  background: rgba(10,16,25,0.82);
  border: 1px solid rgba(255,255,255,0.11);
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

.hud-active { border-color: rgba(134,239,172,0.48); background: linear-gradient(90deg,rgba(22,163,74,0.22),rgba(10,16,25,0.84)); }
.hud-bankrupt { opacity: 0.38; filter: grayscale(0.7); }
.hud-me { border-color: rgba(59,130,246,0.4); }

.hud-icon { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 8px; background: rgba(255,255,255,0.1); font-size: 16px; }
.hud-copy { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.hud-name { color: #f8fafc; font-size: 13px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hud-position { color: rgba(255,255,255,0.5); font-size: 11px; }
.hud-cash { color: #86efac; font-size: 12px; font-weight: 600; white-space: nowrap; }
.hud-negative { color: #f87171; }

.hud-bot-badge, .hud-you-badge {
  display: inline-block;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  margin-left: 4px;
  vertical-align: middle;
}
.bot-regular { background: rgba(59,130,246,0.2); color: #93c5fd; border: 1px solid rgba(59,130,246,0.3); }
.bot-hard { background: rgba(239,68,68,0.2); color: #fca5a5; border: 1px solid rgba(239,68,68,0.3); }
.hud-you-badge { background: rgba(0,245,155,0.15); color: #00e38f; border: 1px solid rgba(0,245,155,0.25); }

.overlay-container {
  position: absolute;
  bottom: 26px;
  left: 50%;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: min(760px, calc(100vw - 32px));
  transform: translateX(-50%);
  pointer-events: none;
}

.status-card {
  width: min(680px,100%);
  display: grid;
  grid-template-columns: minmax(190px,auto) minmax(0,1fr);
  gap: 10px 14px;
  align-items: center;
  padding: 10px 12px;
  background: rgba(10,16,25,0.88);
  border: 1px solid rgba(255,255,255,0.13);
  border-radius: 8px;
  backdrop-filter: blur(12px);
  pointer-events: auto;
}

.status-player { display: flex; align-items: center; gap: 10px; }
.status-token { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 8px; background: #facc15; color: #111827; font-size: 20px; font-weight: 950; }
.status-kicker { display: block; color: rgba(255,255,255,0.52); font-size: 10px; font-weight: 500; text-transform: uppercase; }
.status-player strong { display: block; color: #f8fafc; font-size: 15px; font-weight: 700; }
.status-details { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 7px; }
.status-chip { min-height: 26px; display: inline-flex; align-items: center; gap: 5px; padding: 4px 8px; border-radius: 8px; color: #dbeafe; background: rgba(37,99,235,0.16); border: 1px solid rgba(147,197,253,0.18); font-size: 11px; font-weight: 600; }
.doubles-badge { padding: 4px 8px; border-radius: 8px; background: #f59e0b; color: #111827; font-size: 11px; font-weight: 600; }
.offline-badge { display: inline-flex; align-items: center; padding: 4px 8px; border-radius: 8px; background: rgba(239,68,68,0.16); color: #fca5a5; font-size: 11px; }
.status-card p { grid-column: 1/-1; margin: 0; color: #86efac; font-size: 12px; text-align: center; }

.action-buttons { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; pointer-events: auto; }

.action-btn {
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 13px 20px;
  color: white;
  border: 0;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.roll-btn { min-width: 178px; background: #10b981; box-shadow: 0 12px 22px rgba(16,185,129,0.34); }
.roll-btn:hover:not(:disabled) { background: #059669; transform: translateY(-2px); }
.next-btn { background: #2563eb; box-shadow: 0 12px 22px rgba(37,99,235,0.34); }
.next-btn:hover { background: #1d4ed8; transform: translateY(-2px); }
.bail-btn { background: #f59e0b; color: #111827; }
.bail-btn:hover:not(:disabled) { background: #d97706; transform: translateY(-2px); }
.config-btn { background: #475569; }
.config-btn:hover { background: #334155; transform: translateY(-2px); }

.waiting-indicator, .waiting-auction {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
  background: rgba(15,23,42,0.7);
  border: 1px solid rgba(148,163,184,0.2);
  border-radius: 8px;
  color: #94a3b8;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
}

.bot-thinking-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 24px;
  background: rgba(59,130,246,0.15);
  border: 1px solid rgba(59,130,246,0.3);
  border-radius: 12px;
  color: #93c5fd;
  font-size: 14px;
  font-weight: 600;
  animation: botPulse 1.5s ease-in-out infinite;
}
.bot-thinking-icon { font-size: 22px; animation: botSpin 2s linear infinite; }

@keyframes botPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.7; } }
@keyframes botSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* Overlays */
.buy-overlay, .card-overlay, .auction-overlay {
  position: absolute;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  padding: 16px;
}

.buy-card, .card-card, .auction-card {
  background: rgba(15,23,42,0.97);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 16px;
  padding: 28px 32px;
  min-width: min(400px,100%);
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  text-align: center;
}
.buy-card h3 { margin: 0; font-size: 22px; font-weight: 800; }
.buy-price { font-size: 36px; font-weight: 800; color: #34d399; margin: 0; }
.buy-actions { display: flex; gap: 12px; }

.card-group { font-size: 13px; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
.card-text { font-size: 16px; color: #f8fafc; max-width: 340px; line-height: 1.5; margin: 0; }

.auction-header-section { display: flex; flex-direction: column; gap: 4px; }
.auction-tag { font-size: 12px; font-weight: 800; text-transform: uppercase; color: #34d399; letter-spacing: 0.12em; }
.auction-header-section strong { font-size: 22px; }
.auction-bid-info { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 100%; }
.bid-label { display: block; font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 700; margin-bottom: 4px; }
.bid-amount { font-size: 32px; font-weight: 800; color: #34d399; font-family: monospace; }
.bid-bidder { font-size: 18px; font-weight: 700; }
.auction-actions { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; width: 100%; }
.bid-btn {
  min-height: 60px;
  border-radius: 8px;
  border: 1px solid rgba(52,211,153,0.3);
  background: rgba(52,211,153,0.1);
  color: #d1fae5;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.16s;
}
.bid-btn:hover:not(:disabled) { background: rgba(52,211,153,0.2); transform: translateY(-1px); }
.bid-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.bid-btn small { font-size: 11px; font-weight: 600; color: #86efac; display: block; }
.pass-bid-btn {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(248,113,113,0.22);
  background: rgba(127,29,29,0.16);
  color: #fecaca;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
.pass-bid-btn:hover { background: rgba(127,29,29,0.28); }

.dado-wrapper {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 150;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  color: #ecfdf5;
  background: rgba(10,16,25,0.9);
  border: 1px solid rgba(134,239,172,0.24);
  border-radius: 8px;
  box-shadow: 0 18px 36px rgba(0,0,0,0.28);
  pointer-events: none;
}
.dado-titulo { color: #86efac; font-size: 11px; font-weight: 600; }
.dados-row { display: flex; gap: 10px; }
.dado-pequeno {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  background: #fff;
  color: #111827;
  border-radius: 8px;
  font-size: 22px;
  font-weight: 900;
  border: 1px solid rgba(15,23,42,0.15);
}
.doubles-text { color: #fbbf24; font-weight: 600; margin-left: 6px; }

.conn-badge {
  position: absolute;
  bottom: 16px;
  right: 16px;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  pointer-events: none;
}
.conn-badge.online { background: rgba(16,185,129,0.14); color: #86efac; border: 1px solid rgba(16,185,129,0.22); }
.conn-badge.offline { background: rgba(239,68,68,0.14); color: #fca5a5; border: 1px solid rgba(239,68,68,0.22); animation: blink 1s infinite; }

@keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }

.material-symbols-outlined { font-variation-settings: "FILL" 0, "wght" 400; font-size: 18px; line-height: 1; }
</style>
