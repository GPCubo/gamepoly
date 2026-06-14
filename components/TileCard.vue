<template>
  <Transition name="card">
    <div class="tile-card" @click.self="onBackdropClick">
      <div class="card-inner">
        <button
          v-if="canCloseDialog"
          class="close-btn"
          tabindex="-1"
          @click="emit('close')"
        >
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
            <h2 class="band-title">{{ displayTileName }}</h2>
          </div>
          <div class="card-body">
            <div class="price-section">
              <div class="price-left">
                <span class="price-micro">{{ t("tile.investment").toUpperCase() }}</span>
                <span class="price-caption">{{ t("tile.price").toUpperCase() }}</span>
              </div>
              <span class="price-value">${{ tile.price }}</span>
            </div>
            <div class="metrics-grid">
              <div class="metric-card">
                <span class="metric-label">{{ t("tile.rent").toUpperCase() }}</span>
                <span class="metric-value">${{ rentAmount ?? rentBase }}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">{{ t("tile.mortgage").toUpperCase() }}</span>
                <span class="metric-value"
                  >${{
                    mortgageValue ?? Math.round((tile.price ?? 0) / 2)
                  }}</span
                >
              </div>
            </div>
            <div class="development-rates">
              <div class="development-rates-top">
                <div>
                  <span class="rates-kicker">{{ t("tile.improvements").toUpperCase() }}</span>
                  <strong>{{ t("tile.housesHotel") }}</strong>
                </div>
                <div class="rates-costs">
                  <span>{{ t("tile.house") }} ${{ houseCost ?? 0 }}</span>
                  <span>{{ t("tile.hotel") }} ${{ hotelCost ?? 0 }}</span>
                </div>
              </div>
              <div class="rates-grid">
                <div
                  v-for="item in propertyRentSchedule"
                  :key="item.label"
                  class="rate-item"
                  :class="{ active: item.active }"
                >
                  <span class="rate-label">{{ item.label }}</span>
                  <span class="rate-value">${{ item.rent }}</span>
                </div>
              </div>
            </div>
            <template v-if="ownerState === 'own'">
              <div class="own-status-row">
                <div class="own-banner">
                  <span class="material-symbols-outlined filled">home</span>
                  <span>{{ t("tile.ownerMine") }}</span>
                </div>
                <div
                  class="development-panel"
                  :class="{ mortgaged: isMortgaged }"
                >
                  <span class="development-label">{{ t("tile.development").toUpperCase() }}</span>
                  <strong>{{ developmentLabel }}</strong>
                  <span v-if="isMortgaged" class="development-note"
                    >{{ t("tile.noRent") }}</span
                  >
                  <span v-else-if="canBuildHouse" class="development-note"
                    >{{ t("tile.house") }}: ${{ houseCost }}</span
                  >
                  <span v-else-if="canBuildHotel" class="development-note"
                    >{{ t("tile.hotel") }}: ${{ hotelCost }}</span
                  >
                </div>
              </div>
              <div class="action-stack management-actions">
                <button
                  v-if="!hasHotel && (houses ?? 0) < 4"
                  ref="buildHouseBtnRef"
                  class="action-btn manage-btn"
                  :class="{ 'disabled-btn': !canBuildHouse }"
                  :disabled="!canBuildHouse"
                  tabindex="0"
                  @click="canBuildHouse && emit('build-house')"
                >
                  <span class="material-symbols-outlined filled"
                    >home_work</span
                  >
                  <span>{{ t("tile.buildHouse") }} ${{ houseCost }}</span>
                </button>
                <button
                  v-if="!hasHotel && (houses ?? 0) >= 4"
                  ref="buildHotelBtnRef"
                  class="action-btn manage-btn hotel-btn"
                  :class="{ 'disabled-btn': !canBuildHotel }"
                  :disabled="!canBuildHotel"
                  tabindex="0"
                  @click="canBuildHotel && emit('build-hotel')"
                >
                  <span class="material-symbols-outlined filled"
                    >apartment</span
                  >
                  <span>{{ t("tile.buildHotel") }} ${{ hotelCost }}</span>
                </button>
                <button
                  v-if="canSellImprovement || hasHotel || (houses ?? 0) > 0"
                  ref="sellImprovementBtnRef"
                  class="action-btn manage-btn sell-btn"
                  :class="{ 'disabled-btn': !canSellImprovement }"
                  :disabled="!canSellImprovement"
                  tabindex="0"
                  @click="canSellImprovement && emit('sell-improvement')"
                >
                  <span class="material-symbols-outlined">sell</span>
                  <span>{{ improvementSellLabel }}</span>
                </button>
                <button
                  v-if="!isMortgaged"
                  ref="mortgageBtnRef"
                  class="action-btn manage-btn mortgage-btn"
                  :class="{ 'disabled-btn': !canMortgage }"
                  :disabled="!canMortgage"
                  tabindex="0"
                  @click="canMortgage && emit('mortgage')"
                >
                  <span class="material-symbols-outlined">account_balance</span>
                  <span>{{ t("tile.mortgageAction") }} +${{ mortgageValue }}</span>
                </button>
                <button
                  v-else
                  ref="unmortgageBtnRef"
                  class="action-btn manage-btn mortgage-btn"
                  :class="{ 'disabled-btn': !canUnmortgage }"
                  :disabled="!canUnmortgage"
                  tabindex="0"
                  @click="canUnmortgage && emit('unmortgage')"
                >
                  <span class="material-symbols-outlined">paid</span>
                  <span>{{ t("tile.unmortgageAction") }} ${{ unmortgageCost }}</span>
                </button>
              </div>
              <button
                ref="closeActionBtnRef"
                class="action-btn next-action-btn"
                tabindex="0"
                @click="emit('close')"
              >
                <span class="material-symbols-outlined">arrow_forward</span>
                <span>{{ t("common.next") }}</span>
              </button>
            </template>
            <template v-else-if="ownerState === 'other'">
              <div v-if="isMortgaged" class="mortgage-banner">
                <span class="material-symbols-outlined">account_balance</span>
                <span>{{ t("tile.mortgagedNoRent") }}</span>
              </div>
              <div v-else class="penalty-banner">
                <span class="penalty-amount">−${{ rentAmount }}</span>
                <span class="penalty-label"
                  >{{ t("tile.rentPaidTo", { owner: ownerName ?? "" }) }}</span
                >
              </div>
              <button
                ref="closeActionBtnRef2"
                class="action-btn next-action-btn"
                tabindex="0"
                @click="emit('close')"
              >
                <span class="material-symbols-outlined">arrow_forward</span>
                <span>{{ t("common.next") }}</span>
              </button>
            </template>
            <template v-else>
              <div class="action-stack">
                <button
                  v-if="!auctionOnly"
                  ref="buyBtnRef"
                  class="action-btn buy-btn"
                  :class="{ 'disabled-btn': !canAfford }"
                  :disabled="!canAfford"
                  tabindex="0"
                  @click="canAfford && emit('buy')"
                >
                  <span class="material-symbols-outlined filled">payments</span>
                  <span>{{ canAfford ? t("tile.buy") : t("tile.noFunds") }}</span>
                </button>
                <button
                  ref="auctionBtnRef"
                  class="action-btn auction-btn"
                  tabindex="0"
                  @click="emit('auction')"
                >
                  <span class="material-symbols-outlined">gavel</span>
                  <span>{{ t("tile.auction") }}</span>
                </button>
                <button
                  v-if="canSkipBuy && !auctionOnly"
                  ref="skipBtnRef"
                  class="action-btn skip-btn"
                  tabindex="0"
                  @click="emit('skip')"
                >
                  <span class="material-symbols-outlined">skip_next</span>
                  <span>{{ t("tile.skip") }}</span>
                </button>
              </div>
            </template>
          </div>
        </template>

        <!-- RAILROAD -->
        <template v-else-if="tile.type === 'railroad'">
          <div class="color-band railroad-band">
            <div class="band-header">
              <span class="band-label">{{ t("tile.railroad").toUpperCase() }}</span>
            </div>
            <h2 class="band-title">{{ displayTileName }}</h2>
            <span class="band-emoji">🚂</span>
          </div>
          <div class="card-body">
            <div class="price-section">
              <div class="price-left">
                <span class="price-micro">{{ t("tile.investment").toUpperCase() }}</span>
                <span class="price-caption">{{ t("tile.price").toUpperCase() }}</span>
              </div>
              <span class="price-value">${{ tile.price }}</span>
            </div>
            <div class="metrics-grid">
              <div class="metric-card">
                <span class="metric-label">{{ t("tile.rent").toUpperCase() }}</span>
                <span class="metric-value">${{ rentAmount ?? 25 }}</span>
                <small class="metric-note">1:$25 2:$50 3:$100 4:$200</small>
              </div>
              <div class="metric-card">
                <span class="metric-label">{{ t("tile.mortgage").toUpperCase() }}</span>
                <span class="metric-value"
                  >${{
                    mortgageValue ?? Math.round((tile.price ?? 0) / 2)
                  }}</span
                >
              </div>
            </div>
            <template v-if="ownerState === 'own'">
              <div class="own-banner">
                <span class="material-symbols-outlined filled">home</span>
                <span>{{ t("tile.ownerMineMasculine") }}</span>
              </div>
              <div
                class="development-panel"
                :class="{ mortgaged: isMortgaged }"
              >
                <span class="development-label">{{ t("tile.state").toUpperCase() }}</span>
                <strong>{{ developmentLabel }}</strong>
                <span v-if="isMortgaged" class="development-note"
                  >{{ t("tile.noRent") }}</span
                >
              </div>
              <div class="action-stack management-actions">
                <button
                  v-if="!isMortgaged"
                  ref="mortgageBtnRef"
                  class="action-btn manage-btn mortgage-btn"
                  :class="{ 'disabled-btn': !canMortgage }"
                  :disabled="!canMortgage"
                  tabindex="0"
                  @click="canMortgage && emit('mortgage')"
                >
                  <span class="material-symbols-outlined">account_balance</span>
                  <span>{{ t("tile.mortgageAction") }} +${{ mortgageValue }}</span>
                </button>
                <button
                  v-else
                  ref="unmortgageBtnRef"
                  class="action-btn manage-btn mortgage-btn"
                  :class="{ 'disabled-btn': !canUnmortgage }"
                  :disabled="!canUnmortgage"
                  tabindex="0"
                  @click="canUnmortgage && emit('unmortgage')"
                >
                  <span class="material-symbols-outlined">paid</span>
                  <span>{{ t("tile.unmortgageAction") }} ${{ unmortgageCost }}</span>
                </button>
              </div>
              <button
                ref="closeActionBtnRef3"
                class="action-btn next-action-btn"
                tabindex="0"
                @click="emit('close')"
              >
                <span class="material-symbols-outlined">arrow_forward</span>
                <span>{{ t("common.next") }}</span>
              </button>
            </template>
            <template v-else-if="ownerState === 'other'">
              <div v-if="isMortgaged" class="mortgage-banner">
                <span class="material-symbols-outlined">account_balance</span>
                <span>{{ t("tile.mortgagedNoRent") }}</span>
              </div>
              <div v-else class="penalty-banner">
                <span class="penalty-amount">−${{ rentAmount }}</span>
                <span class="penalty-label"
                  >{{ t("tile.rentPaidTo", { owner: ownerName ?? "" }) }}</span
                >
              </div>
              <button
                ref="closeActionBtnRef4"
                class="action-btn next-action-btn"
                tabindex="0"
                @click="emit('close')"
              >
                <span class="material-symbols-outlined">arrow_forward</span>
                <span>{{ t("common.next") }}</span>
              </button>
            </template>
            <template v-else>
              <div class="action-stack">
                <button
                  v-if="!auctionOnly"
                  ref="buyBtnRailRef"
                  class="action-btn buy-btn"
                  :class="{ 'disabled-btn': !canAfford }"
                  :disabled="!canAfford"
                  tabindex="0"
                  @click="canAfford && emit('buy')"
                >
                  <span class="material-symbols-outlined filled">payments</span>
                  <span>{{ canAfford ? t("tile.buy") : t("tile.noFunds") }}</span>
                </button>
                <button
                  ref="auctionBtnRailRef"
                  class="action-btn auction-btn"
                  tabindex="0"
                  @click="emit('auction')"
                >
                  <span class="material-symbols-outlined">gavel</span>
                  <span>{{ t("tile.auction") }}</span>
                </button>
                <button
                  v-if="canSkipBuy && !auctionOnly"
                  ref="skipBtnRailRef"
                  class="action-btn skip-btn"
                  tabindex="0"
                  @click="emit('skip')"
                >
                  <span class="material-symbols-outlined">skip_next</span>
                  <span>{{ t("tile.skip") }}</span>
                </button>
              </div>
            </template>
          </div>
        </template>

        <!-- UTILITY -->
        <template v-else-if="tile.type === 'utility'">
          <div class="color-band utility-band">
            <div class="band-header">
              <span class="band-label">{{ t("tile.utility").toUpperCase() }}</span>
            </div>
            <h2 class="band-title">{{ displayTileName }}</h2>
            <span class="band-emoji">{{
              tile.name.includes("Agua") ? "💧" : "💡"
            }}</span>
          </div>
          <div class="card-body">
            <div class="price-section">
              <div class="price-left">
                <span class="price-micro">{{ t("tile.investment").toUpperCase() }}</span>
                <span class="price-caption">{{ t("tile.price").toUpperCase() }}</span>
              </div>
              <span class="price-value">${{ tile.price }}</span>
            </div>
            <div class="metrics-grid">
              <div class="metric-card">
                <span class="metric-label">{{ t("tile.rent").toUpperCase() }}</span>
                <span class="metric-value">${{ rentAmount ?? 0 }}</span>
                <small class="metric-note">1 servicio: dados | 2: dados x8</small>
              </div>
              <div class="metric-card">
                <span class="metric-label">{{ t("tile.mortgage").toUpperCase() }}</span>
                <span class="metric-value"
                  >${{
                    mortgageValue ?? Math.round((tile.price ?? 0) / 2)
                  }}</span
                >
              </div>
            </div>
            <template v-if="ownerState === 'own'">
              <div class="own-banner">
                <span class="material-symbols-outlined filled">home</span>
                <span>{{ t("tile.ownerMineMasculine") }}</span>
              </div>
              <div
                class="development-panel"
                :class="{ mortgaged: isMortgaged }"
              >
                <span class="development-label">{{ t("tile.state").toUpperCase() }}</span>
                <strong>{{ developmentLabel }}</strong>
                <span v-if="isMortgaged" class="development-note"
                  >{{ t("tile.noRent") }}</span
                >
              </div>
              <div class="action-stack management-actions">
                <button
                  v-if="!isMortgaged"
                  ref="mortgageBtnRef"
                  class="action-btn manage-btn mortgage-btn"
                  :class="{ 'disabled-btn': !canMortgage }"
                  :disabled="!canMortgage"
                  tabindex="0"
                  @click="canMortgage && emit('mortgage')"
                >
                  <span class="material-symbols-outlined">account_balance</span>
                  <span>{{ t("tile.mortgageAction") }} +${{ mortgageValue }}</span>
                </button>
                <button
                  v-else
                  ref="unmortgageBtnRef"
                  class="action-btn manage-btn mortgage-btn"
                  :class="{ 'disabled-btn': !canUnmortgage }"
                  :disabled="!canUnmortgage"
                  tabindex="0"
                  @click="canUnmortgage && emit('unmortgage')"
                >
                  <span class="material-symbols-outlined">paid</span>
                  <span>{{ t("tile.unmortgageAction") }} ${{ unmortgageCost }}</span>
                </button>
              </div>
              <button
                ref="closeActionBtnRef5"
                class="action-btn next-action-btn"
                tabindex="0"
                @click="emit('close')"
              >
                <span class="material-symbols-outlined">arrow_forward</span>
                <span>{{ t("common.next") }}</span>
              </button>
            </template>
            <template v-else-if="ownerState === 'other'">
              <div v-if="isMortgaged" class="mortgage-banner">
                <span class="material-symbols-outlined">account_balance</span>
                <span>{{ t("tile.mortgagedNoRent") }}</span>
              </div>
              <div v-else class="penalty-banner">
                <span class="penalty-amount">−${{ rentAmount }}</span>
                <span class="penalty-label"
                  >{{ t("tile.rentPaidTo", { owner: ownerName ?? "" }) }}</span
                >
              </div>
              <button
                ref="closeActionBtnRef6"
                class="action-btn next-action-btn"
                tabindex="0"
                @click="emit('close')"
              >
                <span class="material-symbols-outlined">arrow_forward</span>
                <span>{{ t("common.next") }}</span>
              </button>
            </template>
            <template v-else>
              <div class="action-stack">
                <button
                  v-if="!auctionOnly"
                  ref="buyBtnUtilRef"
                  class="action-btn buy-btn"
                  :class="{ 'disabled-btn': !canAfford }"
                  :disabled="!canAfford"
                  tabindex="0"
                  @click="canAfford && emit('buy')"
                >
                  <span class="material-symbols-outlined filled">payments</span>
                  <span>{{ canAfford ? t("tile.buy") : t("tile.noFunds") }}</span>
                </button>
                <button
                  ref="auctionBtnUtilRef"
                  class="action-btn auction-btn"
                  tabindex="0"
                  @click="emit('auction')"
                >
                  <span class="material-symbols-outlined">gavel</span>
                  <span>{{ t("tile.auction") }}</span>
                </button>
                <button
                  v-if="canSkipBuy && !auctionOnly"
                  ref="skipBtnUtilRef"
                  class="action-btn skip-btn"
                  tabindex="0"
                  @click="emit('skip')"
                >
                  <span class="material-symbols-outlined">skip_next</span>
                  <span>{{ t("tile.skip") }}</span>
                </button>
              </div>
            </template>
          </div>
        </template>

        <!-- TAX -->
        <template v-else-if="tile.type === 'tax'">
          <div class="color-band tax-band">
            <div class="band-header">
              <span class="band-label">{{ t("tile.tax").toUpperCase() }}</span>
            </div>
            <h2 class="band-title">{{ displayTileName }}</h2>
            <span class="band-emoji">💸</span>
          </div>
          <div class="card-body">
            <div class="penalty-banner tax-penalty">
              <span class="penalty-amount"
                >−${{ TAX_AMOUNTS[tile.index] ?? 100 }}</span
              >
              <span class="penalty-label">{{ t("tile.tax") }}</span>
            </div>
            <p class="auto-deduct">{{ t("common.done") }}</p>
            <button
              ref="closeActionBtnRefTax"
              class="action-btn next-action-btn"
              tabindex="0"
              @click="emit('close')"
            >
              <span class="material-symbols-outlined">arrow_forward</span>
              <span>{{ t("common.next") }}</span>
            </button>
          </div>
        </template>

        <!-- CARD (chance / community) -->
        <template v-else-if="tile.type === 'card'">
          <div class="color-band" :style="{ background: groupColor }">
            <div class="band-header">
              <span class="band-label">{{
                tile.group === "chance" ? t("tile.7.name").toUpperCase() : t("tile.2.name").toUpperCase()
              }}</span>
            </div>
            <h2 class="band-title">{{ displayTileName }}</h2>
            <span class="band-emoji">{{
              tile.group === "chance" ? "🃏" : "📦"
            }}</span>
          </div>
          <div class="card-body">
            <p class="card-hint">{{ t("tile.card") }}</p>
            <p class="auto-deduct">{{ t("tile.card") }}</p>
            <button
              ref="closeActionBtnRefCard"
              class="action-btn next-action-btn"
              tabindex="0"
              @click="emit('close')"
            >
              <span class="material-symbols-outlined">arrow_forward</span>
              <span>{{ t("common.next") }}</span>
            </button>
          </div>
        </template>

        <!-- CORNER -->
        <template v-else-if="tile.type === 'corner'">
          <div
            class="color-band corner-band"
            :style="{ background: cornerMeta?.color ?? '#333' }"
          >
            <div class="band-header">
              <span class="band-label">{{
                cornerMeta?.label ?? ""
              }}</span>
            </div>
            <h2 class="band-title">{{ displayTileName }}</h2>
            <span class="band-emoji">{{ cornerMeta?.icon }}</span>
          </div>
          <div class="card-body">
            <p class="corner-msg">{{ cornerMeta?.msg }}</p>
            <button
              ref="closeActionBtnRefCorner"
              class="action-btn next-action-btn"
              tabindex="0"
              @click="emit('close')"
            >
              <span class="material-symbols-outlined">arrow_forward</span>
              <span>{{ t("common.next") }}</span>
            </button>
          </div>
        </template>
        <div
          v-if="
            ownerColor &&
            (tile.type === 'property' ||
              tile.type === 'railroad' ||
              tile.type === 'utility')
          "
          class="currency-badge"
          :style="{ background: ownerColor }"
        >
          {{ CURRENCY_SYMBOL }}
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import {
  BOARD_TILES,
  type BoardTile,
  type TileGroup,
} from "~/config/boardTilesConfig";
import { GAME_CONFIG } from "~/config/gameConfig";
import {
  rentBaseForPrice,
  rentForDevelopment,
} from "~/config/economyConfig";
import { useKeyboardNavigation } from "~/composables/useKeyboardNavigation";
import { useI18n } from "~/composables/useI18n";

