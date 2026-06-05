<template>
  <Transition name="card">
    <div class="tile-card" @click.self="emit('close')">
      <div class="card-inner">
        <button class="close-btn" tabindex="-1" @click="emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>

        <!-- BADGE -->
        <!-- <div
          v-if="
            ownerState === 'free' &&
            (tile.type === 'property' ||
              tile.type === 'railroad' ||
              tile.type === 'utility')
          "
          class="hot-badge"
        >
          <span class="material-symbols-outlined badge-icon">trending_up</span>
          <span>HOT PROPERTY</span>
        </div> -->

        <!-- PROPERTY -->
        <template v-if="tile.type === 'property'">
          <div class="color-band" :style="{ background: groupColor }">
            <div class="band-header">
              <span class="band-label">{{ groupLabel }}</span>
            </div>
            <h2 class="band-title">{{ tile.name }}</h2>
          </div>
          <div class="card-body">
            <div class="price-section">
              <div class="price-left">
                <span class="price-micro">INVERSIÓN</span>
                <span class="price-caption">PRECIO</span>
              </div>
              <span class="price-value">${{ tile.price }}</span>
            </div>
            <div class="metrics-grid">
              <div class="metric-card">
                <span class="metric-label">ALQUILER</span>
                <span class="metric-value">${{ rentBase }}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">HIPOTECA</span>
                <span class="metric-value"
                  >${{ Math.round((tile.price ?? 0) / 2) }}</span
                >
              </div>
            </div>
            <template v-if="ownerState === 'own'">
              <div class="own-banner">
                <span class="material-symbols-outlined filled">home</span>
                <span>Es tuya</span>
              </div>
              <button ref="closeActionBtnRef" class="action-btn next-action-btn" tabindex="0" @click="emit('close')">
                <span class="material-symbols-outlined">arrow_forward</span>
                <span>Siguiente</span>
              </button>
            </template>
            <template v-else-if="ownerState === 'other'">
              <div class="penalty-banner">
                <span class="penalty-amount">−${{ rentAmount }}</span>
                <span class="penalty-label"
                  >Alquiler pagado a {{ ownerName }}</span
                >
              </div>
              <button ref="closeActionBtnRef2" class="action-btn next-action-btn" tabindex="0" @click="emit('close')">
                <span class="material-symbols-outlined">arrow_forward</span>
                <span>Siguiente</span>
              </button>
            </template>
            <template v-else>
              <div class="action-stack">
                <button
                  ref="buyBtnRef"
                  class="action-btn buy-btn"
                  :class="{ 'disabled-btn': !canAfford }"
                  :disabled="!canAfford"
                  tabindex="0"
                  @click="canAfford && emit('buy')"
                >
                  <span class="material-symbols-outlined filled">payments</span>
                  <span>{{ canAfford ? 'Comprar' : 'Sin fondos' }}</span>
                </button>
                <button ref="auctionBtnRef" class="action-btn auction-btn" tabindex="0" @click="emit('auction')">
                  <span class="material-symbols-outlined">gavel</span>
                  <span>Subastar</span>
                </button>
                <button
                  v-if="canSkipBuy"
                  ref="skipBtnRef"
                  class="action-btn skip-btn"
                  tabindex="0"
                  @click="emit('skip')"
                >
                  <span class="material-symbols-outlined">skip_next</span>
                  <span>Omitir</span>
                </button>
              </div>
            </template>
          </div>
        </template>

        <!-- RAILROAD -->
        <template v-else-if="tile.type === 'railroad'">
          <div class="color-band railroad-band">
            <div class="band-header">
              <span class="band-label">FERROCARRIL</span>
            </div>
            <h2 class="band-title">{{ tile.name }}</h2>
            <span class="band-emoji">🚂</span>
          </div>
          <div class="card-body">
            <div class="price-section">
              <div class="price-left">
                <span class="price-micro">INVERSIÓN</span>
                <span class="price-caption">PRECIO</span>
              </div>
              <span class="price-value">${{ tile.price }}</span>
            </div>
            <div class="metrics-grid">
              <div class="metric-card">
                <span class="metric-label">ALQUILER</span>
                <span class="metric-value">$25</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">HIPOTECA</span>
                <span class="metric-value"
                  >${{ Math.round((tile.price ?? 0) / 2) }}</span
                >
              </div>
