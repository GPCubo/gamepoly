<template>
  <Transition name="sidebar">
    <div v-if="open" class="sidebar-config">
      <div class="sidebar-header">
        <span class="sidebar-title">Configuracion</span>
        <button class="sidebar-close" tabindex="-1" @click="emit('close')">x</button>
      </div>

      <div class="sidebar-body">
        <button
          v-if="store.hasAnyPropertyOwned"
          ref="exchangeBtnRef"
          class="sidebar-btn exchange-btn"
          :class="{ 'disabled-btn': managementDisabled || !store.canExchange }"
          :disabled="managementDisabled || !store.canExchange"
          tabindex="0"
          @click="onExchangeClick"
        >
          <span class="material-symbols-outlined">swap_horiz</span>
          <span>Intercambio</span>
        </button>

        <button
          ref="camBtnRef"
          class="sidebar-btn cam-btn"
          :class="{ 'cam-active': store.isCamFollowActive }"
          tabindex="0"
          @click="onCameraToggle"
        >
          <span class="material-symbols-outlined">videocam</span>
          <span>{{ store.isCamFollowActive ? "Camara: Fija" : "Camara: Libre" }}</span>
        </button>

        <section class="property-panel">
          <div class="panel-heading">
            <span class="panel-title">Propiedades</span>
            <span class="panel-count">{{ activeOwnedTiles.length }}</span>
          </div>

          <p v-if="!activeOwnedTiles.length" class="empty-text">
            Sin propiedades
          </p>

          <div v-else class="property-list">
            <article
              v-for="tile in activeOwnedTiles"
              :key="tile.index"
              class="property-card"
              :class="{ mortgaged: developmentFor(tile).mortgaged }"
              :style="tileAccentStyle(tile)"
            >
              <div class="property-main">
                <span class="property-accent" />
                <div class="property-copy">
                  <strong>{{ tile.shortName ?? tile.name }}</strong>
                  <span>{{ developmentLabel(tile) }}</span>
                </div>
              </div>

              <div class="property-actions">
                <button
                  v-if="tile.type === 'property' && !developmentFor(tile).hotel && developmentFor(tile).houses < 4"
                  class="mini-action build-action"
                  :class="{ 'disabled-btn': !canBuildHouse(tile) }"
                  :disabled="!canBuildHouse(tile)"
                  @click="onBuildHouse(tile)"
                >
                  <span class="material-symbols-outlined">home_work</span>
                  <span>Casa ${{ store.getHouseCost(tile.index) }}</span>
                </button>

                <button
                  v-if="tile.type === 'property' && !developmentFor(tile).hotel && developmentFor(tile).houses >= 4"
                  class="mini-action hotel-action"
                  :class="{ 'disabled-btn': !canBuildHotel(tile) }"
                  :disabled="!canBuildHotel(tile)"
                  @click="onBuildHotel(tile)"
                >
                  <span class="material-symbols-outlined">apartment</span>
                  <span>Hotel ${{ store.getHotelCost(tile.index) }}</span>
                </button>

                <button
                  v-if="tile.type === 'property' && canShowSell(tile)"
                  class="mini-action sell-action"
                  :class="{ 'disabled-btn': !canSellImprovement(tile) }"
                  :disabled="!canSellImprovement(tile)"
                  @click="onSellImprovement(tile)"
                >
                  <span class="material-symbols-outlined">sell</span>
                  <span>Vender +${{ sellRefund(tile) }}</span>
                </button>

                <button
                  v-if="!developmentFor(tile).mortgaged"
                  class="mini-action mortgage-action"
                  :class="{ 'disabled-btn': !canMortgage(tile) }"
                  :disabled="!canMortgage(tile)"
                  @click="onMortgage(tile)"
                >
                  <span class="material-symbols-outlined">account_balance</span>
                  <span>Hipotecar +${{ store.getMortgageValue(tile.index) }}</span>
                </button>

                <button
                  v-else
                  class="mini-action mortgage-action"
                  :class="{ 'disabled-btn': !canUnmortgage(tile) }"
                  :disabled="!canUnmortgage(tile)"
                  @click="onUnmortgage(tile)"
                >
                  <span class="material-symbols-outlined">paid</span>
                  <span>Pagar ${{ store.getUnmortgageCost(tile.index) }}</span>
                </button>
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch, type Ref } from "vue";
import { BOARD_TILES, type BoardTile } from "~/config/boardTilesConfig";
import { useKeyboardNavigation } from "~/composables/useKeyboardNavigation";
import { useGameStore, type PropertyDevelopmentState } from "~/stores/gameStore";

