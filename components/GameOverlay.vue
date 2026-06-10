<template>
  <div class="players-hud">
    <div class="players-hud-title">
      <span>Jugadores</span>
      <strong>{{ store.players.length }}</strong>
    </div>

    <div
      v-for="p in store.players"
      :key="p.id"
      class="hud-player"
      :class="{
        'hud-active': p.id === store.activePlayer?.id,
        'hud-bankrupt': store.bankruptPlayers.includes(p.id),
        'hud-jail': p.inJail,
      }"
    >
      <span class="hud-icon">{{ tokenIcon(p.tokenModel) }}</span>
      <div class="hud-copy">
        <span class="hud-name">{{ p.name }}</span>
        <span class="hud-position">Casilla {{ playerTileNumber(p) }}/40</span>
      </div>
      <span v-if="p.inJail" class="hud-jail-badge material-symbols-outlined"
        >lock</span
      >
      <span class="hud-cash" :class="{ 'hud-negative': p.cash < 0 }">
        ${{ p.cash.toLocaleString() }}
      </span>
    </div>
  </div>

  <div class="board-minimap">
    <div class="minimap-header">
      <span>Mapa</span>
      <strong>{{
        store.activePlayer ? playerTileNumber(store.activePlayer) : 0
      }}</strong>
    </div>
    <div class="minimap-board" aria-hidden="true">
      <div class="minimap-center">
        <div class="minimap-legend">
          <span><i class="legend-swatch legend-house"></i> Casas</span>
          <span><i class="legend-swatch legend-hotel"></i> Hotel</span>
          <span><i class="legend-swatch legend-mortgage"></i> Hipoteca</span>
        </div>
      </div>
      <span
        v-for="tile in minimapTiles"
        :key="tile.index"
        class="minimap-tile"
        :class="{
          'minimap-tile-corner': tile.isCorner,
          'minimap-tile-active': tile.hasActivePlayer,
          'minimap-tile-dark': tile.isDark,
        }"
        :style="{
          left: `${tile.x}%`,
          top: `${tile.y}%`,
          background: tile.background,
        }"
      >
        {{ tile.label }}
      </span>
      <span
        v-for="marker in minimapMarkers"
        :key="marker.id"
        class="minimap-marker"
        :class="{ 'minimap-marker-active': marker.isActive }"
        :style="{ left: `${marker.x}%`, top: `${marker.y}%` }"
        :title="marker.title"
      >
        {{ marker.icon }}
      </span>
    </div>
  </div>

  <div class="overlay-container">
    <div class="status-card">
      <div class="status-player">
        <span class="status-token">{{ activeTokenMeta.icon }}</span>
        <div>
          <span class="status-kicker">Turno actual</span>
          <strong>{{ activePlayerName }}</strong>
        </div>
      </div>

      <div class="status-details">
        <span class="status-chip">
          <span class="material-symbols-outlined">location_on</span>
          Casilla {{ currentPosition }}/40
        </span>
        <span class="status-chip">
          <span class="material-symbols-outlined">casino</span>
          {{ activeTokenMeta.name }}
        </span>
        <span v-if="store.isDoubles" class="doubles-badge">DOBLES</span>
      </div>

      <p>{{ store.statusMessage }}</p>
    </div>

    <div class="action-buttons">
      <button
        v-if="activePlayerInJail && !isTurnDone"
        ref="bailBtnRef"
        @click="onPayBailClick"
        :disabled="activePlayerCash < store.jailBailCost"
        tabindex="0"
        class="action-btn bail-btn"
      >
        <span class="material-symbols-outlined">lock_open</span>
        <span>Pagar fianza (${{ store.jailBailCost }})</span>
      </button>

      <button
        v-if="isMoving"
        ref="skipMoveBtnRef"
        @click="onSkipMoveClick"
        tabindex="0"
        class="action-btn skip-btn"
      >
        <span class="material-symbols-outlined">skip_next</span>
        <span>Saltar</span>
      </button>

      <button
        ref="rollBtnRef"
        @click="onPrimaryBtnClick"
        :disabled="primaryBtnDisabled"
        tabindex="0"
        class="action-btn"
        :class="primaryBtnClass"
      >
        <span class="material-symbols-outlined">{{ primaryBtnIcon }}</span>
        <span>{{ primaryBtnLabel }}</span>
      </button>

      <button
        ref="configBtnRef"
        @click="toggleSidebar"
        tabindex="0"
        class="action-btn config-btn"
        :class="{ 'config-active': sidebarOpen }"
      >
        <span class="material-symbols-outlined">settings</span>
        <span>Configuracion</span>
      </button>
    </div>
  </div>

  <SidebarConfig
    :open="sidebarOpen"
    :is-moving="isMoving"
    @close="sidebarOpen = false"
    @open-exchange="onSidebarExchange"
    @toggle-camera="onSidebarCamera"
  />

  <div
    v-if="store.isDiceVisible"
    class="dado-wrapper"
    :class="{ sliding: isSliding }"
  >
    <div class="dado-titulo">
      Total: {{ store.diceTotal }} | Casilla: {{ currentPosition }}/40
      <span v-if="store.isDoubles" class="doubles-text"> DOBLES </span>
    </div>
    <div class="dados-row">
      <div
        v-for="(value, idx) in store.diceValues"
        :key="idx"
        class="dado-pequeno"
      >
        <span
          v-for="(pos, i) in facePositions[value]"
          :key="i"
          class="circulo"
          :style="pos"
        ></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch, type Ref } from "vue";