</div>
             <template v-if="ownerState === 'own'">
              <div class="own-banner">
                <span class="material-symbols-outlined filled">home</span>
                <span>Es tuyo</span>
              </div>
              <button ref="closeActionBtnRef3" class="action-btn next-action-btn" tabindex="0" @click="emit('close')">
                <span class="material-symbols-outlined">arrow_forward</span>
                <span>Siguiente</span>
              </button>
            </template>
            <template v-else-if="ownerState === 'other'">
              <div class="penalty-banner">
                <span class="penalty-amount">−${{ rentAmount }}</span>
                <span class="penalty-label"
                  >Alquiler pagado a {{ ownerName }}</span
                >
              </div>
              <button ref="closeActionBtnRef4" class="action-btn next-action-btn" tabindex="0" @click="emit('close')">
                <span class="material-symbols-outlined">arrow_forward</span>
                <span>Siguiente</span>
              </button>
            </template>
            <template v-else>
              <div class="action-stack">
                <button
                  ref="buyBtnRailRef"
                  class="action-btn buy-btn"
                  :class="{ 'disabled-btn': !canAfford }"
                  :disabled="!canAfford"
                  tabindex="0"
                  @click="canAfford && emit('buy')"
                >
                  <span class="material-symbols-outlined filled">payments</span>
                  <span>{{ canAfford ? 'Comprar' : 'Sin fondos' }}</span>
                </button>
                <button ref="auctionBtnRailRef" class="action-btn auction-btn" tabindex="0" @click="emit('auction')">
                  <span class="material-symbols-outlined">gavel</span>
                  <span>Subastar</span>
                </button>
                <button
                  v-if="canSkipBuy"
                  ref="skipBtnRailRef"
                  class="action-btn skip-btn"
                  tabindex="0"
                  @click="emit('skip')"
                >
                  <span class="material-symbols-outlined">skip_next</span>
                  <span>Omitir</span>
                </button>
              </div>
            </template>
          </div>
        </template>

        <!-- UTILITY -->
        <template v-else-if="tile.type === 'utility'">
          <div class="color-band utility-band">
            <div class="band-header">
              <span class="band-label">SERVICIO</span>
            </div>
            <h2 class="band-title">{{ tile.name }}</h2>
            <span class="band-emoji">{{
              tile.name.includes("Agua") ? "💧" : "💡"
            }}</span>
          </div>
          <div class="card-body">
            <div class="price-section">
              <div class="price-left">
                <span class="price-micro">INVERSIÓN</span>
                <span class="price-caption">PRECIO</span>
              </div>
              <span class="price-value">${{ tile.price }}</span>
            </div>
            <template v-if="ownerState === 'own'">
              <div class="own-banner">
                <span class="material-symbols-outlined filled">home</span>
                <span>Es tuyo</span>
              </div>
              <button ref="closeActionBtnRef5" class="action-btn next-action-btn" tabindex="0" @click="emit('close')">
                <span class="material-symbols-outlined">arrow_forward</span>
                <span>Siguiente</span>
              </button>
            </template>
            <template v-else-if="ownerState === 'other'">
              <div class="penalty-banner">
                <span class="penalty-amount">−${{ rentAmount }}</span>
                <span class="penalty-label"
                  >Alquiler pagado a {{ ownerName }}</span
                >
              </div>
              <button ref="closeActionBtnRef6" class="action-btn next-action-btn" tabindex="0" @click="emit('close')">
                <span class="material-symbols-outlined">arrow_forward</span>
                <span>Siguiente</span>
              </button>
            </template>
            <template v-else>
              <div class="action-stack">
                <button
                  ref="buyBtnUtilRef"
                  class="action-btn buy-btn"
                  :class="{ 'disabled-btn': !canAfford }"
                  :disabled="!canAfford"
                  tabindex="0"
                  @click="canAfford && emit('buy')"
                >
                  <span class="material-symbols-outlined filled">payments</span>
                  <span>{{ canAfford ? 'Comprar' : 'Sin fondos' }}</span>
                </button>
                <button ref="auctionBtnUtilRef" class="action-btn auction-btn" tabindex="0" @click="emit('auction')">
                  <span class="material-symbols-outlined">gavel</span>
                  <span>Subastar</span>
                </button>
                <button
                  v-if="canSkipBuy"
                  ref="skipBtnUtilRef"
                  class="action-btn skip-btn"
                  tabindex="0"
                  @click="emit('skip')"
                >
                  <span class="material-symbols-outlined">skip_next</span>
                  <span>Omitir</span>
                </button>
              </div>
            </template>
          </div>
        </template>

        <!-- TAX -->
        <template v-else-if="tile.type === 'tax'">
          <div class="color-band tax-band">
            <div class="band-header">
              <span class="band-label">IMPUESTO</span>
            </div>
            <h2 class="band-title">{{ tile.name }}</h2>
            <span class="band-emoji">💸</span>
          </div>
          <div class="card-body">
            <div class="penalty-banner tax-penalty">
              <span class="penalty-amount"
                >−${{ TAX_AMOUNTS[tile.index] ?? 100 }}</span
              >
              <span class="penalty-label">Pagado al banco</span>
            </div>
            <p class="auto-deduct">Descontado automáticamente</p>
            <button ref="closeActionBtnRefTax" class="action-btn next-action-btn" tabindex="0" @click="emit('close')">
              <span class="material-symbols-outlined">arrow_forward</span>
              <span>Siguiente</span>
            </button>
          </div>
        </template>

        <!-- CARD (chance / community) -->
        <template v-else-if="tile.type === 'card'">
          <div class="color-band" :style="{ background: groupColor }">
            <div class="band-header">
              <span class="band-label">{{
                tile.group === "chance" ? "SUERTE" : "ARCA COMUNAL"
              }}</span>
            </div>
            <h2 class="band-title">{{ tile.name }}</h2>
            <span class="band-emoji">{{
              tile.group === "chance" ? "🃏" : "📦"
            }}</span>
          </div>
          <div class="card-body">
            <p class="card-hint">¡Roba una carta!</p>
            <p class="auto-deduct">Sigue las instrucciones de la carta</p>
            <button ref="closeActionBtnRefCard" class="action-btn next-action-btn" tabindex="0" @click="emit('close')">
              <span class="material-symbols-outlined">arrow_forward</span>
              <span>Siguiente</span>
            </button>
          </div>
        </template>

        <!-- CORNER -->
        <template v-else-if="tile.type === 'corner'">
          <div
            class="color-band corner-band"
            :style="{ background: CORNER_META[tile.group]?.color ?? '#333' }"
          >
            <div class="band-header">
              <span class="band-label">{{
                CORNER_META[tile.group]?.label ?? ""
              }}</span>
            </div>
            <h2 class="band-title">{{ tile.name }}</h2>
            <span class="band-emoji">{{ CORNER_META[tile.group]?.icon }}</span>
          </div>
          <div class="card-body">
            <p class="corner-msg">{{ CORNER_META[tile.group]?.msg }}</p>
            <button ref="closeActionBtnRefCorner" class="action-btn next-action-btn" tabindex="0" @click="emit('close')">
              <span class="material-symbols-outlined">arrow_forward</span>
              <span>Siguiente</span>
            </button>
          </div>
        </template>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import { BOARD_TILES, type BoardTile, type TileGroup } from "~/config/boardTilesConfig";
