<template>
  <div class="auction-backdrop">
    <div class="auction-modal">
      <div class="auction-header">
        <span class="auction-tag">🔨 SUBASTA</span>
        <h2 class="auction-title">{{ tile.name }}</h2>
        <p class="auction-price">Precio de lista: ${{ tile.price }}</p>
      </div>

      <div class="auction-body">
        <div v-if="phase === 'bidding'">
          <div class="bid-status">
            <div class="bid-current" :class="{ 'no-bid': currentBid === 0 }">
              <span class="bid-label">Puja actual</span>
              <span class="bid-amount">{{ currentBid === 0 ? '—' : `$${currentBid}` }}</span>
              <span v-if="leaderId !== null" class="bid-leader">por {{ leaderName }}</span>
            </div>
          </div>

          <div class="bidder-turn">
            <span class="turn-label">Turno de</span>
            <span class="turn-name">{{ currentBidderName }}</span>
            <span class="turn-cash">(${{ currentBidderCash }} disponible)</span>
          </div>

          <div class="bid-actions">
            <button
              v-for="inc in BID_INCREMENTS"
              :key="inc"
              class="bid-btn"
              :disabled="!canAfford(currentBid + inc)"
              @click="placeBid(inc)"
            >
              +${{ inc }}
            </button>
            <button class="pass-btn" @click="pass()">Pasar</button>
          </div>

          <div class="remaining-players">
            <span
              v-for="pid in activeBidders"
              :key="pid"
              class="player-chip"
              :class="{ active: pid === currentBidderId }"
            >
              {{ playerName(pid) }}
            </span>
          </div>
        </div>

        <div v-else-if="phase === 'sold'" class="result-panel">
          <p class="result-icon">🏆</p>
          <p class="result-msg">
            <strong>{{ leaderName }}</strong> compró <strong>{{ tile.name }}</strong>
          </p>
          <p class="result-amount">por ${{ currentBid }}</p>
          <button class="close-btn" @click="emitResult">Cerrar</button>
        </div>

        <div v-else-if="phase === 'unsold'" class="result-panel">
          <p class="result-icon">🚫</p>
          <p class="result-msg">Nadie compró la propiedad.</p>
          <p class="result-sub">Queda libre.</p>
          <button class="close-btn" @click="emitResult">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type { BoardTile } from "~/config/boardTilesConfig";
import type { PlayerState } from "~/stores/gameStore";

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

const activeBidders = ref<number[]>([...props.players.map((p) => p.id)]);
const currentBid = ref(0);
const leaderId = ref<number | null>(null);
const turnIdx = ref(props.startingBidderIndex % activeBidders.value.length);
const phase = ref<"bidding" | "sold" | "unsold">("bidding");

const currentBidderId = computed(() => activeBidders.value[turnIdx.value] ?? -1);

const currentBidderName = computed(
  () => props.players.find((p) => p.id === currentBidderId.value)?.name ?? "?",
);

const currentBidderCash = computed(
  () => props.players.find((p) => p.id === currentBidderId.value)?.cash ?? 0,
);

const leaderName = computed(
  () => props.players.find((p) => p.id === leaderId.value)?.name ?? "?",
);

function playerName(id: number) {
  return props.players.find((p) => p.id === id)?.name ?? "?";
}

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
  } else {
    emit("unsold");
  }
}
</script>

<style scoped>
.auction-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  backdrop-filter: blur(4px);
}

.auction-modal {
  width: 340px;
  border-radius: 20px;
  background: #0d0d1a;
  border: 1px solid rgba(74, 222, 128, 0.3);
  box-shadow: 0 32px 64px rgba(0, 0, 0, 0.8);
  font-family: monospace;
  overflow: hidden;
}

.auction-header {
  background: linear-gradient(135deg, #1a1a2e, #0d1117);
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(74, 222, 128, 0.1);
}

.auction-tag {
  font-size: 10px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #f59e0b;
}

.auction-title {
  color: #f1f5f9;
  font-size: 18px;
  margin: 4px 0 2px;
  font-weight: bold;
}

.auction-price {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  margin: 0;
}

.auction-body {
  padding: 20px 24px 24px;
}

.bid-status {
  margin-bottom: 16px;
}

.bid-current {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(74, 222, 128, 0.06);
  border: 1px solid rgba(74, 222, 128, 0.15);
  border-radius: 12px;
  padding: 14px;
}

.bid-current.no-bid {
  border-color: rgba(255, 255, 255, 0.08);
}

.bid-label {
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.35);
}

.bid-amount {
  font-size: 30px;
  font-weight: bold;
  color: #4ade80;
  line-height: 1.2;
}

.bid-leader {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.bidder-turn {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 16px;
  gap: 2px;
}

.turn-label {
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.3);
}

.turn-name {
  font-size: 16px;
  font-weight: bold;
  color: #f1f5f9;
}

.turn-cash {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
}

.bid-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.bid-btn {
  flex: 1;
  padding: 10px 4px;
  border-radius: 10px;
  border: 1px solid rgba(74, 222, 128, 0.3);
  background: rgba(74, 222, 128, 0.1);
  color: #4ade80;
  font-family: monospace;
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.15s;
}

.bid-btn:hover:not(:disabled) {
  background: rgba(74, 222, 128, 0.2);
  transform: translateY(-1px);
}

.bid-btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.pass-btn {
  flex: 1;
  padding: 10px 4px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
  color: rgba(255, 255, 255, 0.4);
  font-family: monospace;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.pass-btn:hover {
  background: rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.7);
}

.remaining-players {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}

.player-chip {
  padding: 3px 10px;
  border-radius: 99px;
  font-size: 11px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.player-chip.active {
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
  border-color: rgba(74, 222, 128, 0.4);
}

.result-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 0;
}

.result-icon {
  font-size: 40px;
  margin: 0;
  line-height: 1;
}

.result-msg {
  font-size: 15px;
  color: #f1f5f9;
  text-align: center;
  margin: 0;
}

.result-amount {
  font-size: 22px;
  font-weight: bold;
  color: #4ade80;
  margin: 0;
}

.result-sub {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
}

.close-btn {
  margin-top: 12px;
  padding: 12px 32px;
  border-radius: 12px;
  border: none;
  background: #10b981;
  color: white;
  font-family: monospace;
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.15s;
}

.close-btn:hover {
  background: #059669;
  transform: translateY(-1px);
}
</style>
