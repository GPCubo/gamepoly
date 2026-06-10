<template>
  <div class="auction-backdrop">
    <div class="auction-modal">
      <div class="auction-header">
        <div class="header-topline">
          <span class="auction-tag">
            <span class="material-symbols-outlined">gavel</span>
            Subasta
          </span>
          <span class="auction-round">{{ activeBidders.length }} activos</span>
        </div>
        <div class="property-heading">
          <span class="property-color" :style="{ background: tile.color ?? '#64748b' }"></span>
          <div>
            <h2 class="auction-title">{{ tile.name }}</h2>
            <p class="auction-price">Precio de lista {{ formatMoney(tile.price ?? 0) }}</p>
          </div>
        </div>
      </div>

      <div class="auction-body">
        <template v-if="phase === 'bidding'">
          <div class="bid-board">
            <div class="bid-current" :class="{ 'no-bid': currentBid === 0 }">
              <span class="bid-label">Puja actual</span>
              <strong>{{ currentBid === 0 ? "--" : formatMoney(currentBid) }}</strong>
              <small>{{ leaderId === null ? "Sin lider todavia" : `Lidera ${leaderName}` }}</small>
            </div>
            <div class="bid-next">
              <span>Turno</span>
              <strong>{{ currentBidderName }}</strong>
              <small>{{ formatMoney(currentBidderCash) }} disponible</small>
            </div>
          </div>

          <div class="bid-actions">
            <button
              v-for="(inc, idx) in BID_INCREMENTS"
              :key="inc"
              :ref="(el) => bidBtnRefs[idx] = el as HTMLElement"
              class="bid-btn"
              :disabled="currentBidderIsBot || !canAfford(currentBid + inc)"
              tabindex="0"
              @click="placeBid(inc)"
            >
              <span>+{{ formatMoney(inc) }}</span>
              <small>{{ formatMoney(currentBid + inc) }}</small>
            </button>
          </div>

          <button ref="passBtnRef" class="pass-btn" tabindex="0" :disabled="currentBidderIsBot" @click="pass">
            <span class="material-symbols-outlined">not_interested</span>
            Pasar turno
          </button>

          <div class="auction-roster">
            <div class="roster-heading">
              <span>Participantes</span>
              <strong>{{ activeBidders.length }}/{{ players.length }}</strong>
            </div>
            <div class="player-list">
              <div
                v-for="player in players"
                :key="player.id"
                class="player-row"
                :class="{
                  active: player.id === currentBidderId,
                  leader: player.id === leaderId,
                  out: !activeBidders.includes(player.id),
                }"
              >
                <span class="player-avatar">{{ tokenIcon(player.tokenModel) }}</span>
                <span class="player-name">{{ player.name }}</span>
                <span class="player-meta">
                  {{ player.id === leaderId ? "Lider" : activeBidders.includes(player.id) ? formatMoney(player.cash) : "Fuera" }}
                </span>
              </div>
            </div>
          </div>
        </template>

        <div v-else-if="phase === 'sold'" class="result-panel sold">
          <span class="result-icon material-symbols-outlined">emoji_events</span>
          <span class="result-kicker">Subasta cerrada</span>
          <p class="result-msg">
            <strong>{{ leaderName }}</strong> gana <strong>{{ tile.name }}</strong>
          </p>
          <p class="result-amount">{{ formatMoney(currentBid) }}</p>
          <button ref="closeSoldBtnRef" class="result-btn" tabindex="0" @click="emitResult">
            Continuar
          </button>
        </div>

        <div v-else-if="phase === 'unsold'" class="result-panel unsold">
          <span class="result-icon material-symbols-outlined">block</span>
          <span class="result-kicker">Sin comprador</span>
          <p class="result-msg">Nadie compro <strong>{{ tile.name }}</strong>.</p>
          <p class="result-sub">La propiedad queda libre.</p>
          <button ref="closeUnsoldBtnRef" class="result-btn secondary" tabindex="0" @click="emitResult">
            Continuar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch, type Ref } from "vue";
import { GAME_CONFIG } from "~/config/gameConfig";
import type { BoardTile } from "~/config/boardTilesConfig";
import type { PlayerState } from "~/stores/gameStore";
import { useGameStore } from "~/stores/gameStore";
import { getBotAuctionBid } from "~/composables/useBotTurn";
import { useKeyboardNavigation } from "~/composables/useKeyboardNavigation";

