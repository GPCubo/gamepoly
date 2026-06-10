<template>
  <Transition name="sidebar">
    <div v-if="open" class="sidebar-config">
      <div class="sidebar-header">
        <span class="sidebar-title">Configuracion</span>
        <button class="sidebar-close" tabindex="-1" @click="emit('close')">x</button>
      </div>

      <div class="sidebar-body">
        <section class="player-summary">
          <div class="player-avatar">{{ activePlayerInitial }}</div>
          <div class="player-summary-copy">
            <span>Turno actual</span>
            <strong>{{ store.activePlayer?.name ?? "Jugador" }}</strong>
          </div>
          <div class="player-cash">${{ (store.activePlayer?.cash ?? 0).toLocaleString() }}</div>
        </section>

        <div class="quick-actions">
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
            <span>{{ store.isCamFollowActive ? "Camara fija" : "Camara libre" }}</span>
          </button>
        </div>

        <section class="property-panel">
          <div class="panel-heading">
            <div>
              <span class="panel-kicker">Gestion</span>
              <span class="panel-title">Propiedades</span>
            </div>
            <span class="panel-count">{{ filteredOwnedTiles.length }}/{{ activeOwnedTiles.length }}</span>
          </div>

          <label class="property-search">
            <span class="material-symbols-outlined">search</span>
            <input
              v-model="searchTerm"
              type="search"
              placeholder="Buscar por nombre, color o estado"
            />
          </label>

          <p v-if="!activeOwnedTiles.length" class="empty-text">
            Sin propiedades
          </p>

          <p v-else-if="!filteredOwnedTiles.length" class="empty-text">
            Sin resultados
          </p>

          <div v-else class="property-groups">
            <section
              v-for="group in groupedOwnedTiles"
              :key="group.key"
              class="property-group"
              :style="{ '--property-accent': group.color }"
            >
              <header class="group-header">
                <span class="group-color" />
                <div>
                  <strong>{{ group.label }}</strong>
                  <span>{{ group.tiles.length }} {{ group.tiles.length === 1 ? "propiedad" : "propiedades" }}</span>
                </div>
              </header>

              <div v-if="canShowGroupActions(group)" class="group-actions">
                <button
                  class="mini-action build-action"
                  :class="{ 'disabled-btn': !canBuildGroup(group) }"
                  :disabled="!canBuildGroup(group)"
                  @click="onBuildGroup(group)"
                >
                  <span class="material-symbols-outlined">add_home</span>
                  <span>Comprar grupo ${{ groupBuildCost(group) }}</span>
                </button>
                <button
                  class="mini-action sell-action"
                  :class="{ 'disabled-btn': !canSellGroup(group) }"
                  :disabled="!canSellGroup(group)"
                  @click="onSellGroup(group)"
                >
                  <span class="material-symbols-outlined">real_estate_agent</span>
                  <span>Vender grupo +${{ groupSellRefund(group) }}</span>
                </button>
              </div>

              <div class="property-list">
                <article
                  v-for="tile in group.tiles"
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
                    <span class="property-price" v-if="tile.price !== undefined">${{ tile.price }}</span>
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
        </section>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch, type Ref } from "vue";
import { BOARD_TILES, type BoardTile, type TileGroup } from "~/config/boardTilesConfig";
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
const searchTerm = ref("");

const PROPERTY_GROUP_ORDER: TileGroup[] = [
  "brown",
  "lightBlue",
  "pink",
  "orange",
  "red",
  "yellow",
  "green",
  "darkBlue",
  "railroad",
  "utility",
];

const PROPERTY_GROUP_LABELS: Partial<Record<TileGroup, string>> = {
  brown: "Marron",
  lightBlue: "Azul claro",
  pink: "Rosa",
  orange: "Naranja",
  red: "Rojo",
  yellow: "Amarillo",
  green: "Verde",
  darkBlue: "Azul oscuro",
  railroad: "Estaciones",
  utility: "Servicios",
};

interface OwnedTileGroup {
  key: TileGroup;
  label: string;
  color: string;
  tiles: BoardTile[];
}