const CURRENCY_SYMBOL = GAME_CONFIG.CURRENCY_SYMBOL;
const { t, tileName, tileShortName } = useI18n();

const props = defineProps<{
  tile: BoardTile;
  ownerId?: number | string;
  ownerName?: string;
  ownerColor?: string;
  rentAmount?: number;
  activePlayerId: number | string;
  activePlayerCash: number;
  canSkipBuy: boolean;
  auctionOnly: boolean;
  houses?: number;
  hasHotel?: boolean;
  isMortgaged?: boolean;
  canBuildHouse?: boolean;
  canBuildHotel?: boolean;
  canSellImprovement?: boolean;
  canMortgage?: boolean;
  canUnmortgage?: boolean;
  houseCost?: number;
  hotelCost?: number;
  mortgageValue?: number;
  unmortgageCost?: number;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "buy"): void;
  (e: "auction"): void;
  (e: "skip"): void;
  (e: "build-house"): void;
  (e: "build-hotel"): void;
  (e: "sell-improvement"): void;
  (e: "mortgage"): void;
  (e: "unmortgage"): void;
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
const buildHouseBtnRef = ref<HTMLElement | null>(null);
const buildHotelBtnRef = ref<HTMLElement | null>(null);
const sellImprovementBtnRef = ref<HTMLElement | null>(null);
const mortgageBtnRef = ref<HTMLElement | null>(null);
const unmortgageBtnRef = ref<HTMLElement | null>(null);