import { GAME_CONFIG } from "~/config/gameConfig";
import { BOARD_TILES } from "~/config/boardTilesConfig";
import { useKeyboardNavigation } from "~/composables/useKeyboardNavigation";
import SidebarConfig from "~/components/SidebarConfig.vue";
import { useGameStore, type PlayerState } from "~/stores/gameStore";

const store = useGameStore();

const props = defineProps<{
  currentPosition: number;
  isMoving: boolean;
  cardOpen?: boolean;
}>();

const emit = defineEmits<{
  (e: "roll", value: number): void;
  (e: "next-turn"): void;
  (e: "open-exchange"): void;
  (e: "skip-move"): void;
}>();

const isSliding = ref(false);
const isRolling = ref(false);
const sidebarOpen = ref(false);

const activePlayerInJail = computed(() => store.activePlayer?.inJail ?? false);
const activePlayerCash = computed(() => store.activePlayer?.cash ?? 0);
const activePlayerJailRolling = ref(false);

const rollBtnRef = ref<HTMLElement | null>(null);
const skipMoveBtnRef = ref<HTMLElement | null>(null);
const configBtnRef = ref<HTMLElement | null>(null);
const bailBtnRef = ref<HTMLElement | null>(null);

const shouldAutoFocus = computed(() => !props.cardOpen && !sidebarOpen.value);
const overlayEnabled = computed(() => !props.cardOpen && !sidebarOpen.value);

const actionRefs = computed(() => {
  const refs: Ref<HTMLElement | null>[] = [];
  if (activePlayerInJail.value && !isTurnDone.value) refs.push(bailBtnRef);
  if (props.isMoving) refs.push(skipMoveBtnRef);
  refs.push(rollBtnRef, configBtnRef);
  return refs;
});

useKeyboardNavigation(actionRefs, {
  direction: "horizontal",
  autoFocusOn: shouldAutoFocus,
  enabled: overlayEnabled,
  loop: true,
});

const activeTokenMeta = computed(() => {
  const player = store.activePlayer;
  return (
    GAME_CONFIG.TOKEN_MODELS.find((t) => t.file === player?.tokenModel) ?? {
      icon: "?",
      name: "Ficha",
    }
  );
});

const activePlayerName = computed(
  () => store.activePlayer?.name ?? "Sin jugador",
);

function tokenIcon(file: string) {
  return GAME_CONFIG.TOKEN_MODELS.find((t) => t.file === file)?.icon ?? "?";
}

function playerTileNumber(player: PlayerState) {
  return (player.position % 40) + 1;
}

const minimapMarkers = computed(() => {
  const tileCounts = new Map<number, number>();

  return store.players
    .filter((player) => !store.bankruptPlayers.includes(player.id))
    .map((player) => {
      const tile = ((player.position % 40) + 40) % 40;
      const count = tileCounts.get(tile) ?? 0;
      tileCounts.set(tile, count + 1);
      const base = minimapPosition(tile);
      const offset = sharedMinimapOffset(count);

      return {
        id: player.id,
        icon: tokenIcon(player.tokenModel),
        isActive: player.id === store.activePlayer?.id,
        title: `${player.name} - casilla ${tile + 1}`,
        x: base.x + offset.x,
        y: base.y + offset.y,
      };
    });
});