const activePlayerId = computed(() => store.activePlayer?.id ?? -1);
const activePlayerInitial = computed(() => {
  const name = store.activePlayer?.name?.trim();
  return name ? name.slice(0, 1).toUpperCase() : "?";
});
const managementDisabled = computed(
  () => props.isMoving || store.isDiceRolling || store.phase !== "playing",
);

const activeOwnedTiles = computed(() =>
  BOARD_TILES.filter(
    (tile) => isOwnableTile(tile) && store.propertyOwners[tile.index] === activePlayerId.value,
  ),
);

const filteredOwnedTiles = computed(() => {
  const query = normalizeText(searchTerm.value);
  if (!query) return activeOwnedTiles.value;

  return activeOwnedTiles.value.filter((tile) => {
    const searchFields = [
      tile.name,
      tile.shortName,
      tile.group,
      groupLabelFor(tile),
      developmentLabel(tile),
      tile.price?.toString(),
    ];

    return searchFields.some((field) => normalizeText(field ?? "").includes(query));
  });
});

const groupedOwnedTiles = computed(() => {
  const groups = new Map<
    TileGroup,
    OwnedTileGroup
  >();

  for (const tile of filteredOwnedTiles.value) {
    const groupKey = tile.group;
    const current =
      groups.get(groupKey) ??
      ({
        key: groupKey,
        label: groupLabelFor(tile),
        color: tile.color ?? "#94a3b8",
        tiles: [],
      } satisfies OwnedTileGroup);

    current.tiles.push(tile);
    groups.set(groupKey, current);
  }

  return [...groups.values()].sort((a, b) => {
    const aIndex = PROPERTY_GROUP_ORDER.indexOf(a.key);
    const bIndex = PROPERTY_GROUP_ORDER.indexOf(b.key);
    if (aIndex === -1 && bIndex === -1) return a.label.localeCompare(b.label);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
});

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

function groupLabelFor(tile: BoardTile) {
  return PROPERTY_GROUP_LABELS[tile.group] ?? tile.group;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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

function groupRepresentative(group: OwnedTileGroup) {
  return group.tiles.find((tile) => tile.type === "property") ?? null;
}

function canShowGroupActions(group: OwnedTileGroup) {
  return groupRepresentative(group) !== null;
}

function canBuildGroup(group: OwnedTileGroup) {
  const tile = groupRepresentative(group);
  return !!tile && !managementDisabled.value && store.canBuildPropertyGroupImprovement(tile.index, activePlayerId.value);
}

function canSellGroup(group: OwnedTileGroup) {
  const tile = groupRepresentative(group);
  return !!tile && !managementDisabled.value && store.canSellPropertyGroupImprovement(tile.index, activePlayerId.value);
}

function groupBuildCost(group: OwnedTileGroup) {
  const tile = groupRepresentative(group);
  return tile ? store.getPropertyGroupBuildCost(tile.index, activePlayerId.value) : 0;
}

function groupSellRefund(group: OwnedTileGroup) {
  const tile = groupRepresentative(group);
  return tile ? store.getPropertyGroupSellRefund(tile.index, activePlayerId.value) : 0;
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

function onBuildGroup(group: OwnedTileGroup) {
  const tile = groupRepresentative(group);
  if (!tile || !canBuildGroup(group)) return;
  store.buildPropertyGroupImprovement(tile.index, activePlayerId.value);
}

function onSellGroup(group: OwnedTileGroup) {
  const tile = groupRepresentative(group);
  if (!tile || !canSellGroup(group)) return;
  store.sellPropertyGroupImprovement(tile.index, activePlayerId.value);
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

watch(activePlayerId, () => {
  searchTerm.value = "";
});

function onExchangeClick() {
  emit("close");
  nextTick(() => emit("open-exchange"));
}

function onCameraToggle() {
  store.toggleCameraFollow();
}
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap");

.sidebar-config {
  position: absolute;
  top: 0;
  left: 0;
  width: min(380px, 92vw);
  height: 100%;
  background:
    linear-gradient(180deg, rgba(18, 24, 35, 0.98) 0%, rgba(9, 13, 22, 0.98) 100%);
  border-right: 1px solid rgba(255, 255, 255, 0.12);
  z-index: 170;
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  backdrop-filter: blur(14px);
  box-shadow: 22px 0 40px rgba(0, 0, 0, 0.36);
  font-family: "Inter", sans-serif;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 18px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-title {
  color: #f8fafc;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0;
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
  gap: 14px;
  padding: 16px;
  overflow-y: auto;
}

.player-summary {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
}

.player-avatar {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: #111827;
  background: #facc15;
  font-weight: 950;
  box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.15);
}

.player-summary-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.player-summary-copy span,
.panel-kicker,
.group-header span {
  color: rgba(255, 255, 255, 0.56);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: uppercase;
}

.player-summary-copy strong {
  color: #ffffff;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.player-cash {
  padding: 7px 9px;
  border-radius: 8px;
  color: #86efac;
  background: rgba(22, 163, 74, 0.14);
  border: 1px solid rgba(134, 239, 172, 0.2);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.sidebar-btn {
  color: white;
  border: none;
  padding: 12px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 44px;
}

.exchange-btn {
  background: #2563eb;
  box-shadow: 0 8px 16px rgba(37, 99, 235, 0.24);
}

.exchange-btn:hover:not(.disabled-btn) {
  background: #1d4ed8;
  transform: translateY(-2px);
}

.cam-btn {
  background: #475569;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.cam-btn:hover:not(.cam-active) {
  background: #334155;
  transform: translateY(-2px);
}

.cam-active {
  background: #16a34a;
  box-shadow: 0 8px 16px rgba(22, 163, 74, 0.28);
}

.property-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-title {
  display: block;
  color: #ffffff;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.15;
}

.panel-count {
  min-width: 24px;
  padding: 5px 9px;
  border-radius: 8px;
  background: rgba(74, 222, 128, 0.13);
  color: #86efac;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
}

.property-search {
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 11px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.58);
}

.property-search input {
  min-width: 0;
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #ffffff;
  font-size: 13px;
  font-weight: 400;
}

.property-search input::placeholder {
  color: rgba(255, 255, 255, 0.42);
}

.empty-text {
  margin: 0;
  padding: 14px;
  border: 1px dashed rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.52);
  font-size: 13px;
  text-align: center;
}

.property-groups {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.property-group {
  --property-accent: #4ade80;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-header {
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr);
  gap: 9px;
  align-items: center;
  padding: 0 2px;
}

.group-color {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  background: var(--property-accent);
  box-shadow: 0 0 16px color-mix(in srgb, var(--property-accent), transparent 44%);
}

.group-header div {
  min-width: 0;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.group-header strong {
  color: #f8fafc;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
}

.group-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--property-accent), transparent 74%);
  background: color-mix(in srgb, var(--property-accent), transparent 92%);
}

.property-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.property-card {
  --property-accent: #4ade80;
  padding: 10px 10px 11px;
  border-radius: 8px;
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--property-accent), transparent 88%) 0%, rgba(255, 255, 255, 0.055) 42%),
    rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(255, 255, 255, 0.11);
}