import { useKeyboardNavigation } from "~/composables/useKeyboardNavigation";

const props = defineProps<{
  tile: BoardTile;
  ownerId?: number;
  ownerName?: string;
  rentAmount?: number;
  activePlayerId: number;
  activePlayerCash: number;
  canSkipBuy: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "buy"): void;
  (e: "auction"): void;
  (e: "skip"): void;
}>();

const buyBtnRef = ref<HTMLElement | null>(null);
const buyBtnRailRef = ref<HTMLElement | null>(null);
const buyBtnUtilRef = ref<HTMLElement | null>(null);
const auctionBtnRef = ref<HTMLElement | null>(null);
const auctionBtnRailRef = ref<HTMLElement | null>(null);
const auctionBtnUtilRef = ref<HTMLElement | null>(null);
const skipBtnRef = ref<HTMLElement | null>(null);
const skipBtnRailRef = ref<HTMLElement | null>(null);
const skipBtnUtilRef = ref<HTMLElement | null>(null);
const closeActionBtnRef = ref<HTMLElement | null>(null);
const closeActionBtnRef2 = ref<HTMLElement | null>(null);
const closeActionBtnRef3 = ref<HTMLElement | null>(null);
const closeActionBtnRef4 = ref<HTMLElement | null>(null);
const closeActionBtnRef5 = ref<HTMLElement | null>(null);
const closeActionBtnRef6 = ref<HTMLElement | null>(null);
const closeActionBtnRefTax = ref<HTMLElement | null>(null);
const closeActionBtnRefCard = ref<HTMLElement | null>(null);
const closeActionBtnRefCorner = ref<HTMLElement | null>(null);

