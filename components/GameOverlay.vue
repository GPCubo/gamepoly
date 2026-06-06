<template>
  <div class="players-hud">
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
      <span class="hud-name">{{ p.name }}</span>
      <span v-if="p.inJail" class="hud-jail-badge">🔓</span>
      <span class="hud-cash" :class="{ 'hud-negative': p.cash < 0 }"
        >${{ p.cash.toLocaleString() }}</span
      >
    </div>
  </div>

  <div class="overlay-container">
    <div class="status-badge">
      {{ statusText }} | Casilla: {{ currentPosition }}/40 |
      {{ store.statusMessage }}
      <span v-if="store.isDoubles" class="doubles-badge">DOBLES</span>
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
        🔓 Pagar fianza (${{ store.jailBailCost }})
      </button>

      <button
        ref="rollBtnRef"
        @click="onPrimaryBtnClick"
        :disabled="primaryBtnDisabled"
        tabindex="0"
        class="action-btn"
        :class="primaryBtnClass"
      >
        {{ primaryBtnLabel }}
      </button>

      <button
        ref="configBtnRef"
        @click="toggleSidebar"
        tabindex="0"
        class="action-btn config-btn"
        :class="{ 'config-active': sidebarOpen }"
      >
        ⚙ Configuración
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
    class="dado-wrapper"
    v-if="store.isDiceVisible"
    :class="{ sliding: isSliding }"
  >
    <div class="dado-titulo">
      Total: {{ store.diceTotal }} · Casilla: {{ currentPosition }}/40
      <span v-if="store.isDoubles" class="doubles-text"> ¡DOBLES! </span>
    </div>
    <div class="dados-row">
      <div
        class="dado-pequeño"
        v-for="(value, idx) in store.diceValues"
        :key="idx"
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
import { useGameStore } from "~/stores/gameStore";
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  watch,
  nextTick,
  type Ref,
} from "vue";
import { GAME_CONFIG } from "~/config/gameConfig";
import { useKeyboardNavigation } from "~/composables/useKeyboardNavigation";
import SidebarConfig from "~/components/SidebarConfig.vue";

const store = useGameStore();

const statusText = computed(() => {
  const ap = store.activePlayer;
  if (!ap) return "Sin jugador";
  const token = GAME_CONFIG.TOKEN_MODELS.find((t) => t.file === ap.tokenModel);
  return `${token?.icon ?? "?"} ${ap.name} (${token?.name ?? "?"})`;
});

function tokenIcon(file: string) {
  return GAME_CONFIG.TOKEN_MODELS.find((t) => t.file === file)?.icon ?? "?";
}

const props = defineProps<{
  currentPosition: number;
  isMoving: boolean;
  cardOpen?: boolean;
}>();

const emit = defineEmits<{
  (e: "roll", value: number): void;
  (e: "next-turn"): void;
  (e: "open-exchange"): void;
}>();

const isSliding = ref(false);
const isRolling = ref(false);
const sidebarOpen = ref(false);

const activePlayerInJail = computed(() => store.activePlayer?.inJail ?? false);
const activePlayerCash = computed(() => store.activePlayer?.cash ?? 0);
const activePlayerJailRolling = ref(false);

const rollBtnRef = ref<HTMLElement | null>(null);
const configBtnRef = ref<HTMLElement | null>(null);
const bailBtnRef = ref<HTMLElement | null>(null);

const shouldAutoFocus = computed(() => !props.cardOpen && !sidebarOpen.value);
const overlayEnabled = computed(() => !props.cardOpen && !sidebarOpen.value);

const actionRefs = computed(() => {
  const refs: Ref<HTMLElement | null>[] = [];
  if (activePlayerInJail.value && !isTurnDone.value) refs.push(bailBtnRef);
  refs.push(rollBtnRef, configBtnRef);
  return refs;
});

const { focusButton, autoFocus } = useKeyboardNavigation(actionRefs, {
  direction: "horizontal",
  autoFocusOn: shouldAutoFocus,
  enabled: overlayEnabled,
  loop: true,
});