const ownerState = computed<"own" | "other" | "free">(() => {
  if (props.ownerId === undefined) return "free";
  if (props.ownerId === props.activePlayerId) return "own";
  return "other";
});

const isFreeOwnableTile = computed(
  () =>
    ownerState.value === "free" &&
    ["property", "railroad", "utility"].includes(props.tile.type),
);

const canCloseDialog = computed(
  () => !isFreeOwnableTile.value || (props.canSkipBuy && !props.auctionOnly),
);

const canAfford = computed(
  () => (props.tile.price ?? 0) <= props.activePlayerCash,
);

function onBackdropClick() {
  if (!canCloseDialog.value) return;
  emit("close");
}

const tileType = computed(() => props.tile.type);

const activeRefs = computed(() => {
  if (ownerState.value === "own" || ownerState.value === "other") {
    if (tileType.value === "property") {
      return ownerState.value === "own"
        ? [
            closeActionBtnRef,
            buildHouseBtnRef,
            buildHotelBtnRef,
            sellImprovementBtnRef,
            mortgageBtnRef,
            unmortgageBtnRef,
          ]
        : [closeActionBtnRef2];
    }
    if (tileType.value === "railroad") {
      return ownerState.value === "own"
        ? [closeActionBtnRef3, mortgageBtnRef, unmortgageBtnRef]
        : [closeActionBtnRef4];
    }
    if (tileType.value === "utility") {
      return ownerState.value === "own"
        ? [closeActionBtnRef5, mortgageBtnRef, unmortgageBtnRef]
        : [closeActionBtnRef6];
    }
    return [];
  }
  if (tileType.value === "tax") return [closeActionBtnRefTax];
  if (tileType.value === "card") return [closeActionBtnRefCard];
  if (tileType.value === "corner") return [closeActionBtnRefCorner];
  if (tileType.value === "property") {
    if (props.auctionOnly) return [auctionBtnRef];
    return props.canSkipBuy
      ? [buyBtnRef, auctionBtnRef, skipBtnRef]
      : [buyBtnRef, auctionBtnRef];
  }
  if (tileType.value === "railroad") {
    if (props.auctionOnly) return [auctionBtnRailRef];
    return props.canSkipBuy
      ? [buyBtnRailRef, auctionBtnRailRef, skipBtnRailRef]
      : [buyBtnRailRef, auctionBtnRailRef];
  }
  if (tileType.value === "utility") {
    if (props.auctionOnly) return [auctionBtnUtilRef];
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
  },
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
  BOARD_TILES.find((t) => t.group === group)?.color ?? "#374151";

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
  brown: "group.brown",
  lightBlue: "group.lightBlue",
  pink: "group.pink",
  orange: "group.orange",
  red: "group.red",
  yellow: "group.yellow",
  green: "group.green",
  darkBlue: "group.darkBlue",
};

const CORNER_META: Partial<
  Record<TileGroup, { icon: string; color: string; msgKey: string; labelKey: string }>
> = {
  go: { icon: "GO", color: "#b91c1c", msgKey: "tile.visit", labelKey: "tile.0.name" },
  jail: { icon: "J", color: "#4b5563", msgKey: "tile.visit", labelKey: "tile.10.name" },
  parking: { icon: "P", color: "#1e40af", msgKey: "tile.visit", labelKey: "tile.20.name" },
  gotojail: { icon: "!", color: "#b91c1c", msgKey: "tile.visit", labelKey: "tile.30.name" },
};
const TAX_AMOUNTS: Record<number, number> = { 4: 200, 38: 100 };

const groupColor = computed(() => GROUP_COLORS[props.tile.group] ?? "#374151");
const groupLabel = computed(() => {
  const key = GROUP_LABELS[props.tile.group];
  return key ? t(key as any).toUpperCase() : "";
});
const displayTileName = computed(() =>
  props.tile.shortName
    ? tileShortName(props.tile.index, props.tile.shortName)
    : tileName(props.tile.index, props.tile.name),
);
const cornerMeta = computed(() => {
  const meta = CORNER_META[props.tile.group];
  if (!meta) return null;
  return {
    icon: meta.icon,
    color: meta.color,
    label: t(meta.labelKey as any).toUpperCase(),
    msg: t(meta.msgKey as any),
  };
});
const rentBase = computed(() => rentBaseForPrice(props.tile.price ?? 0));
const propertyRentSchedule = computed(() => {
  const price = props.tile.price ?? 0;
  const houses = props.houses ?? 0;

  return [
    {
      label: `1 ${t("tile.house").toLowerCase()}`,
      rent: rentForDevelopment(price, 1, false),
      active: !props.hasHotel && houses === 1,
    },
    {
      label: `2 ${t("tile.house").toLowerCase()}s`,
      rent: rentForDevelopment(price, 2, false),
      active: !props.hasHotel && houses === 2,
    },
    {
      label: `3 ${t("tile.house").toLowerCase()}s`,
      rent: rentForDevelopment(price, 3, false),
      active: !props.hasHotel && houses === 3,
    },
    {
      label: `4 ${t("tile.house").toLowerCase()}s`,
      rent: rentForDevelopment(price, 4, false),
      active: !props.hasHotel && houses === 4,
    },
    {
      label: t("tile.hotel"),
      rent: rentForDevelopment(price, 0, true),
      active: Boolean(props.hasHotel),
    },
  ];
});
const developmentLabel = computed(() => {
  if (props.isMortgaged) return t("tile.mortgaged");
  if (props.hasHotel) return t("tile.hotel");
  const houses = props.houses ?? 0;
  if (houses === 0) return t("tile.noImprovements");
  const house = t("tile.house").toLowerCase();
  return `${houses} ${houses === 1 ? house : `${house}s`}`;
});
const improvementSellLabel = computed(() =>
  props.hasHotel ? t("tile.sellHotel") : t("tile.sellHouse"),
);
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
  width: clamp(320px, 80vw, 600px);
  max-height: min(92vh, 760px);
  border-radius: 2rem;
  overflow-y: auto;
  overflow-x: hidden;
  background: rgba(29, 31, 41, 0.97);
  border: 1px solid rgba(74, 222, 128, 0.15);
  box-shadow:
    0 32px 64px -12px rgba(0, 0, 0, 0.6),
    inset 0 1px 0 0 rgba(255, 255, 255, 0.05);
  font-family: "Hanken Grotesk", sans-serif;
}