const gameStore = useGameStore();

const props = defineProps<{
  tile: BoardTile;
  players: PlayerState[];
  startingBidderIndex: number;
}>();

const emit = defineEmits<{
  (e: "sold", winnerId: number, amount: number): void;
  (e: "unsold"): void;
}>();

const BID_INCREMENTS = [10, 50, 100];

const bidBtnRefs = ref<(HTMLElement | null)[]>([null, null, null]);
const passBtnRef = ref<HTMLElement | null>(null);
const closeSoldBtnRef = ref<HTMLElement | null>(null);
const closeUnsoldBtnRef = ref<HTMLElement | null>(null);

const activeBidders = ref<number[]>([...props.players.map((p) => p.id)]);
const currentBid = ref(0);
const leaderId = ref<number | null>(null);
const turnIdx = ref(props.startingBidderIndex % Math.max(activeBidders.value.length, 1));
const phase = ref<"bidding" | "sold" | "unsold">("bidding");

const currentBidderId = computed(() => activeBidders.value[turnIdx.value] ?? -1);

const currentBidderName = computed(
  () => props.players.find((p) => p.id === currentBidderId.value)?.name ?? "?",
);

const currentBidderCash = computed(
  () => props.players.find((p) => p.id === currentBidderId.value)?.cash ?? 0,
);

const currentBidderIsBot = computed(
  () => props.players.find((p) => p.id === currentBidderId.value)?.isBot ?? false,
);

const leaderName = computed(
  () => props.players.find((p) => p.id === leaderId.value)?.name ?? "?",
);

const biddingRefs = computed(() => {
  const refs: Ref<HTMLElement | null>[] = [];
  for (let i = 0; i < BID_INCREMENTS.length; i++) {
    refs.push(ref(bidBtnRefs.value[i]));
  }
  refs.push(passBtnRef);
  return refs;
});

const resultRefs = computed(() =>
  phase.value === "sold" ? [closeSoldBtnRef] : [closeUnsoldBtnRef],
);

const activeRefs = computed(() =>
  phase.value === "bidding" ? biddingRefs.value : resultRefs.value,
);

useKeyboardNavigation(activeRefs, {
  direction: "horizontal",
  autoFocusIndex: 0,
  loop: true,
});

function formatMoney(amount: number) {
  return `${GAME_CONFIG.CURRENCY_SYMBOL}${amount.toLocaleString()}`;
}

function tokenIcon(tokenModel: string) {
  return GAME_CONFIG.TOKEN_MODELS.find((token) => token.file === tokenModel)?.icon ?? "?";
}

function focusFirstEnabled() {
  nextTick(() => {
    if (phase.value === "bidding") {
      for (let i = 0; i < bidBtnRefs.value.length; i++) {
        const el = bidBtnRefs.value[i];
        if (el && !(el as HTMLButtonElement).disabled) {
          el.focus();
          return;
        }
      }
      passBtnRef.value?.focus();
      return;
    }
    if (phase.value === "sold") {
      closeSoldBtnRef.value?.focus();
      return;
    }
    closeUnsoldBtnRef.value?.focus();
  });
}

onMounted(() => focusFirstEnabled());
watch(phase, (newPhase) => {
  focusFirstEnabled();
  if (newPhase !== "bidding" && props.players.every((p) => p.isBot)) {
    setTimeout(() => emitResult(), 1200);
  }
});
watch(currentBidderId, () => {
  if (phase.value === "bidding") focusFirstEnabled();
});

watch(currentBidderId, () => {
  if (phase.value !== "bidding") return;
  const bidderId = currentBidderId.value;
  const bidder = props.players.find((p) => p.id === bidderId);
  if (!bidder || !bidder.isBot) return;
  const tile = props.tile;
  if (!tile || tile.price === undefined) return;
  const bidAmount = getBotAuctionBid(tile.index, currentBid.value, bidderId);
  setTimeout(() => {
    if (phase.value !== "bidding") return;
    if (bidAmount <= 0) {
      pass();
    } else {
      placeBid(bidAmount - currentBid.value);
    }
  }, 600 + Math.random() * 800);
}, { immediate: true });