const store = useGameStore();

const props = defineProps<{
  open: boolean;
  isMoving: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "open-exchange"): void;
  (e: "toggle-camera"): void;
}>();

const exchangeBtnRef = ref<HTMLElement | null>(null);
const camBtnRef = ref<HTMLElement | null>(null);

const activePlayerId = computed(() => store.activePlayer?.id ?? -1);
const managementDisabled = computed(
  () => props.isMoving || store.isDiceRolling || store.phase !== "playing",
);

const activeOwnedTiles = computed(() =>
  BOARD_TILES.filter(
    (tile) => isOwnableTile(tile) && store.propertyOwners[tile.index] === activePlayerId.value,
  ),
);

const sidebarEnabled = computed(() => props.open);

const sidebarRefs = computed(() => {
  const refs: Ref<HTMLElement | null>[] = [];
  if (store.hasAnyPropertyOwned) refs.push(exchangeBtnRef);
  refs.push(camBtnRef);
  return refs;
});

const { autoFocus } = useKeyboardNavigation(sidebarRefs, {
  direction: "vertical",
  enabled: sidebarEnabled,
  loop: true,
});

function isOwnableTile(tile: BoardTile) {
  return tile.type === "property" || tile.type === "railroad" || tile.type === "utility";
}

function developmentFor(tile: BoardTile): PropertyDevelopmentState {
  return store.getPropertyDevelopment(tile.index);
}

function tileAccentStyle(tile: BoardTile) {
  return {
    "--property-accent": tile.color ?? "#4ade80",
  };
}

function developmentLabel(tile: BoardTile) {
  const development = developmentFor(tile);
  if (development.mortgaged) return "Hipotecada";
  if (tile.type === "railroad") return "Activa";
  if (tile.type === "utility") return "Activa";
  if (development.hotel) return "Hotel";
  if (development.houses > 0) return `${development.houses}/4 casas`;
  if (store.ownsFullPropertyGroup(tile.index, activePlayerId.value)) return "Grupo completo";
  return "Sin mejoras";
}

function canBuildHouse(tile: BoardTile) {
  return !managementDisabled.value && store.canBuildHouse(tile.index, activePlayerId.value);
}

function canBuildHotel(tile: BoardTile) {
  return !managementDisabled.value && store.canBuildHotel(tile.index, activePlayerId.value);
}

function canShowSell(tile: BoardTile) {
  const development = developmentFor(tile);
  return development.hotel || development.houses > 0;
}

function canSellImprovement(tile: BoardTile) {
  return !managementDisabled.value && store.canSellImprovement(tile.index, activePlayerId.value);
}

function canMortgage(tile: BoardTile) {
  return !managementDisabled.value && store.canMortgageProperty(tile.index, activePlayerId.value);
}

function canUnmortgage(tile: BoardTile) {
  return !managementDisabled.value && store.canUnmortgageProperty(tile.index, activePlayerId.value);
}

function sellRefund(tile: BoardTile) {
  const development = developmentFor(tile);
  if (development.hotel) return Math.round(store.getHotelCost(tile.index) / 2);
  return Math.round(store.getHouseCost(tile.index) / 2);
}

function onBuildHouse(tile: BoardTile) {
  if (!canBuildHouse(tile)) return;
  store.buildHouse(tile.index, activePlayerId.value);
}

function onBuildHotel(tile: BoardTile) {
  if (!canBuildHotel(tile)) return;
  store.buildHotel(tile.index, activePlayerId.value);
}

function onSellImprovement(tile: BoardTile) {
  if (!canSellImprovement(tile)) return;
  store.sellImprovement(tile.index, activePlayerId.value);
}

function onMortgage(tile: BoardTile) {
  if (!canMortgage(tile)) return;
  store.mortgageProperty(tile.index, activePlayerId.value);
}

function onUnmortgage(tile: BoardTile) {
  if (!canUnmortgage(tile)) return;
  store.unmortgageProperty(tile.index, activePlayerId.value);
}

function onEscKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && props.open) {
    emit("close");
  }
}

onMounted(() => {
  window.addEventListener("keydown", onEscKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onEscKeydown);
});

watch(
  () => props.open,
  (val) => {
    if (val) {
      nextTick(() => autoFocus());
    }
  },
);