const ownerState = computed<"own" | "other" | "free">(() => {
  if (props.ownerId === undefined) return "free";
  if (props.ownerId === props.activePlayerId) return "own";
  return "other";
});

const canAfford = computed(() => (props.tile.price ?? 0) <= props.activePlayerCash);

const tileType = computed(() => props.tile.type);

const activeRefs = computed(() => {
  if (ownerState.value === "own" || ownerState.value === "other") {
    if (tileType.value === "property") {
      return ownerState.value === "own" ? [closeActionBtnRef] : [closeActionBtnRef2];
    }
    if (tileType.value === "railroad") {
      return ownerState.value === "own" ? [closeActionBtnRef3] : [closeActionBtnRef4];
    }
    if (tileType.value === "utility") {
      return ownerState.value === "own" ? [closeActionBtnRef5] : [closeActionBtnRef6];
    }
    return [];
  }
  if (tileType.value === "tax") return [closeActionBtnRefTax];
  if (tileType.value === "card") return [closeActionBtnRefCard];
  if (tileType.value === "corner") return [closeActionBtnRefCorner];
  if (tileType.value === "property") {
    return props.canSkipBuy
      ? [buyBtnRef, auctionBtnRef, skipBtnRef]
      : [buyBtnRef, auctionBtnRef];
  }
  if (tileType.value === "railroad") {
    return props.canSkipBuy
      ? [buyBtnRailRef, auctionBtnRailRef, skipBtnRailRef]
      : [buyBtnRailRef, auctionBtnRailRef];
  }
  if (tileType.value === "utility") {
    return props.canSkipBuy
      ? [buyBtnUtilRef, auctionBtnUtilRef, skipBtnUtilRef]
      : [buyBtnUtilRef, auctionBtnUtilRef];
  }
  return [];
});

const canAutoFocus = computed(() => true);

const { focusedIndex, focusButton, autoFocus } = useKeyboardNavigation(
  activeRefs,
  {
    direction: "vertical",
    autoFocusIndex: 0,
    autoFocusOn: canAutoFocus,
    loop: true,
  }
);

function autoFocusFirstEnabled() {
  nextTick(() => {
    const refs = activeRefs.value;
    for (const r of refs) {
      const el = r.value;
      if (el && !(el as HTMLButtonElement).disabled) {
        el.focus();
        return;
      }
    }
  });
}

onMounted(() => autoFocusFirstEnabled());

const colorByGroup = (group: TileGroup): string =>
  BOARD_TILES.find(t => t.group === group)?.color ?? "#374151";

const GROUP_COLORS: Record<TileGroup, string> = {
  brown: colorByGroup("brown"),
  lightBlue: colorByGroup("lightBlue"),
  pink: colorByGroup("pink"),
  orange: colorByGroup("orange"),
  red: colorByGroup("red"),
  yellow: colorByGroup("yellow"),
  green: colorByGroup("green"),
  darkBlue: colorByGroup("darkBlue"),
  railroad: colorByGroup("railroad"),
  utility: colorByGroup("utility"),
  tax: colorByGroup("tax"),
  chance: colorByGroup("chance"),
  community: colorByGroup("community"),
  go: colorByGroup("go"),
  jail: colorByGroup("jail"),
  parking: colorByGroup("parking"),
  gotojail: colorByGroup("gotojail"),
};

const GROUP_LABELS: Partial<Record<TileGroup, string>> = {
  brown: "MARRÓN",
  lightBlue: "AZUL CLARO",
  pink: "ROSA",
  orange: "NARANJA",
  red: "ROJO",
  yellow: "AMARILLO",
  green: "VERDE",
  darkBlue: "AZUL OSCURO",
};

const CORNER_META: Partial<
  Record<TileGroup, { icon: string; color: string; msg: string; label: string }>