function canAfford(amount: number) {
  const cash = props.players.find((p) => p.id === currentBidderId.value)?.cash ?? 0;
  return cash >= amount;
}

function advanceTurn() {
  if (activeBidders.value.length === 0) return;
  turnIdx.value = (turnIdx.value + 1) % activeBidders.value.length;
  checkEnd();
}

function checkEnd() {
  const remaining = activeBidders.value.length;
  if (remaining === 0) {
    phase.value = leaderId.value !== null ? "sold" : "unsold";
    return;
  }
  if (remaining === 1 && activeBidders.value[0] === leaderId.value) {
    phase.value = "sold";
  }
}

function placeBid(increment: number) {
  const newBid = currentBid.value + increment;
  if (!canAfford(newBid)) return;
  currentBid.value = newBid;
  leaderId.value = currentBidderId.value;
  if (activeBidders.value.length === 1) {
    phase.value = "sold";
    return;
  }
  advanceTurn();
}

function pass() {
  activeBidders.value.splice(turnIdx.value, 1);
  if (activeBidders.value.length > 0 && turnIdx.value >= activeBidders.value.length) {
    turnIdx.value = 0;
  }
  checkEnd();
}

function emitResult() {
  if (phase.value === "sold" && leaderId.value !== null) {
    emit("sold", leaderId.value, currentBid.value);
    return;
  }
  emit("unsold");
}
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@600;700&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1");

.material-symbols-outlined {
  font-variation-settings: "FILL" 0, "wght" 500, "GRAD" 0, "opsz" 24;
}

.auction-backdrop {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  background: rgba(6, 8, 14, 0.72);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  padding: 18px;
}

.auction-modal {
  width: min(520px, 100%);
  max-height: min(720px, calc(100vh - 36px));
  overflow: hidden;
  border-radius: 8px;
  background: #111827;
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.58);
  color: #eef2ff;
  font-family: "Inter", sans-serif;
}

.auction-header {
  padding: 22px 24px 18px;
  background: #0b1220;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
}

.header-topline,
.property-heading,
.roster-heading,
.player-row,
.pass-btn,
.auction-tag {
  display: flex;
  align-items: center;
}

.header-topline {
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.auction-tag {
  gap: 8px;
  color: #34d399;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.auction-tag .material-symbols-outlined {
  font-size: 18px;
}

.auction-round {
  padding: 5px 9px;
  border-radius: 999px;
  background: rgba(52, 211, 153, 0.12);
  border: 1px solid rgba(52, 211, 153, 0.22);
  color: #a7f3d0;
  font-size: 12px;
  font-weight: 700;
}

.property-heading {
  gap: 14px;
}

.property-color {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.26);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.18);
  flex: 0 0 auto;
}

.auction-title {
  margin: 0;
  color: #f8fafc;
  font-size: 24px;
  line-height: 1.12;
  font-weight: 800;
  letter-spacing: 0;
}

.auction-price {
  margin: 5px 0 0;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 600;
}

.auction-body {
  padding: 20px 24px 24px;
  max-height: calc(720px - 115px);
  overflow-y: auto;
}

.bid-board {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 10px;
  margin-bottom: 14px;
}

.bid-current,
.bid-next {
  min-height: 116px;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(15, 23, 42, 0.78);
}

.bid-current {
  border-color: rgba(52, 211, 153, 0.28);
  background: rgba(6, 78, 59, 0.22);
}

.bid-current.no-bid {
  border-color: rgba(148, 163, 184, 0.16);
  background: rgba(15, 23, 42, 0.78);
}

.bid-label,
.bid-next span,
.roster-heading span,
.result-kicker {
  display: block;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.bid-current strong {
  display: block;
  margin-top: 8px;
  color: #34d399;
  font-family: "JetBrains Mono", monospace;
  font-size: 40px;
  line-height: 1;
  letter-spacing: 0;
}

.bid-current small,
.bid-next small {
  display: block;
  margin-top: 8px;
  color: #cbd5e1;
  font-size: 13px;
  font-weight: 600;
}

.bid-next strong {
  display: block;
  margin-top: 10px;
  color: #f8fafc;
  font-size: 20px;
  line-height: 1.1;
}

.bid-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 9px;
  margin-bottom: 10px;
}