.card-inner::-webkit-scrollbar {
  width: 0;
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
  min-height: 92px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 16px 26px 14px;
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
  font-size: 21px;
  font-weight: 800;
  line-height: 1.25;
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
  padding: 16px 26px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.price-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding-bottom: 10px;
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
  font-size: 25px;
  font-weight: 800;
  color: #00e38f;
  line-height: 1;
  letter-spacing: -0.02em;
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.metric-card {
  background: rgba(25, 27, 36, 0.8);
  border: 1px solid rgba(74, 222, 128, 0.06);
  border-radius: 14px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 3px;
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
  font-size: 17px;
  font-weight: 700;
  color: rgba(225, 225, 239, 0.95);
}

.metric-note {
  color: rgba(225, 225, 239, 0.5);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.25;
}

.development-rates {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 11px;
  background: rgba(15, 17, 25, 0.78);
  border: 1px solid rgba(148, 163, 184, 0.13);
  border-radius: 14px;
}

.development-rates-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.development-rates-top > div:first-child {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rates-kicker {
  font-family: "JetBrains Mono", monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: rgba(225, 225, 239, 0.42);
}

.development-rates strong {
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 15px;
  color: rgba(225, 225, 239, 0.94);
}

.rates-costs {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-end;
  flex: 0 0 auto;
}

.rates-costs span {
  font-family: "JetBrains Mono", monospace;
  font-size: 10px;
  font-weight: 700;
  color: rgba(0, 227, 143, 0.9);
}

.rates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(52px, 1fr));
  gap: 6px;
}