function onExchangeClick() {
  emit("close");
  nextTick(() => emit("open-exchange"));
}

function onCameraToggle() {
  store.toggleCameraFollow();
}
</script>

<style scoped>
.sidebar-config {
  position: absolute;
  top: 0;
  left: 0;
  width: min(320px, 88vw);
  height: 100%;
  background: rgba(15, 15, 30, 0.94);
  border-right: 1px solid rgba(74, 222, 128, 0.15);
  z-index: 170;
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  backdrop-filter: blur(8px);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 12px;
  border-bottom: 1px solid rgba(74, 222, 128, 0.1);
}

.sidebar-title {
  color: #4ade80;
  font-family: monospace;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.sidebar-close {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.7);
  font-size: 16px;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  line-height: 1;
}

.sidebar-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-color: rgba(255, 255, 255, 0.4);
}

.sidebar-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  overflow-y: auto;
}

.sidebar-btn {
  color: white;
  border: none;
  padding: 13px 14px;
  font-size: 15px;
  font-weight: 800;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
}

.exchange-btn {
  background: #8b5cf6;
  box-shadow: 0 6px 12px rgba(139, 92, 246, 0.3);
}

.exchange-btn:hover:not(.disabled-btn) {
  background: #7c3aed;
  transform: translateX(4px);
}

.cam-btn {
  background: #4b5563;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
}

.cam-btn:hover:not(.cam-active) {
  background: #374151;
  transform: translateX(4px);
}

.cam-active {
  background: #3b82f6;
  box-shadow: 0 6px 12px rgba(59, 130, 246, 0.4);
}

.property-panel {
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.panel-title {
  color: rgba(255, 255, 255, 0.72);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.panel-count {
  min-width: 24px;
  padding: 3px 7px;
  border-radius: 999px;
  background: rgba(74, 222, 128, 0.16);
  color: #86efac;
  font-size: 12px;
  font-weight: 900;
  text-align: center;
}

.empty-text {
  margin: 0;
  padding: 12px;
  border: 1px dashed rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.52);
  font-size: 13px;
}

.property-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.property-card {
  --property-accent: #4ade80;
  padding: 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.property-card.mortgaged {
  background: rgba(148, 163, 184, 0.08);
}

.property-main {
  display: grid;
  grid-template-columns: 8px 1fr;
  gap: 9px;
  align-items: stretch;
  min-width: 0;
}

.property-accent {
  width: 8px;
  border-radius: 999px;
  background: var(--property-accent);
  box-shadow: 0 0 14px color-mix(in srgb, var(--property-accent), transparent 42%);
}

.property-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.property-copy strong {
  color: white;
  font-size: 13px;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.property-copy span {
  color: rgba(255, 255, 255, 0.56);
  font-size: 12px;
  font-weight: 700;
}

.property-actions {
  display: grid;
  grid-template-columns: 1fr;
  gap: 7px;
  margin-top: 9px;
}

.mini-action {
  min-height: 34px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 900;
  transition: all 0.16s ease;
}

.mini-action:hover:not(.disabled-btn) {
  transform: translateX(3px);
  filter: brightness(1.06);
}

.build-action {
  background: #2563eb;
}

.hotel-action {
  background: #dc2626;
}

.sell-action {
  background: #d97706;
}

.mortgage-action {
  background: #475569;
}

.disabled-btn {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

.sidebar-btn:focus-visible,
.mini-action:focus-visible {
  outline: 2px solid #00e38f;
  outline-offset: 3px;
  box-shadow: 0 0 0 4px rgba(0, 245, 155, 0.25);
}

.exchange-btn:focus-visible {
  outline-color: #a78bfa;
  box-shadow:
    0 6px 12px rgba(139, 92, 246, 0.3),
    0 0 0 4px rgba(167, 139, 250, 0.25);
}

.cam-btn:focus-visible {
  outline-color: #9ca3af;
  box-shadow:
    0 6px 12px rgba(0, 0, 0, 0.2),
    0 0 0 4px rgba(156, 163, 175, 0.25);
}

.material-symbols-outlined {
  font-size: 18px;
  line-height: 1;
}

.sidebar-enter-active {
  transition: transform 0.25s ease-out;
}

.sidebar-leave-active {
  transition: transform 0.2s ease-in;
}

.sidebar-enter-from {
  transform: translateX(-100%);
}

.sidebar-leave-to {
  transform: translateX(-100%);
}
</style>