const minimapTiles = computed(() => {
  const activeTile = store.activePlayer
    ? ((store.activePlayer.position % 40) + 40) % 40
    : -1;

  return Array.from({ length: 40 }, (_, index) => {
    const position = minimapPosition(index);
    const baseColor = minimapTileBaseColor(index);
    const statusColor = minimapTileStatusColor(index);
    const background = statusColor
      ? `linear-gradient(135deg, ${baseColor} 0 50%, ${statusColor} 50% 100%)`
      : baseColor;
    return {
      index,
      x: position.x,
      y: position.y,
      background,
      label: minimapTileLabel(index),
      isCorner: index % 10 === 0,
      hasActivePlayer: index === activeTile,
      isDark: positionIsDark(statusColor ?? baseColor),
    };
  });
});

function minimapTileBaseColor(tile: number) {
  const boardTile = BOARD_TILES.find((candidate) => candidate.index === tile);
  if (boardTile?.type === "property" && boardTile.color) return boardTile.color;
  return "#9ca3af";
}

function minimapTileStatusColor(tile: number) {
  const development = store.propertyDevelopments[tile];
  if (development?.mortgaged) return "#050505";
  if (development?.hotel) return "#ef4444";
  if ((development?.houses ?? 0) > 0) return "#22c55e";
  return null;
}

function minimapTileLabel(tile: number) {
  if (tile === 0) return "GO";
  if (tile === 10) return "J";
  if (tile === 20) return "P";
  if (tile === 30) return "C";
  return "";
}

function positionIsDark(color: string) {
  if (color === "#050505") return true;
  const hex = color.replace("#", "");
  if (hex.length !== 6) return false;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 95;
}

function minimapPosition(tile: number) {
  const edgeMin = 7;
  const edgeMax = 93;
  const span = edgeMax - edgeMin;

  if (tile <= 10) {
    return {
      x: edgeMin + (tile / 10) * span,
      y: edgeMax,
    };
  }

  if (tile <= 20) {
    return {
      x: edgeMax,
      y: edgeMax - ((tile - 10) / 10) * span,
    };
  }

  if (tile <= 30) {
    return {
      x: edgeMax - ((tile - 20) / 10) * span,
      y: edgeMin,
    };
  }

  return {
    x: edgeMin,
    y: edgeMin + ((tile - 30) / 10) * span,
  };
}

function sharedMinimapOffset(index: number) {
  if (index === 0) return { x: 0, y: 0 };
  const radius = 4;
  const angle = (index - 1) * 1.9;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

function focusPrimaryButton() {
  nextTick(() => {
    if (props.cardOpen || sidebarOpen.value) return;
    if (props.isMoving) {
      skipMoveBtnRef.value?.focus();
      return;
    }
    rollBtnRef.value?.focus();
  });
}

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value;
  if (!sidebarOpen.value) {
    nextTick(() => rollBtnRef.value?.focus());
  }
}

function onSidebarExchange() {
  emit("open-exchange");
}

function onSidebarCamera() {
  // Camera toggle is handled inside SidebarConfig.
}

watch(
  () => store.isTurnComplete,
  () => focusPrimaryButton(),
);
watch(
  () => store.activePlayerIndex,
  () => focusPrimaryButton(),
);
watch(
  () => props.isMoving,
  () => focusPrimaryButton(),
);
watch(
  () => props.cardOpen,
  (val) => {
    if (val) {
      sidebarOpen.value = false;
    }
    if (!val) focusPrimaryButton();
  },
);
watch(
  () => sidebarOpen.value,
  (val) => {
    if (!val) {
      nextTick(() => rollBtnRef.value?.focus());
    }
  },
);

onMounted(() => focusPrimaryButton());