> = {
  go: {
    icon: "🚀",
    color: "#b91c1c",
    msg: "¡Cada vez que pases cobras salario!",
    label: "SALIDA",
  },
  jail: {
    icon: "⛓️",
    color: "#4b5563",
    msg: "Solo estás de visita. Nada que hacer aquí.",
    label: "CÁRCEL",
  },
  parking: {
    icon: "🅿️",
    color: "#1e40af",
    msg: "Descansa aquí. No pasa nada — es gratis.",
    label: "PARKING",
  },
  gotojail: {
    icon: "🚔",
    color: "#b91c1c",
    msg: "¡Ve directamente a la cárcel! No cobres el sueldo.",
    label: "VE A LA CÁRCEL",
  },
};

const TAX_AMOUNTS: Record<number, number> = { 4: 200, 38: 100 };

const groupColor = computed(() => GROUP_COLORS[props.tile.group] ?? "#374151");
const groupLabel = computed(() => GROUP_LABELS[props.tile.group] ?? "");
const rentBase = computed(() => Math.round((props.tile.price ?? 0) * 0.1));
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;700&family=Plus+Jakarta+Sans:wght@600;700;800&family=JetBrains+Mono:wght@700&display=swap");
@import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1");

.material-symbols-outlined {
  font-variation-settings:
    "FILL" 0,
    "wght" 400,
    "GRAD" 0,
    "opsz" 24;
}

.material-symbols-outlined.filled {
  font-variation-settings:
    "FILL" 1,
    "wght" 400,
    "GRAD" 0,
    "opsz" 24;
}

.tile-card {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  pointer-events: auto;
  background: rgba(17, 19, 28, 0.5);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  perspective: 900px;
}

.card-inner {
  position: relative;
  width: 310px;
  border-radius: 2rem;
  overflow: hidden;
  background: rgba(29, 31, 41, 0.97);
  border: 1px solid rgba(74, 222, 128, 0.15);
  box-shadow:
    0 32px 64px -12px rgba(0, 0, 0, 0.6),
    inset 0 1px 0 0 rgba(255, 255, 255, 0.05);
  font-family: "Hanken Grotesk", sans-serif;
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: all 0.15s;
  padding: 0;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.5);
  color: white;
  transform: scale(1.1);
}

.hot-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  transform: rotate(12deg);
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 4px;
  background: #ffd165;
  color: #3f2e00;
  font-family: "JetBrains Mono", monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 4px 12px;
  border-radius: 9999px;
  border: 2px solid rgba(17, 19, 28, 0.9);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.badge-icon {
  font-size: 14px !important;
  font-variation-settings:
    "FILL" 1,
    "wght" 400;
}

.color-band {
  min-height: 128px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 24px 28px 20px;
  position: relative;
  transition: filter 0.2s;
}

.color-band:hover {
  filter: brightness(1.1);
}

.railroad-band {
  background: #1f2937;
}
.utility-band {
  background: #374151;
}
.tax-band {
  background: #292524;
}
.corner-band {
}

.band-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 4px;
}

.band-label {
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.65);
}

.band-title {
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 24px;
  font-weight: 800;
  line-height: 1.3;
  color: #ffffff;
  margin: 0;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  letter-spacing: -0.02em;
}

.band-emoji {
  position: absolute;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 36px;
  opacity: 0.7;
}

.card-body {
  padding: 24px 28px 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.price-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(74, 222, 128, 0.1);
}

.price-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.price-micro {
  font-family: "JetBrains Mono", monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(225, 225, 239, 0.4);
}

.price-caption {
  font-family: "JetBrains Mono", monospace;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(225, 225, 239, 0.85);
}

.price-value {
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 28px;
  font-weight: 800;
  color: #00e38f;
  line-height: 1;
  letter-spacing: -0.02em;
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.metric-card {
  background: rgba(25, 27, 36, 0.8);
  border: 1px solid rgba(74, 222, 128, 0.06);
  border-radius: 16px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-label {
  font-family: "JetBrains Mono", monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(225, 225, 239, 0.4);
}

.metric-value {
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: rgba(225, 225, 239, 0.95);
}

.own-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  background: rgba(0, 227, 143, 0.1);
  border: 1px solid rgba(0, 227, 143, 0.2);
  border-radius: 12px;
  color: #00e38f;
  font-weight: 700;
  font-size: 15px;
}

.own-banner .material-symbols-outlined {
  font-size: 20px;
  color: #00e38f;
}

.penalty-banner {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  background: rgba(248, 113, 113, 0.08);
  border: 1px solid rgba(248, 113, 113, 0.15);
  border-radius: 12px;
}

.tax-penalty {
  background: rgba(251, 191, 36, 0.08);
  border-color: rgba(251, 191, 36, 0.15);
}

.penalty-amount {
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 22px;
  font-weight: 800;
  color: #f87171;
}

.tax-penalty .penalty-amount {
  color: #fbbf24;
}

.penalty-label {
  font-size: 12px;
  color: rgba(225, 225, 239, 0.45);
}

.auto-deduct {
  font-size: 12px;
  color: rgba(225, 225, 239, 0.35);
  margin: 0;
}

.card-hint {
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: rgba(225, 225, 239, 0.85);
  margin: 0;
}

.corner-msg {
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 14px;
  color: rgba(225, 225, 239, 0.6);
  margin: 0;
  line-height: 1.6;
}

.action-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 4px;
}