.rate-item {
  min-height: 34px;
  padding: 6px 5px;
  border-radius: 9px;
  background: rgba(50, 52, 62, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.055);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  gap: 1px;
}

.rate-item.active {
  background: rgba(0, 227, 143, 0.12);
  border-color: rgba(0, 227, 143, 0.32);
}

.rate-label {
  font-family: "JetBrains Mono", monospace;
  font-size: 9px;
  font-weight: 700;
  color: rgba(225, 225, 239, 0.46);
}

.rate-value {
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 13px;
  font-weight: 800;
  color: rgba(225, 225, 239, 0.94);
}

.rate-item.active .rate-label,
.rate-item.active .rate-value {
  color: #00e38f;
}

.own-status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.own-status-row > * {
  flex: 1 1 170px;
  margin: 0;
}

.own-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(0, 227, 143, 0.1);
  border: 1px solid rgba(0, 227, 143, 0.2);
  border-radius: 12px;
  color: #00e38f;
  font-weight: 700;
  font-size: 14px;
}

.own-banner .material-symbols-outlined {
  font-size: 20px;
  color: #00e38f;
}

.development-panel {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 9px 12px;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.16);
  border-radius: 12px;
}

.development-panel.mortgaged {
  background: rgba(251, 191, 36, 0.08);
  border-color: rgba(251, 191, 36, 0.18);
}