function focusPrimaryButton() {
  nextTick(() => {
    if (props.cardOpen || sidebarOpen.value) return;
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
  // Camera toggle is already handled inside SidebarConfig via store.toggleCameraFollow()
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
  if (isTurnDone.value) return "Siguiente ↪";
  if (activePlayerInJail.value) return "🎲 Tirar por dobles";
  if (store.isDiceRolling) return "Rodando...";
  if (props.isMoving) return "Moviendo...";
  return "🎲 Tirar Dados";
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
.dado-wrapper {
  background: rgba(0, 0, 0, 0.8);
  border-radius: 20px;
  color: #4ade80;
  font-family: monospace;
  font-size: 12px;
  border: 1px solid rgba(74, 222, 128, 0.2);
  padding: 10px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 150;
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: auto;
}

.dados-row {
  display: flex;
  flex-direction: row;
  gap: 10px;
  align-items: center;
  justify-content: center;
}

.dado-titulo {
  font-size: 11px;
  opacity: 0.9;
}

.dado-pequeño {
  width: 40px;
  height: 40px;
  background: white;
  border: 1px solid #333;
  border-radius: 6px;
  position: relative;
}

.circulo {
  width: 8px;
  height: 8px;
  background: #333;
  border-radius: 50%;
  position: absolute;
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
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  pointer-events: none;
}

.status-badge {
  background: rgba(0, 0, 0, 0.8);
  padding: 8px 16px;
  border-radius: 20px;
  color: #4ade80;
  font-family: monospace;
  font-size: 12px;
  border: 1px solid rgba(74, 222, 128, 0.2);
  pointer-events: auto;
}

.action-buttons {
  display: flex;
  gap: 12px;
  pointer-events: auto;
}

.action-btn {
  color: white;
  border: none;
  padding: 14px 24px;
  font-size: 16px;
  font-weight: bold;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.roll-btn {
  background: #10b981;
  padding: 14px 32px;
  font-size: 18px;
  box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.4);
}

.roll-btn:hover:not(.disabled-btn) {
  background: #059669;
  transform: translateY(-2px);
}

.next-btn {
  background: #3b82f6;
  padding: 14px 32px;
  font-size: 18px;
  box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.4);
}

.next-btn:hover {
  background: #2563eb;
  transform: translateY(-2px);
}

.bail-btn {
  background: #f59e0b;
  color: #1a1a2e;
  box-shadow: 0 8px 16px rgba(245, 158, 11, 0.3);
}

.bail-btn:hover:not(:disabled) {
  background: #d97706;
  transform: translateY(-2px);
}

.bail-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.config-btn {
  background: #4b5563;
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.2);
}

.config-btn:hover:not(.config-active) {
  background: #374151;
  transform: translateY(-2px);
}

.config-active {
  background: #6366f1;
  box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.4);
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
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 100;
  pointer-events: none;
}

.hud-player {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(74, 222, 128, 0.1);
  border-radius: 10px;
  padding: 6px 12px;
  font-family: monospace;
  font-size: 12px;
  transition: all 0.2s;
}

.hud-active {
  border-color: rgba(74, 222, 128, 0.5);
  background: rgba(74, 222, 128, 0.08);
}

.hud-bankrupt {
  opacity: 0.35;
  text-decoration: line-through;
}

.hud-icon {
  font-size: 14px;
}

.hud-name {
  color: rgba(255, 255, 255, 0.7);
  min-width: 70px;
}

.hud-active .hud-name {
  color: #4ade80;
  font-weight: bold;
}

.hud-cash {
  color: #4ade80;
  font-weight: bold;
  margin-left: auto;
  padding-left: 12px;
}

.hud-negative {
  color: #f87171;
}

.hud-jail {
  border-color: rgba(251, 191, 36, 0.5);
  background: rgba(251, 191, 36, 0.08);
}

.hud-jail-badge {
  font-size: 12px;
}

.doubles-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 10px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: #1a1a2e;
  font-family: "JetBrains Mono", monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border-radius: 6px;
}

.doubles-text {
  color: #fbbf24;
  font-weight: 700;
  margin-left: 6px;
}

.jail-roll-btn {
  background: #6366f1 !important;
  box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.4) !important;
}

.jail-roll-btn:hover:not(.disabled-btn) {
  background: #4f46e5 !important;
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
    0 10px 15px -3px rgba(16, 185, 129, 0.4),
    0 0 0 4px rgba(74, 222, 128, 0.25);
}

.next-btn:focus-visible {
  outline-color: #3b82f6;
  box-shadow:
    0 10px 15px -3px rgba(59, 130, 246, 0.4),
    0 0 0 4px rgba(59, 130, 246, 0.25);
}

.bail-btn:focus-visible {
  outline-color: #f59e0b;
  box-shadow:
    0 8px 16px rgba(245, 158, 11, 0.3),
    0 0 0 4px rgba(245, 158, 11, 0.25);
}

.config-btn:focus-visible {
  outline: 2px solid #818cf8;
  outline-offset: 3px;
  box-shadow:
    0 8px 15px rgba(0, 0, 0, 0.2),
    0 0 0 4px rgba(129, 140, 248, 0.25);
}
</style>
