<template>
  <div class="lobby-page">
    <div class="ambient-glow ambient-1" />
    <div class="ambient-glow ambient-2" />
    <div class="ambient-glow ambient-3" />

    <AppHeader back-to="/" badge="Multijugador" />

    <div class="page-body">
      <!-- Room view -->
      <div v-if="roomTableId" class="lobby-card lobby-room-card">
        <div class="card-header room-header">
          <div>
            <h1 class="main-title">Sala {{ roomTableId }}</h1>
            <p class="subtitle">{{ roomSubtitle }}</p>
          </div>
          <span class="room-favicon material-symbols-outlined">casino</span>
        </div>

        <div class="invite-panel">
          <div class="invite-copy">
            <span class="section-label">INVITACION</span>
            <strong>{{ roomTableId }}</strong>
            <span>{{ inviteUrl }}</span>
          </div>
          <button class="copy-btn" @click="copyInviteUrl">
            <span class="material-symbols-outlined">{{
              inviteCopied ? "check" : "content_copy"
            }}</span>
            {{ inviteCopied ? "Copiado" : "Copiar URL" }}
          </button>
        </div>

        <div class="section-block">
          <span class="section-label">CASILLAS</span>
          <div class="slots-grid room-slots-grid">
            <div
              v-for="(player, idx) in roomPlayers"
              :key="player.id"
              class="slot-card room-slot-card"
              :class="[
                'slot-accent-' + (idx + 1),
                {
                  'room-slot-open': isOpenRoomPlayer(player),
                  'room-slot-winner': startOrderWinnerId === player.id,
                  'room-slot-tied': isTiedPlayer(player.id),
                  'room-slot-disconnected': !player.isBot && !player.connected && !isOpenRoomPlayer(player),
                },
              ]"
            >
              <div class="slot-top">
                <span class="slot-num">{{ idx + 1 }}</span>
                <span v-if="player.id === roomPlayerId" class="slot-you-badge"
                  >Tu</span
                >
                <span v-if="startOrderWinnerId === player.id" class="first-badge"
                  >Va primero</span
                >
              </div>
              <strong class="room-player-name">{{ roomPlayerName(player) }}</strong>
              <span v-if="!isOpenRoomPlayer(player)" class="token-pill">
                <span>{{ tokenIcon(player.tokenModel) }}</span>
                {{ tokenName(player.tokenModel) }}
              </span>
              <span class="slot-type-label">
                <span class="material-symbols-outlined">{{
                  isOpenRoomPlayer(player)
                    ? "person_add"
                    : player.isBot
                      ? "smart_toy"
                      : "person"
                }}</span>
                {{ roomPlayerStatus(player) }}
              </span>
              <span v-if="player.controlledByBot" class="roll-pill">
                Bot temporal
              </span>
              <span v-if="rollForPlayer(player.id)" class="roll-pill">
                {{ rollForPlayer(player.id)?.diceValues.join(" + ") }} =
                {{ rollForPlayer(player.id)?.total }}
              </span>
            </div>
          </div>
        </div>

        <div class="start-order-panel">
          <div>
            <span class="section-label">ORDEN INICIAL</span>
            <p>{{ startOrderMessage }}</p>
          </div>
          <button
            class="start-btn"
            :disabled="!canRollStartOrder"
            @click="rollStartOrder"
          >
            <span class="material-symbols-outlined">casino</span>
            {{ startOrderButtonLabel }}
          </button>
        </div>

        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
      </div>

      <!-- Join view -->
      <div v-else-if="mode === 'join'" class="lobby-card">
        <div class="card-header">
          <h1 class="main-title">Unirse a mesa</h1>
          <p class="subtitle">{{ joinSubtitle }}</p>
        </div>
        <div class="field-group">
          <label class="field-label">TU NOMBRE</label>
          <input
            v-model="playerName"
            class="field-input"
            placeholder="Cómo te llamas?"
            maxlength="20"
          />
        </div>
        <div class="field-group">
          <label class="field-label">TU FICHA</label>
          <div class="token-choice-grid">
            <button
              v-for="token in tokenModels"
              :key="token.file"
              type="button"
              class="token-choice-btn"
              :class="{ active: joinTokenModel === token.file }"
              @click="joinTokenModel = token.file"
            >
              <span>{{ token.icon }}</span>
              {{ token.name }}
            </button>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">CÓDIGO DE MESA</label>
          <input
            v-model="joinCode"
            class="field-input field-mono"
            placeholder="T-xxxxxxxx"
            maxlength="20"
          />
        </div>
        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
        <div class="action-row">
          <button class="reset-btn" @click="mode = 'create'">Crear mesa</button>
          <button class="start-btn" :disabled="joining" @click="joinTable">
            <span class="material-symbols-outlined">login</span>
            {{ joining ? "Uniéndose..." : "UNIRSE" }}
          </button>
        </div>
      </div>

      <!-- Create view -->
      <div v-else class="lobby-card">
        <div class="card-header">
          <h1 class="main-title">Nueva mesa</h1>
          <p class="subtitle">
            Configura los slots y las reglas de la partida.
          </p>
        </div>

        <!-- Player name -->
        <div class="field-group">
          <label class="field-label">TU NOMBRE</label>
          <input
            v-model="playerName"
            class="field-input"
            placeholder="Cómo te llamas?"
            maxlength="20"
          />
        </div>
        <div class="field-group">
          <label class="field-label">TU FICHA</label>
          <div class="token-choice-grid">
            <button
              v-for="token in tokenModels"
              :key="token.file"
              type="button"
              class="token-choice-btn"
              :class="{ active: playerTokenModel === token.file }"
              @click="playerTokenModel = token.file"
            >
              <span>{{ token.icon }}</span>
              {{ token.name }}
            </button>
          </div>
        </div>

        <!-- Slot count -->
        <div class="section-block">
          <span class="section-label">NÚMERO DE SLOTS</span>
          <div class="player-count-bar">
            <button
              v-for="n in maxLobbySlots"
              :key="n"
              class="count-pill"
              :class="{ active: n === slotCount, disabled: n < 2 }"
              :disabled="n < 2"
              @click="setSlotCount(n)"
            >
              {{ n }}
            </button>
          </div>
        </div>

        <!-- Slot configuration -->
        <div class="section-block">
          <span class="section-label">SLOTS</span>
          <div class="slots-grid">
            <div
              v-for="(slot, idx) in visibleSlots"
              :key="idx"
              class="slot-card"
              :class="'slot-accent-' + (idx + 1)"
            >
              <div class="slot-top">
                <span class="slot-num">{{ idx + 1 }}</span>
                <span v-if="idx === 0" class="slot-you-badge">Tú</span>
              </div>
              <div class="field-group" v-if="idx > 0">
                <label class="field-label">TIPO</label>
                <div class="select-wrapper">
                  <select v-model="slot.type" class="field-input field-select">
                    <option value="open">Esperando jugador</option>
                    <option value="bot_regular">Bot Regular</option>
                    <option value="bot_difficult">Bot Difícil</option>
                  </select>
                  <span class="material-symbols-outlined select-arrow"
                    >expand_more</span
                  >
                </div>
              </div>
              <div class="slot-type-label" v-if="idx === 0">
                <span class="material-symbols-outlined">person</span> Jugador
                humano
              </div>
            </div>
          </div>
        </div>

        <!-- Rules -->
        <div class="section-block">
          <button class="settings-btn" @click="showRules = !showRules">
            <span class="material-symbols-outlined">tune</span>
            {{ showRules ? "Ocultar reglas" : "Configurar reglas" }}
          </button>
          <div v-if="showRules" class="rules-panel">
            <div class="rule-row">
              <span class="rule-label">Dinero inicial</span>
              <span class="rule-value">${{ startingCash }}</span>
            </div>
            <input
              v-model.number="startingCash"
              type="range"
              min="500"
              max="5000"
              step="100"
              class="range-input"
            />
            <div class="rule-row">
              <span class="rule-label">Salario (GO)</span>
              <input
                v-model.number="goSalary"
                type="number"
                min="0"
                step="50"
                class="small-input"
              />
            </div>
            <label class="toggle-row">
              <span>Dobles dan turno extra</span>
              <input type="checkbox" v-model="doublesGiveExtra" />
            </label>
            <label class="toggle-row">
              <span>Solo subastas</span>
              <input type="checkbox" v-model="auctionOnly" />
            </label>
          </div>
        </div>

        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

        <div class="action-row">
          <button class="reset-btn" @click="mode = 'join'">
            Unirse a mesa
          </button>
          <button class="start-btn" :disabled="creating" @click="createTable">
            <span class="material-symbols-outlined">add_circle</span>
            {{ creating ? "Creando..." : "CREAR MESA" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, onMounted, onUnmounted, watch } from "vue";
import { useMultiplayerStore } from "~/stores/multiplayerStore";
import { getApiBaseUrl } from "~/utils/env";
import { GAME_CONFIG } from "~/config/gameConfig";
import { enabledLocalScenarioSeedKeys } from "~/config/localScenarioSeeds";
import { useGameSocket } from "~/composables/useGameSocket";
import type { MPPlayerState } from "~/stores/multiplayerStore";

const mpStore = useMultiplayerStore();
const socket = useGameSocket();
const route = useRoute();
const { track } = useAnalytics();

const mode = ref<"create" | "join">(
  route.query.mode === "join" ? "join" : "create",
);

onMounted(() => {
  track("lobby_opened");
  if (typeof route.query.tableId === "string" && route.query.tableId.trim()) {
    if (typeof route.query.playerId === "string" && route.query.playerId.trim()) {
      connectRoom(route.query.tableId.trim(), route.query.playerId.trim());
      return;
    }
    mode.value = "join";
    joinCode.value = route.query.tableId.trim();
  }
});
const playerName = ref("");
const joinCode = ref("");
const errorMsg = ref("");
const creating = ref(false);
const joining = ref(false);
const showRules = ref(false);
const slotCount = ref(2);
const tokenModels = GAME_CONFIG.TOKEN_MODELS;
const playerTokenModel = ref(tokenModels[0]?.file ?? "sombrero.glb");
const joinTokenModel = ref(tokenModels[0]?.file ?? "sombrero.glb");
const maxLobbySlots = GAME_CONFIG.TOKEN_MODELS.length;
const roomTableId = ref("");
const roomPlayerId = ref("");
const inviteCopied = ref(false);
let unsubscribeSocket: (() => void) | null = null;
let copiedTimer: ReturnType<typeof setTimeout> | null = null;

const startingCash = ref(1500);
const goSalary = ref(200);
const doublesGiveExtra = ref(true);
const auctionOnly = ref(false);

interface SlotDef {
  type: "open" | "bot_regular" | "bot_difficult";
}
const slots = reactive<SlotDef[]>([
  { type: "open" }, // slot 0 = always creator (human)
  { type: "bot_difficult" },
  { type: "bot_regular" },
  { type: "open" },
]);
const visibleSlots = computed(() => slots.slice(0, slotCount.value));

function setSlotCount(n: number) {
  slotCount.value = n;
}

const API_BASE = getApiBaseUrl();

const roomPlayers = computed(() => mpStore.players);
const startOrder = computed(() => mpStore.startOrder);
const startOrderWinnerId = computed(() => startOrder.value?.winnerId ?? "");
const inviteUrl = computed(() => {
  if (typeof window === "undefined" || !roomTableId.value) return "";
  const url = new URL("/multiplayer/lobby", window.location.origin);
  url.searchParams.set("mode", "join");
  url.searchParams.set("tableId", roomTableId.value);
  return url.toString();
});
const joinSubtitle = computed(() =>
  joinCode.value
    ? `Te invitaron a la mesa ${joinCode.value}. Ingresa tu nombre para unirte.`
    : "Ingresa el codigo de la mesa que te compartieron.",
);
const roomSubtitle = computed(() => {
  if (!mpStore.state) return "Preparando sala...";
  if (mpStore.phase === "setup") return "Comparte la sala y definan quien juega primero.";
  return "Partida lista. Entrando al tablero...";
});
const currentRoundRolls = computed(() =>
  (startOrder.value?.rolls ?? []).filter(
    (roll) => roll.round === startOrder.value?.round,
  ),
);
const hasOpenRoomSlots = computed(() =>
  roomPlayers.value.some((player) => isOpenRoomPlayer(player)),
);
const canRollStartOrder = computed(() => {
  if (!roomPlayerId.value || mpStore.phase !== "setup" || hasOpenRoomSlots.value)
    return false;
  const order = startOrder.value;
  if (!order || order.status === "waiting" || order.status === "complete")
    return false;
  if (!order.requiredPlayerIds.includes(roomPlayerId.value)) return false;
  return !currentRoundRolls.value.some(
    (roll) => roll.playerId === roomPlayerId.value,
  );
});
const startOrderButtonLabel = computed(() => {
  if (hasOpenRoomSlots.value) return "Esperando jugadores";
  if (startOrder.value?.status === "complete") return "Orden definido";
  if (!canRollStartOrder.value) return "Esperando tiradas";
  return startOrder.value?.status === "tiebreak" ? "Desempatar" : "Tirar dados";
});
const startOrderMessage = computed(() => {
  if (hasOpenRoomSlots.value) return "Aun hay casillas abiertas para invitados.";
  const order = startOrder.value;
  if (!order) return "Preparando tirada inicial.";
  if (order.status === "complete") {
    const winner = roomPlayers.value.find((p) => p.id === order.winnerId);
    return `${winner?.name ?? "El ganador"} va primero.`;
  }
  if (order.status === "tiebreak") {
    return "Hay empate en la tirada mayor. Solo los empatados vuelven a tirar.";
  }
  return "Cada participante tira una vez. El total mas alto empieza.";
});

function isOpenRoomPlayer(player: MPPlayerState) {
  return !player.name || player.name === "open";
}

function isTiedPlayer(playerId: string) {
  return (startOrder.value?.tiedPlayerIds ?? []).includes(playerId);
}

function rollForPlayer(playerId: string) {
  return currentRoundRolls.value.find((roll) => roll.playerId === playerId);
}

function roomPlayerName(player: MPPlayerState) {
  if (isOpenRoomPlayer(player)) return "Esperando jugador";
  return player.name;
}

function roomPlayerStatus(player: MPPlayerState) {
  if (isOpenRoomPlayer(player)) return "Abierto para invitado";
  if (!player.isBot && !player.connected) return "Desconectado";
  if (player.controlledByBot) return "Bot temporal";
  if (startOrderWinnerId.value === player.id) return "Primer turno";
  if (isTiedPlayer(player.id)) return "Empatado";
  if (rollForPlayer(player.id)) return "Tirada lista";
  if ((startOrder.value?.requiredPlayerIds ?? []).includes(player.id))
    return player.isBot ? "Bot participa" : "Pendiente de tirar";
  return player.isBot ? "Bot" : "Conectado";
}

function connectRoom(tableId: string, playerId: string) {
  roomTableId.value = tableId;
  roomPlayerId.value = playerId;
  mpStore.setConnection(tableId, playerId);
  unsubscribeSocket?.();
  unsubscribeSocket = socket.onMessage((msg) => {
    if (msg.type === "game_snapshot") {
      const payload = msg.payload as { state?: any };
      if (payload?.state) mpStore.applySnapshot(payload.state);
    }
  });
  socket.connect(tableId, playerId);
}

async function copyInviteUrl() {
  if (!inviteUrl.value) return;
  await navigator.clipboard.writeText(inviteUrl.value);
  inviteCopied.value = true;
  if (copiedTimer) clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => {
    inviteCopied.value = false;
  }, 1800);
}