const facePositions: Record<number, Record<string, string>[]> = {
  1: [{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }],
  2: [
    { top: "15%", right: "15%" },
    { bottom: "15%", left: "15%" },
  ],
  3: [
    { top: "15%", right: "15%" },
    { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
    { bottom: "15%", left: "15%" },
  ],
  4: [
    { top: "15%", left: "15%" },
    { top: "15%", right: "15%" },
    { bottom: "15%", left: "15%" },
    { bottom: "15%", right: "15%" },
  ],
  5: [
    { top: "15%", left: "15%" },
    { top: "15%", right: "15%" },
    { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
    { bottom: "15%", left: "15%" },
    { bottom: "15%", right: "15%" },
  ],
  6: [
    { top: "15%", left: "15%" },
    { top: "50%", left: "15%", transform: "translateY(-50%)" },
    { bottom: "15%", left: "15%" },
    { top: "15%", right: "15%" },
    { top: "50%", right: "15%", transform: "translateY(-50%)" },
    { bottom: "15%", right: "15%" },
  ],
};

const isTurnDone = computed(() => store.isTurnComplete);

const primaryBtnLabel = computed(() => {
  if (isTurnDone.value) return "Siguiente";
  if (activePlayerInJail.value) return "Tirar por dobles";
  if (store.isDiceRolling) return "Rodando...";
  if (props.isMoving) return "Moviendo...";
  return "Tirar Dados";
});

const primaryBtnIcon = computed(() => {
  if (isTurnDone.value) return "navigate_next";
  if (activePlayerInJail.value) return "casino";
  if (store.isDiceRolling) return "progress_activity";
  if (props.isMoving) return "directions_walk";
  return "casino";
});

const primaryBtnDisabled = computed(() => {
  if (isTurnDone.value) return false;
  return (
    props.isMoving ||
    store.isDiceRolling ||
    (activePlayerInJail.value && activePlayerJailRolling.value)
  );
});

const primaryBtnClass = computed(() => {
  if (isTurnDone.value) return { "next-btn": true };
  return {
    "roll-btn": true,
    "disabled-btn":
      props.isMoving ||
      store.isDiceRolling ||
      (activePlayerInJail.value && activePlayerJailRolling.value),
    "jail-roll-btn": activePlayerInJail.value,
  };
});

function onPrimaryBtnClick() {
  if (isTurnDone.value) {
    emit("next-turn");
  } else {
    onRollClick();
  }
}

function onPayBailClick() {
  const player = store.activePlayer;
  if (!player || !player.inJail) return;
  store.payJailBail(player.id);
}

function onSkipMoveClick() {
  emit("skip-move");
}

async function onRollClick() {
  if (isRolling.value) return;
  isRolling.value = true;
  store.showDice();
  isSliding.value = false;

  await new Promise((resolve) => {
    setTimeout(() => {
      isSliding.value = true;

      setTimeout(() => {
        store.finishDiceRoll();
        setTimeout(() => {
          const result = store.diceTotal;
          store.hideDice();
          isSliding.value = false;
          isRolling.value = false;
          emit("roll", result);
        }, 500);
      }, 500);
    }, 1500);
  });
}
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap");

.dado-wrapper {
  position: absolute;
  top: 18px;
  left: 50%;
  z-index: 150;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  color: #ecfdf5;
  background: rgba(10, 16, 25, 0.9);
  border: 1px solid rgba(134, 239, 172, 0.24);
  border-radius: 8px;
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.28);
  transform: translateX(-50%);
  pointer-events: auto;
  font-family: "Inter", sans-serif;
}

.dados-row {
  display: flex;
  flex-direction: row;
  gap: 10px;
  align-items: center;
  justify-content: center;
}

.dado-titulo {
  color: #86efac;
  font-size: 11px;
  font-weight: 600;
}

.dado-pequeno {
  position: relative;
  width: 40px;
  height: 40px;
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.55);
  border-radius: 8px;
  box-shadow: inset 0 -3px 0 rgba(15, 23, 42, 0.12);
}

.circulo {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #111827;
  border-radius: 50%;
}

.sliding {
  animation: slideUp 0.5s ease-in forwards;
}

@keyframes slideUp {
  from {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  to {
    opacity: 0;
    transform: translateX(-50%) translateY(-100px);
  }
}

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
  font-family: "Inter", sans-serif;
}