.bid-btn {
  min-height: 62px;
  padding: 10px 8px;
  border-radius: 8px;
  border: 1px solid rgba(52, 211, 153, 0.32);
  background: rgba(52, 211, 153, 0.11);
  color: #d1fae5;
  cursor: pointer;
  transition: transform 0.16s ease, background 0.16s ease, border-color 0.16s ease;
}

.bid-btn span,
.bid-btn small {
  display: block;
}

.bid-btn span {
  font-family: "JetBrains Mono", monospace;
  font-size: 16px;
  font-weight: 800;
}

.bid-btn small {
  margin-top: 4px;
  color: #86efac;
  font-size: 11px;
  font-weight: 700;
}

.bid-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  background: rgba(52, 211, 153, 0.18);
  border-color: rgba(52, 211, 153, 0.54);
}

.bid-btn:disabled {
  opacity: 0.32;
  cursor: not-allowed;
}

.pass-btn {
  width: 100%;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(248, 113, 113, 0.24);
  background: rgba(127, 29, 29, 0.18);
  color: #fecaca;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.pass-btn:hover:not(:disabled) {
  background: rgba(127, 29, 29, 0.28);
}

.pass-btn:disabled {
  opacity: 0.32;
  cursor: not-allowed;
}

.auction-roster {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
}

.roster-heading {
  justify-content: space-between;
  margin-bottom: 9px;
}

.roster-heading strong {
  color: #cbd5e1;
  font-size: 12px;
}

.player-list {
  display: grid;
  gap: 7px;
}

.player-row {
  min-height: 44px;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(15, 23, 42, 0.54);
}

.player-row.active {
  border-color: rgba(59, 130, 246, 0.45);
  background: rgba(30, 64, 175, 0.24);
}

.player-row.leader {
  border-color: rgba(52, 211, 153, 0.48);
  background: rgba(6, 78, 59, 0.24);
}

.player-row.out {
  opacity: 0.42;
}

.player-avatar {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  font-size: 16px;
}

.player-name {
  flex: 1;
  min-width: 0;
  color: #f8fafc;
  font-size: 14px;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-meta {
  color: #cbd5e1;
  font-family: "JetBrains Mono", monospace;
  font-size: 12px;
  font-weight: 700;
}

.result-panel {
  min-height: 330px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 10px;
  padding: 20px 6px 10px;
}

.result-icon {
  width: 74px;
  height: 74px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 42px;
  color: #111827;
  background: #34d399;
  font-variation-settings: "FILL" 1, "wght" 600;
}

.result-panel.unsold .result-icon {
  color: #fee2e2;
  background: #991b1b;
}

.result-msg {
  max-width: 360px;
  margin: 4px 0 0;
  color: #e5e7eb;
  font-size: 17px;
  line-height: 1.35;
}

.result-amount {
  margin: 0;
  color: #34d399;
  font-family: "JetBrains Mono", monospace;
  font-size: 34px;
  font-weight: 800;
}

.result-sub {
  margin: 0;
  color: #94a3b8;
  font-size: 14px;
  font-weight: 600;
}

.result-btn {
  min-width: 160px;
  min-height: 46px;
  margin-top: 14px;
  border-radius: 8px;
  border: 0;
  background: #10b981;
  color: #ecfdf5;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
}

.result-btn.secondary {
  background: #475569;
}

.result-btn:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.bid-btn:focus-visible,
.pass-btn:focus-visible,
.result-btn:focus-visible {
  outline: 2px solid #34d399;
  outline-offset: 3px;
  box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.22);
}

@media (max-width: 560px) {
  .auction-backdrop {
    padding: 10px;
    align-items: flex-end;
  }

  .auction-modal {
    max-height: calc(100vh - 20px);
  }

  .auction-header,
  .auction-body {
    padding-left: 16px;
    padding-right: 16px;
  }

  .bid-board {
    grid-template-columns: 1fr;
  }

  .bid-current,
  .bid-next {
    min-height: 96px;
  }

  .bid-actions {
    grid-template-columns: 1fr;
  }

  .bid-btn {
    min-height: 52px;
  }
}
</style>