.development-label {
  font-family: "JetBrains Mono", monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: rgba(225, 225, 239, 0.42);
}

.development-panel strong {
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 16px;
  color: rgba(225, 225, 239, 0.96);
}

.development-note {
  font-size: 12px;
  color: rgba(225, 225, 239, 0.52);
}

.management-actions {
  gap: 8px;
  padding-top: 0;
}

.manage-btn {
  min-height: 38px;
  padding: 8px 13px;
  border-radius: 12px;
  font-size: 12.5px;
  background: rgba(50, 52, 62, 0.82);
  color: rgba(225, 225, 239, 0.88);
  border: 1px solid rgba(74, 222, 128, 0.1);
}

.manage-btn:hover:not(:disabled) {
  background: rgba(64, 68, 82, 0.95);
  transform: translateY(-1px);
}

.hotel-btn {
  background: rgba(239, 68, 68, 0.16);
  border-color: rgba(239, 68, 68, 0.28);
}

.sell-btn {
  background: rgba(251, 191, 36, 0.12);
  border-color: rgba(251, 191, 36, 0.22);
}

.mortgage-btn {
  background: rgba(148, 163, 184, 0.12);
  border-color: rgba(148, 163, 184, 0.2);
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

.mortgage-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.16);
  border-radius: 12px;
  color: #fbbf24;
  font-size: 13px;
  font-weight: 700;
}