.property-card.mortgaged {
  filter: grayscale(0.35);
  background: rgba(148, 163, 184, 0.08);
}

.property-main {
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr) auto;
  gap: 9px;
  align-items: center;
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
  font-weight: 600;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.property-copy span {
  color: rgba(255, 255, 255, 0.56);
  font-size: 12px;
  font-weight: 500;
}

.property-price {
  color: #f8fafc;
  padding: 4px 7px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.property-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
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
  justify-content: center;
  gap: 8px;
  padding: 8px 10px;
  font-size: 11px;
  font-weight: 700;
  transition: all 0.16s ease;
  min-width: 0;
}

.mini-action span:last-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mini-action:hover:not(.disabled-btn) {
  transform: translateY(-1px);
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
  outline-color: #93c5fd;
  box-shadow:
    0 8px 16px rgba(37, 99, 235, 0.24),
    0 0 0 4px rgba(147, 197, 253, 0.25);
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

@media (max-width: 520px) {
  .sidebar-config {
    width: min(100vw, 380px);
  }

  .player-summary {
    grid-template-columns: 38px minmax(0, 1fr);
  }

  .player-avatar {
    width: 38px;
    height: 38px;
  }

  .player-cash {
    grid-column: 1 / -1;
    justify-self: start;
  }

  .quick-actions,
  .property-actions {
    grid-template-columns: 1fr;
  }
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