.status-card {
  width: min(680px, 100%);
  display: grid;
  grid-template-columns: minmax(190px, auto) minmax(0, 1fr);
  gap: 10px 14px;
  align-items: center;
  padding: 10px 12px;
  color: #ffffff;
  background: rgba(10, 16, 25, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 8px;
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(12px);
  pointer-events: auto;
}

.status-player {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-token {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: #facc15;
  color: #111827;
  font-size: 20px;
  font-weight: 950;
  box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.14);
}

.status-kicker {
  display: block;
  color: rgba(255, 255, 255, 0.52);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: uppercase;
}

.status-player strong {
  display: block;
  color: #f8fafc;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.status-details {
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 7px;
}

.status-chip,
.doubles-badge {
  min-height: 26px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.status-chip {
  color: #dbeafe;
  background: rgba(37, 99, 235, 0.16);
  border: 1px solid rgba(147, 197, 253, 0.18);
}

.status-chip .material-symbols-outlined {
  font-size: 15px;
}

.status-card p {
  grid-column: 1 / -1;
  margin: 0;
  color: #86efac;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.35;
  text-align: center;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  pointer-events: auto;
}

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
  transition: all 0.2s ease;
}

.roll-btn,
.next-btn {
  min-width: 178px;
  background: #10b981;
  box-shadow: 0 12px 22px rgba(16, 185, 129, 0.34);
}

.roll-btn:hover:not(.disabled-btn),
.next-btn:hover {
  background: #059669;
  transform: translateY(-2px);
}

.next-btn {
  background: #2563eb;
  box-shadow: 0 12px 22px rgba(37, 99, 235, 0.34);
}

.next-btn:hover {
  background: #1d4ed8;
}

.bail-btn {
  background: #f59e0b;
  color: #111827;
  box-shadow: 0 10px 18px rgba(245, 158, 11, 0.28);
}

.bail-btn:hover:not(:disabled) {
  background: #d97706;
  transform: translateY(-2px);
}

.bail-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.skip-btn {
  min-width: 132px;
  background: #f97316;
  color: #fff7ed;
  box-shadow: 0 10px 18px rgba(249, 115, 22, 0.32);
}

.skip-btn:hover {
  background: #ea580c;
  transform: translateY(-2px);
}

.config-btn {
  background: #475569;
  box-shadow: 0 10px 18px rgba(0, 0, 0, 0.22);
}

.config-btn:hover:not(.config-active) {
  background: #334155;
  transform: translateY(-2px);
}

.config-active {
  background: #2563eb;
  box-shadow: 0 12px 22px rgba(37, 99, 235, 0.3);
}

.disabled-btn {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

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
  font-family: "Inter", sans-serif;
}

.players-hud-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2px 2px;
  color: rgba(255, 255, 255, 0.64);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0;
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
  grid-template-columns: 34px minmax(0, 1fr) auto;
  gap: 9px;
  align-items: center;
  padding: 8px 10px;
  color: #ffffff;
  background: rgba(10, 16, 25, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.11);
  border-radius: 8px;
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.24);
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;
}

.hud-active {
  border-color: rgba(134, 239, 172, 0.48);
  background:
    linear-gradient(90deg, rgba(22, 163, 74, 0.22), rgba(10, 16, 25, 0.84)),
    rgba(10, 16, 25, 0.82);
}

.hud-bankrupt {
  opacity: 0.38;
  filter: grayscale(0.7);
}

.hud-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  font-size: 16px;
}

.hud-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hud-name {
  color: #f8fafc;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.15;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hud-active .hud-name {
  color: #86efac;
}

.hud-position {
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  font-weight: 500;
}

.hud-cash {
  color: #86efac;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.hud-negative {
  color: #f87171;
}

.hud-jail {
  border-color: rgba(251, 191, 36, 0.5);
  background:
    linear-gradient(90deg, rgba(245, 158, 11, 0.18), rgba(10, 16, 25, 0.84)),
    rgba(10, 16, 25, 0.82);
}

.hud-jail-badge {
  color: #fbbf24;
  font-size: 16px;
}

.board-minimap {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 95;
  width: 226px;
  padding: 10px;
  border-radius: 8px;
  background: rgba(10, 16, 25, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.26);
  backdrop-filter: blur(10px);
  pointer-events: none;
  font-family: "Inter", sans-serif;
}

.minimap-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: rgba(255, 255, 255, 0.64);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0;
}

.minimap-header strong {
  min-width: 24px;
  padding: 3px 7px;
  border-radius: 8px;
  color: #111827;
  background: #86efac;
  text-align: center;
}

.minimap-board {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
  background:
    linear-gradient(rgba(15, 23, 42, 0.94), rgba(15, 23, 42, 0.94)) center / 70%
      70% no-repeat,
    #273142;
  border: 1px solid rgba(255, 255, 255, 0.14);
  overflow: hidden;
}