.mortgage-banner .material-symbols-outlined {
  font-size: 20px;
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
  gap: 8px;
  padding-top: 2px;
}

.action-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 18px;
  border-radius: 14px;
  border: none;
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 15px;
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
  box-shadow:
    0 8px 24px rgba(0, 245, 155, 0.2),
    0 0 0 4px rgba(0, 245, 155, 0.25);
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
  box-shadow:
    0 8px 24px rgba(59, 130, 246, 0.25),
    0 0 0 4px rgba(59, 130, 246, 0.2);
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

/* Pantallas bajas: apretar el contenido para evitar scroll en la tarjeta */
@media (max-height: 760px) {
  .card-inner {
    max-height: 96vh;
  }
  .color-band {
    min-height: 72px;
    padding: 12px 24px 10px;
  }
  .band-title {
    font-size: 19px;
  }
  .card-body {
    padding: 12px 24px 16px;
    gap: 9px;
  }
  .price-section {
    padding-bottom: 8px;
  }
  .price-value {
    font-size: 22px;
  }
  .metric-card {
    padding: 8px 11px;
  }
  .development-rates {
    gap: 7px;
    padding: 9px;
  }
  .own-banner,
  .development-panel {
    padding: 8px 12px;
  }
  .manage-btn {
    min-height: 34px;
  }
  .action-btn {
    padding: 10px 16px;
  }
}

.currency-badge {
  position: absolute;
  bottom: 12px;
  right: 12px;
  min-width: 28px;
  height: 28px;
  padding: 0 8px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 14px;
  font-weight: 800;
  color: #1a1a2e;
  z-index: 5;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
</style>