function rollStartOrder() {
  if (!canRollStartOrder.value) return;
  socket.send("roll_start_order");
}

watch(
  () => mpStore.phase,
  (phase) => {
    if (phase === "playing" && roomTableId.value && roomPlayerId.value) {
      navigateTo(
        `/multiplayer/game?tableId=${roomTableId.value}&playerId=${roomPlayerId.value}`,
      );
    }
  },
);

onUnmounted(() => {
  if (copiedTimer) clearTimeout(copiedTimer);
  unsubscribeSocket?.();
  socket.disconnect();
});

function isLocalGameUrl() {
  if (typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(
    window.location.hostname,
  );
}

function activeLocalScenarioSeeds() {
  if (!isLocalGameUrl()) return [];
  return enabledLocalScenarioSeedKeys(
    new URLSearchParams(window.location.search),
  );
}

function tokenModelForSlot(index: number) {
  return (
    GAME_CONFIG.TOKEN_MODELS[index % GAME_CONFIG.TOKEN_MODELS.length]?.file ??
    "sombrero.glb"
  );
}

function nextUnusedTokenModel(used: Set<string>, preferredIndex: number) {
  for (let offset = 0; offset < tokenModels.length; offset++) {
    const token = tokenModels[(preferredIndex + offset) % tokenModels.length];
    if (token && !used.has(token.file)) return token.file;
  }
  return tokenModelForSlot(preferredIndex);
}

function tokenIcon(file: string) {
  return tokenModels.find((token) => token.file === file)?.icon ?? "●";
}

function tokenName(file: string) {
  return tokenModels.find((token) => token.file === file)?.name ?? "Ficha";
}

async function createTable() {
  errorMsg.value = "";
  if (!playerName.value.trim()) {
    errorMsg.value = "Ingresa tu nombre.";
    return;
  }
  creating.value = true;
  try {
    const usedTokenModels = new Set<string>();
    const creatorTokenModel = playerTokenModel.value || tokenModelForSlot(0);
    usedTokenModels.add(creatorTokenModel);
    const slotsPayload = Array.from({ length: slotCount.value }, (_, i) => {
      if (i === 0)
        return {
          type: "human",
          name: playerName.value.trim(),
          tokenModel: creatorTokenModel,
        };
      const s = slots[i];
      if (s.type === "open") return { type: "open", name: "", tokenModel: "" };
      const diff = s.type === "bot_difficult" ? "difficult" : "regular";
      const tokenModel = nextUnusedTokenModel(usedTokenModels, i);
      usedTokenModels.add(tokenModel);
      return {
        type: "bot",
        difficulty: diff,
        name:
          s.type === "bot_difficult"
            ? `Bot Difícil ${i + 1}`
            : `Bot Regular ${i + 1}`,
        tokenModel,
      };
    });

    const res = await fetch(`${API_BASE}/api/v1/tables`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creatorName: playerName.value.trim(),
        config: {
          startingCash: startingCash.value,
          goSalary: goSalary.value,
          doublesGiveExtraTurn: doublesGiveExtra.value,
          auctionOnly: auctionOnly.value,
          jailBailCost: 50,
          scenarioSeeds: activeLocalScenarioSeeds(),
        },
        slots: slotsPayload,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      errorMsg.value = text || "Error al crear la mesa";
      return;
    }

    const data = await res.json();
    track("table_created");
    if (data.autoStarted || data.phase === "playing") {
      mpStore.setConnection(data.tableId, data.playerId);
      navigateTo(
        `/multiplayer/game?tableId=${data.tableId}&playerId=${data.playerId}`,
      );
      return;
    }
    connectRoom(data.tableId, data.playerId);
  } catch (e) {
    errorMsg.value = "No se pudo conectar al servidor";
    console.error(e);
  } finally {
    creating.value = false;
  }
}

async function joinTable() {
  errorMsg.value = "";
  if (!playerName.value.trim()) {
    errorMsg.value = "Ingresa tu nombre.";
    return;
  }
  if (!joinCode.value.trim()) {
    errorMsg.value = "Ingresa el código de la mesa.";
    return;
  }
  joining.value = true;
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/tables/${joinCode.value.trim()}/join`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName: playerName.value.trim(),
          tokenModel: joinTokenModel.value,
        }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      errorMsg.value = text || "No se pudo unir a la mesa";
      return;
    }

    const data = await res.json();
    track("table_joined");
    if (data.phase === "playing") {
      mpStore.setConnection(joinCode.value.trim(), data.playerId);
      navigateTo(
        `/multiplayer/game?tableId=${joinCode.value.trim()}&playerId=${data.playerId}`,
      );
      return;
    }
    connectRoom(joinCode.value.trim(), data.playerId);
  } catch (e) {
    errorMsg.value = "No se pudo conectar al servidor";
    console.error(e);
  } finally {
    joining.value = false;
  }
}
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@500;700&family=Hanken+Grotesk:wght@400;500;600&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1");

.lobby-page {
  height: 100vh;
  height: 100dvh;
  min-height: 100vh;
  min-height: 100dvh;
  background:
    radial-gradient(circle at 72% 20%, rgba(0, 245, 155, 0.1), transparent 32%),
    radial-gradient(circle at 18% 82%, rgba(215, 3, 87, 0.08), transparent 30%),
    #11131c;
  color: #e1e1ef;
  font-family: "Hanken Grotesk", sans-serif;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior-y: contain;
  touch-action: pan-y;
  -webkit-overflow-scrolling: touch;
}

.lobby-page::before {
  content: "";
  position: fixed;
  inset: -28%;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 18% 22%, rgba(0, 245, 155, 0.09), transparent 25%),
    radial-gradient(circle at 76% 18%, rgba(59, 130, 246, 0.09), transparent 28%),
    radial-gradient(circle at 64% 78%, rgba(215, 3, 87, 0.08), transparent 27%);
  filter: blur(38px);
  opacity: 0.88;
  animation: lobbyGradientFlow 24s ease-in-out infinite alternate;
}

.ambient-glow {
  position: fixed;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
  will-change: transform;
  mix-blend-mode: screen;
}

.ambient-1 {
  top: -10%;
  right: -10%;
  width: 50%;
  height: 50%;
  background: rgba(0, 245, 155, 0.06);
  filter: blur(120px);
  animation: lobbyAmbientA 18s ease-in-out infinite alternate;
}

.ambient-2 {
  bottom: -10%;
  left: -10%;
  width: 50%;
  height: 50%;
  background: rgba(215, 3, 87, 0.04);
  filter: blur(120px);
  animation: lobbyAmbientB 22s ease-in-out infinite alternate;
}

.ambient-3 {
  top: 34%;
  left: 42%;
  width: 28%;
  height: 42%;
  background: rgba(255, 209, 101, 0.035);
  filter: blur(100px);
  animation: lobbyAmbientC 26s ease-in-out infinite alternate;
}

.page-body {
  flex: 1;
  min-height: 0;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 24px 16px calc(44px + env(safe-area-inset-bottom));
  position: relative;
  z-index: 1;
}

.lobby-card {
  width: 100%;
  max-width: 620px;
  background: rgba(29, 31, 41, 0.7);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(132, 149, 136, 0.1);
  border-radius: 24px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: 0 32px 64px -12px rgba(0, 0, 0, 0.5);
  animation: lobbyCardEnter 0.9s cubic-bezier(0.18, 1, 0.22, 1) both;
}

.lobby-room-card {
  max-width: 760px;
}

.room-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.room-favicon {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 6px;
  color: #00f59b;
}

.invite-panel,
.start-order-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px;
  border: 1px solid rgba(132, 149, 136, 0.12);
  border-radius: 14px;
  background: rgba(17, 19, 28, 0.5);
}

.invite-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.invite-copy strong {
  font-family: "JetBrains Mono", monospace;
  color: #00f59b;
}

.invite-copy span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #849588;
  font-size: 12px;
}

.copy-btn {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(0, 245, 155, 0.24);
  background: rgba(0, 245, 155, 0.1);
  color: #00f59b;
  border-radius: 12px;
  padding: 10px 12px;
  font-weight: 800;
  cursor: pointer;
}

.room-slots-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.room-slot-card {
  min-height: 150px;
}

.room-slot-open {
  opacity: 0.7;
  border-style: dashed;
}

.room-slot-winner {
  border-color: rgba(0, 245, 155, 0.58);
  box-shadow: 0 0 0 1px rgba(0, 245, 155, 0.22);
}

.room-slot-tied {
  border-color: rgba(255, 209, 101, 0.48);
}

.room-slot-disconnected {
  border-color: rgba(248, 113, 113, 0.42);
  background: rgba(127, 29, 29, 0.18);
}

.room-player-name {
  color: #e1e1ef;
  font-size: 14px;
}

.first-badge,
.roll-pill {
  font-family: "JetBrains Mono", monospace;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  border-radius: 5px;
  padding: 3px 6px;
}

.first-badge {
  color: #003920;
  background: #00f59b;
}

.roll-pill {
  align-self: flex-start;
  color: #ffd165;
  background: rgba(255, 209, 101, 0.12);
  border: 1px solid rgba(255, 209, 101, 0.22);
}

.start-order-panel p {
  margin: 5px 0 0;
  color: #e1e1ef;
  font-size: 14px;
}

.main-title {
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 24px;
  font-weight: 800;
  color: #e1e1ef;
  margin: 0;
}

.subtitle {
  color: #849588;
  font-size: 14px;
  margin: 4px 0 0;
}

.section-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.section-label {
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #849588;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.field-label {
  font-family: "JetBrains Mono", monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(132, 149, 136, 0.7);
  padding-left: 2px;
}
.field-input {
  background: rgba(17, 19, 28, 0.6);
  border: 1px solid rgba(132, 149, 136, 0.12);
  border-radius: 10px;
  padding: 10px 14px;
  color: #e1e1ef;
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}
.field-input:focus {
  border-color: #00f59b;
}
.field-mono {
  font-family: "JetBrains Mono", monospace;
  letter-spacing: 0.08em;
}

.token-choice-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.token-choice-btn {
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 9px 10px;
  border: 1px solid rgba(132, 149, 136, 0.14);
  border-radius: 12px;
  background: rgba(17, 19, 28, 0.55);
  color: #e1e1ef;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition:
    border-color 0.2s,
    background 0.2s,
    color 0.2s;
}

.token-choice-btn span {
  font-size: 18px;
}

.token-choice-btn:hover {
  border-color: rgba(0, 245, 155, 0.35);
}

.token-choice-btn.active {
  border-color: rgba(0, 245, 155, 0.72);
  background: rgba(0, 245, 155, 0.12);
  color: #00f59b;
}

.select-wrapper {
  position: relative;
}
.field-select {
  appearance: none;
  cursor: pointer;
  width: 100%;
  padding-right: 36px;
}
.select-arrow {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: rgba(132, 149, 136, 0.5);
  font-size: 18px;
}

.player-count-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  background: rgba(25, 27, 36, 0.8);
  padding: 6px;
  border-radius: 16px;
  border: 1px solid rgba(132, 149, 136, 0.1);
}
.count-pill {
  padding: 10px;
  border-radius: 12px;
  border: none;
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #849588;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
}
.count-pill:hover:not(.disabled) {
  background: rgba(50, 52, 62, 0.5);
}
.count-pill.active {
  background: #00f59b;
  color: #003920;
}
.count-pill.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.slots-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.slot-card {
  background: rgba(25, 27, 36, 0.8);
  border: 1px solid rgba(132, 149, 136, 0.1);
  border-radius: 14px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.slot-top {
  display: flex;
  align-items: center;
  gap: 8px;
}
.slot-num {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 14px;
  font-weight: 700;
}
.slot-accent-1 .slot-num {
  background: rgba(0, 245, 155, 0.15);
  color: #00f59b;
}
.slot-accent-2 .slot-num {
  background: rgba(215, 3, 87, 0.15);
  color: #d70357;
}
.slot-accent-3 .slot-num {
  background: rgba(255, 209, 101, 0.15);
  color: #ffd165;
}
.slot-accent-4 .slot-num {
  background: rgba(248, 113, 113, 0.15);
  color: #f87171;
}

.slot-you-badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: #00e38f;
  background: rgba(0, 245, 155, 0.1);
  border: 1px solid rgba(0, 245, 155, 0.2);
  border-radius: 4px;
  padding: 2px 6px;
}

.slot-type-label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  font-weight: 500;
}

.token-pill {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 7px;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #e1e1ef;
  font-size: 11px;
  font-weight: 800;
}

.settings-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: 1px solid rgba(132, 149, 136, 0.15);
  background: rgba(25, 27, 36, 0.6);
  color: #849588;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  align-self: flex-start;
}
.settings-btn:hover {
  color: #00e38f;
  border-color: rgba(0, 245, 155, 0.3);
}

.rules-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  background: rgba(25, 27, 36, 0.5);
  border: 1px solid rgba(132, 149, 136, 0.08);
  border-radius: 12px;
}
.rule-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.rule-label {
  color: #e1e1ef;
  font-size: 13px;
  font-weight: 600;
}
.rule-value {
  color: #00e38f;
  font-family: "JetBrains Mono", monospace;
  font-weight: 700;
}
.small-input {
  width: 80px;
  background: rgba(17, 19, 28, 0.6);
  border: 1px solid rgba(132, 149, 136, 0.15);
  border-radius: 8px;
  padding: 6px 10px;
  color: #e1e1ef;
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 14px;
  font-weight: 700;
  text-align: right;
  outline: none;
}
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  color: #e1e1ef;
  font-size: 13px;
  font-weight: 600;
}
.range-input {
  width: 100%;
  height: 6px;
  appearance: none;
  background: rgba(50, 52, 62, 0.8);
  border-radius: 9999px;
  cursor: pointer;
}
.range-input::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #00f59b;
}

.error-msg {
  color: #f87171;
  font-size: 13px;
  text-align: center;
  padding: 10px;
  background: rgba(248, 113, 113, 0.08);
  border: 1px solid rgba(248, 113, 113, 0.2);
  border-radius: 10px;
  margin: 0;
}

.action-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.reset-btn {
  padding: 12px 18px;
  border: none;
  background: transparent;
  color: #849588;
  font-family: "JetBrains Mono", monospace;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 0.2s;
  border-radius: 12px;
}
.reset-btn:hover {
  color: #00e38f;
}

.start-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 28px;
  margin-left: auto;
  background: #00f59b;
  color: #003920;
  border: none;
  border-radius: 14px;
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 8px 24px -6px rgba(0, 245, 155, 0.35);
  transition: all 0.3s;
}
.start-btn:hover:not(:disabled) {
  transform: scale(1.03);
}
.start-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.material-symbols-outlined {
  font-variation-settings:
    "FILL" 0,
    "wght" 400;
  font-size: 18px;
  line-height: 1;
}

@keyframes lobbyGradientFlow {
  0% {
    transform: translate3d(-4%, -2%, 0) rotate(0deg) scale(1);
  }
  33% {
    transform: translate3d(7%, 4%, 0) rotate(12deg) scale(1.08);
  }
  66% {
    transform: translate3d(-2%, 8%, 0) rotate(-8deg) scale(1.03);
  }
  100% {
    transform: translate3d(5%, -5%, 0) rotate(16deg) scale(1.1);
  }
}

@keyframes lobbyAmbientA {
  from {
    transform: translate3d(0, 0, 0) scale(1);
  }
  to {
    transform: translate3d(-62vw, 72vh, 0) scale(1.32);
  }
}

@keyframes lobbyAmbientB {
  from {
    transform: translate3d(0, 0, 0) scale(1);
  }
  to {
    transform: translate3d(70vw, -58vh, 0) scale(1.22);
  }
}

@keyframes lobbyAmbientC {
  from {
    transform: translate3d(0, 0, 0) scale(1);
  }
  to {
    transform: translate3d(-34vw, -28vh, 0) scale(1.42);
  }
}

@keyframes lobbyCardEnter {
  from {
    opacity: 0;
    filter: blur(14px);
    transform: translateY(42px) scale(0.94);
  }
  to {
    opacity: 1;
    filter: blur(0);
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 600px) {
  .lobby-page {
    overflow-y: scroll;
  }

  .page-body {
    flex: none;
    min-height: auto;
    padding: 10px 10px calc(96px + env(safe-area-inset-bottom));
    align-items: flex-start;
  }

  .lobby-card {
    padding: 14px 12px;
    gap: 12px;
    border-radius: 18px;
  }

  .main-title {
    font-size: 20px;
  }
  .subtitle {
    font-size: 13px;
  }

  .slots-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .room-slots-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .invite-panel,
  .start-order-panel {
    align-items: stretch;
    flex-direction: column;
  }

  .copy-btn {
    justify-content: center;
  }

  .slot-card {
    min-width: 0;
    gap: 8px;
    padding: 10px;
    border-radius: 12px;
  }

  .slot-num {
    width: 24px;
    height: 24px;
    border-radius: 7px;
    font-size: 12px;
  }

  .slot-you-badge {
    padding: 2px 5px;
    font-size: 9px;
  }

  .slot-type-label {
    font-size: 11px;
    line-height: 1.25;
  }

  .section-label {
    font-size: 10px;
  }

  .field-input {
    font-size: 16px; /* prevents iOS zoom on focus */
    padding: 10px 12px;
  }

  .action-row {
    flex-direction: column-reverse;
    gap: 8px;
  }

  .start-btn {
    width: 100%;
    margin-left: 0;
    padding: 14px;
    font-size: 16px;
    border-radius: 12px;
  }

  .reset-btn {
    width: 100%;
    text-align: center;
    padding: 12px;
    border: 1px solid rgba(132, 149, 136, 0.15);
    border-radius: 12px;
    color: #849588;
  }

  .settings-btn {
    align-self: stretch;
    justify-content: center;
  }

  .rules-panel {
    gap: 10px;
    padding: 12px;
  }

  .small-input {
    width: 68px;
    font-size: 15px;
  }

  .range-input {
    height: 8px;
  }

  .player-count-bar {
    gap: 4px;
  }
  .count-pill {
    padding: 10px 6px;
    font-size: 15px;
  }
}

@media (max-width: 380px) {
  .slots-grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .lobby-page::before,
  .ambient-glow,
  .lobby-card {
    animation: none;
  }
}
</style>