.minimap-center {
  position: absolute;
  inset: 17%;
  border-radius: 6px;
  background: rgba(10, 16, 25, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: grid;
  place-items: center;
  padding: 8px;
}

.minimap-legend {
  width: 100%;
  display: grid;
  gap: 5px;
  color: rgba(248, 250, 252, 0.78);
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}

.minimap-legend span {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.legend-swatch {
  width: 13px;
  height: 13px;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  flex: 0 0 auto;
}

.legend-house {
  background: linear-gradient(135deg, #f8fafc 0 50%, #22c55e 50% 100%);
}

.legend-hotel {
  background: linear-gradient(135deg, #f8fafc 0 50%, #ef4444 50% 100%);
}

.legend-mortgage {
  background: linear-gradient(135deg, #f8fafc 0 50%, #050505 50% 100%);
}

.minimap-tile {
  position: absolute;
  width: 21px;
  height: 21px;
  display: grid;
  place-items: center;
  transform: translate(-50%, -50%);
  border-radius: 4px;
  color: #111827;
  font-size: 8px;
  font-weight: 800;
  border: 1px solid rgba(15, 23, 42, 0.58);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  z-index: 1;
}

.minimap-tile-corner {
  width: 30px;
  height: 30px;
  font-size: 10px;
  border-radius: 6px;
  z-index: 2;
}

.minimap-tile-active {
  outline: 2px solid #86efac;
  outline-offset: 1px;
}

.minimap-tile-dark {
  color: #f8fafc;
}

.minimap-marker {
  position: absolute;
  width: 25px;
  height: 25px;
  display: grid;
  place-items: center;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  color: #f8fafc;
  background: #111827;
  border: 2px solid rgba(248, 250, 252, 0.85);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.38);
  font-size: 13px;
  line-height: 1;
  z-index: 4;
}

.minimap-marker-active {
  border-color: #86efac;
  box-shadow:
    0 0 0 3px rgba(134, 239, 172, 0.22),
    0 4px 10px rgba(0, 0, 0, 0.38);
}

.doubles-badge {
  background: #f59e0b;
  color: #111827;
  border: 1px solid rgba(253, 230, 138, 0.36);
  letter-spacing: 0;
}

.doubles-text {
  color: #fbbf24;
  font-weight: 600;
  margin-left: 6px;
}

.jail-roll-btn {
  background: #7c3aed !important;
  box-shadow: 0 12px 22px rgba(124, 58, 237, 0.32) !important;
}

.jail-roll-btn:hover:not(.disabled-btn) {
  background: #6d28d9 !important;
  transform: translateY(-2px);
}

.action-btn:focus-visible {
  outline: 2px solid #00e38f;
  outline-offset: 3px;
  box-shadow: 0 0 0 4px rgba(0, 245, 155, 0.25);
}

.roll-btn:focus-visible {
  outline-color: #4ade80;
  box-shadow:
    0 12px 22px rgba(16, 185, 129, 0.34),
    0 0 0 4px rgba(74, 222, 128, 0.25);
}

.next-btn:focus-visible,
.config-btn:focus-visible {
  outline-color: #93c5fd;
  box-shadow:
    0 12px 22px rgba(37, 99, 235, 0.3),
    0 0 0 4px rgba(147, 197, 253, 0.25);
}

.bail-btn:focus-visible {
  outline-color: #f59e0b;
  box-shadow:
    0 10px 18px rgba(245, 158, 11, 0.28),
    0 0 0 4px rgba(245, 158, 11, 0.25);
}

.material-symbols-outlined {
  font-size: 18px;
  line-height: 1;
}

@media (max-width: 720px) {
  .players-hud {
    left: 12px;
    right: 12px;
    top: 238px;
    width: auto;
  }

  .board-minimap {
    top: 12px;
    left: 12px;
    width: 190px;
  }

  .minimap-legend {
    font-size: 9px;
    gap: 4px;
  }

  .overlay-container {
    bottom: 16px;
    width: calc(100vw - 24px);
  }

  .status-card {
    grid-template-columns: 1fr;
  }

  .status-details {
    justify-content: flex-start;
  }

  .action-buttons,
  .action-btn {
    width: 100%;
  }

  .action-btn {
    min-width: 0;
  }
}
</style>