.action-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 20px;
  border-radius: 16px;
  border: none;
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}

.action-btn .material-symbols-outlined {
  font-size: 20px;
}

.buy-btn {
  background: #00f59b;
  color: #003920;
  box-shadow: 0 8px 24px rgba(0, 245, 155, 0.2);
}

.buy-btn:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
  box-shadow: 0 12px 32px rgba(0, 245, 155, 0.3);
}

.buy-btn:active {
  transform: scale(0.97);
}

.auction-btn {
  background: rgba(50, 52, 62, 0.8);
  color: rgba(225, 225, 239, 0.85);
  border: 1px solid rgba(74, 222, 128, 0.12);
}

.auction-btn:hover {
  background: rgba(50, 52, 62, 1);
  color: #ffffff;
  border-color: rgba(74, 222, 128, 0.25);
}

.auction-btn .material-symbols-outlined {
  color: #d70357;
  transition: transform 0.2s;
}

.auction-btn:hover .material-symbols-outlined {
  transform: rotate(12deg);
}

.auction-btn:active {
  transform: scale(0.97);
}

.disabled-btn {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none !important;
  filter: grayscale(0.5);
}

.disabled-btn:hover {
  transform: none !important;
  filter: grayscale(0.5);
}

.skip-btn {
  background: rgba(50, 52, 62, 0.6);
  color: rgba(225, 225, 239, 0.6);
  border: 1px dashed rgba(132, 149, 136, 0.2);
}

.skip-btn:hover {
  background: rgba(50, 52, 62, 0.9);
  color: rgba(225, 225, 239, 0.85);
  border-color: rgba(132, 149, 136, 0.35);
}

.action-btn:focus-visible {
  outline: 2px solid #00e38f;
  outline-offset: 3px;
  box-shadow: 0 0 0 4px rgba(0, 227, 143, 0.25);
}

.buy-btn:focus-visible {
  outline-color: #00f59b;
  box-shadow: 0 8px 24px rgba(0, 245, 155, 0.2), 0 0 0 4px rgba(0, 245, 155, 0.25);
}

.auction-btn:focus-visible {
  outline-color: #d70357;
  box-shadow: 0 0 0 4px rgba(215, 3, 87, 0.25);
}

.skip-btn:focus-visible {
  outline-color: #849588;
  box-shadow: 0 0 0 4px rgba(132, 149, 136, 0.25);
}

.next-action-btn {
  background: #3b82f6;
  color: white;
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.25);
}

.next-action-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 12px 32px rgba(59, 130, 246, 0.35);
}

.next-action-btn:active {
  transform: scale(0.97);
}

.next-action-btn:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 3px;
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.25), 0 0 0 4px rgba(59, 130, 246, 0.2);
}

.card-enter-active {
  animation: cardSlideIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.card-leave-active {
  animation: cardFadeOut 0.22s ease-in both;
}

@keyframes cardSlideIn {
  from {
    opacity: 0;
    transform: perspective(900px) rotateY(12deg) rotateX(6deg) scale(0.88)
      translateY(30px);
  }
  50% {
    opacity: 1;
  }
  to {
    opacity: 1;
    transform: perspective(900px) rotateY(0deg) rotateX(0deg) scale(1)
      translateY(0);
  }
}

@keyframes cardFadeOut {
  from {
    opacity: 1;
    transform: perspective(900px) rotateY(0deg) rotateX(0deg) scale(1);
  }
  to {
    opacity: 0;
    transform: perspective(900px) rotateY(-6deg) rotateX(-3deg) scale(0.93)
      translateY(-14px);
  }
}
</style>
