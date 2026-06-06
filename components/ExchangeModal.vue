<template>
  <div class="exchange-backdrop" @click.self="emit('cancel')">
    <div class="exchange-modal">
      <button class="close-btn" tabindex="-1" @click="emit('cancel')">
        <span class="material-symbols-outlined">close</span>
      </button>

      <template v-if="phase === 'select'">
        <div class="exchange-header">
          <span class="exchange-tag">🔄 INTERCAMBIO</span>
          <h2 class="exchange-title">Elegir jugador</h2>
          <p class="exchange-subtitle">¿Con quién quieres intercambiar?</p>
        </div>
        <div class="exchange-body">
          <div class="player-select-list">
            <button
              v-for="p in targetPlayers"
              :key="p.id"
              ref="playerBtnRefs"
              class="player-select-btn"
              :class="{ 'player-select-active': selectedTargetId === p.id }"
              tabindex="0"
              @click="selectedTargetId = p.id"
            >
              <span class="player-select-icon">{{ tokenIcon(p.tokenModel) }}</span>
              <span class="player-select-name">{{ p.name }}</span>
              <span class="player-select-cash">${{ p.cash.toLocaleString() }}</span>
            </button>
          </div>
          <button
            ref="selectConfirmRef"
            class="action-btn confirm-btn"
            :disabled="selectedTargetId === null"
            tabindex="0"
            @click="onSelectTarget"
          >
            Continuar
          </button>
        </div>
      </template>

      <template v-if="phase === 'propose'">
        <div class="exchange-header">
          <span class="exchange-tag">🔄 INTERCAMBIO</span>
          <h2 class="exchange-title">Proponer intercambio</h2>
          <p class="exchange-subtitle">Con {{ targetPlayer?.name }}</p>
        </div>
        <div class="exchange-body">
          <div class="exchange-columns">
            <div class="exchange-column">
              <h3 class="column-title">Tú ofreces</h3>
              <div class="property-list">
                <label
                  v-for="prop in myProperties"
                  :key="prop.index"
                  class="property-item"
                >
                  <input
                    type="checkbox"
                    :value="prop.index"
                    :checked="offerProperties.includes(prop.index)"
                    @change="toggleOfferProperty(prop.index)"
                  />
                  <span class="property-color" :style="{ background: prop.color ?? '#4b5563' }"></span>
                  <span class="property-name">{{ prop.name }}</span>
                </label>
                <p v-if="myProperties.length === 0" class="empty-msg">Sin propiedades</p>
              </div>
              <div class="money-input-row">
                <label class="money-label">Dinero:</label>
                <input
                  ref="offerMoneyRef"
                  type="number"
                  class="money-input"
                  :min="0"
                  :max="myCash"
                  :value="offerMoney"
                  @input="onOfferMoneyInput"
                />
                <span class="money-suffix">/ ${{ myCash.toLocaleString() }}</span>
              </div>
            </div>
            <div class="exchange-arrow">⇄</div>
            <div class="exchange-column">
              <h3 class="column-title">Pides a {{ targetPlayer?.name }}</h3>
              <div class="property-list">
                <label
                  v-for="prop in targetProperties"
                  :key="prop.index"
                  class="property-item"
                >
                  <input
                    type="checkbox"
                    :value="prop.index"
                    :checked="requestProperties.includes(prop.index)"
                    @change="toggleRequestProperty(prop.index)"
                  />
                  <span class="property-color" :style="{ background: prop.color ?? '#4b5563' }"></span>
                  <span class="property-name">{{ prop.name }}</span>
                </label>
                <p v-if="targetProperties.length === 0" class="empty-msg">Sin propiedades</p>
              </div>
              <div class="money-input-row">
                <label class="money-label">Dinero:</label>
                <input
                  type="number"
                  class="money-input"
                  :min="0"
                  :max="targetPlayer!.cash"
                  :value="requestMoney"
                  @input="onRequestMoneyInput"
                />
                <span class="money-suffix">/ ${{ targetPlayer!.cash.toLocaleString() }}</span>
              </div>
            </div>
          </div>
          <div class="exchange-actions">
            <button class="action-btn cancel-btn" tabindex="0" @click="emit('cancel')">Cancelar</button>
            <button
              ref="sendProposalRef"
              class="action-btn confirm-btn"
              :disabled="!canSendProposal"
              tabindex="0"
              @click="onSendProposal"
            >
              Enviar propuesta
            </button>
          </div>
        </div>
      </template>

      <template v-if="phase === 'respond'">
        <div class="exchange-header">
          <span class="exchange-tag">🔄 INTERCAMBIO</span>
          <h2 class="exchange-title">Propuesta de {{ fromPlayer?.name }}</h2>
          <p class="exchange-subtitle">¿Aceptas este intercambio?</p>
        </div>
        <div class="exchange-body">
          <div class="exchange-columns">
            <div class="exchange-column">
              <h3 class="column-title">{{ fromPlayer?.name }} ofrece</h3>
              <div class="property-list">
                <div
                  v-for="prop in offeredProperties"
                  :key="prop.index"
                  class="property-item read-only"
                >
                  <span class="property-color" :style="{ background: prop.color ?? '#4b5563' }"></span>
                  <span class="property-name">{{ prop.name }}</span>
                </div>
                <p v-if="proposal!.offerProperties.length === 0" class="empty-msg">Sin propiedades</p>
              </div>
              <div v-if="proposal!.offerMoney > 0" class="money-display">
                ${{ proposal!.offerMoney.toLocaleString() }}
              </div>
            </div>
            <div class="exchange-arrow">⇄</div>
            <div class="exchange-column">
              <h3 class="column-title">{{ fromPlayer?.name }} pide</h3>
              <div class="property-list">
                <div
                  v-for="prop in requestedProperties"
                  :key="prop.index"
                  class="property-item read-only"
                >
                  <span class="property-color" :style="{ background: prop.color ?? '#4b5563' }"></span>
                  <span class="property-name">{{ prop.name }}</span>
                </div>
                <p v-if="proposal!.requestProperties.length === 0" class="empty-msg">Sin propiedades</p>
              </div>
              <div v-if="proposal!.requestMoney > 0" class="money-display">
                ${{ proposal!.requestMoney.toLocaleString() }}
              </div>
            </div>
          </div>
          <div class="exchange-actions">
            <button ref="rejectRef" class="action-btn cancel-btn" tabindex="0" @click="onReject">Rechazar</button>
            <button ref="acceptRef" class="action-btn accept-btn" tabindex="0" @click="onAccept">Aceptar</button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from "vue";
import { BOARD_TILES } from "~/config/boardTilesConfig";
import { GAME_CONFIG } from "~/config/gameConfig";
import type { PlayerState, ExchangeProposal } from "~/stores/gameStore";
import { useKeyboardNavigation } from "~/composables/useKeyboardNavigation";

const props = defineProps<{
  activePlayer: PlayerState;
  players: PlayerState[];
  propertyOwners: Record<number, number>;
  proposal: ExchangeProposal | null;
  isResponding: boolean;
}>();

const emit = defineEmits<{
  (e: "propose", proposal: ExchangeProposal): void;
  (e: "accept"): void;
  (e: "reject"): void;
  (e: "cancel"): void;
}>();

type Phase = "select" | "propose" | "respond";

const phase = computed<Phase>(() => {
  if (props.isResponding && props.proposal) return "respond";
  if (selectedTargetId.value !== null) return "propose";
  return "select";
});

const selectedTargetId = ref<number | null>(null);

const targetPlayers = computed(() =>
  props.players.filter((p) => p.id !== props.activePlayer.id),
);

const targetPlayer = computed(() =>
  props.players.find((p) => p.id === selectedTargetId.value) ?? null,
);

const myProperties = computed(() =>
  BOARD_TILES.filter(
    (t) =>
      (t.type === "property" || t.type === "railroad" || t.type === "utility") &&
      props.propertyOwners[t.index] === props.activePlayer.id,
  ),
);

const targetProperties = computed(() => {
  if (selectedTargetId.value === null) return [];
  return BOARD_TILES.filter(
    (t) =>
      (t.type === "property" || t.type === "railroad" || t.type === "utility") &&
      props.propertyOwners[t.index] === selectedTargetId.value,
  );
});

const myCash = computed(() => props.activePlayer.cash);

const offerProperties = ref<number[]>([]);
const offerMoney = ref(0);
const requestProperties = ref<number[]>([]);
const requestMoney = ref(0);

const canSendProposal = computed(() => {
  if (selectedTargetId.value === null) return false;
  if (offerMoney.value < 0 || requestMoney.value < 0) return false;
  if (offerMoney.value > myCash.value) return false;
  const target = props.players.find((p) => p.id === selectedTargetId.value);
  if (target && requestMoney.value > target.cash) return false;
  if (offerProperties.value.length === 0 && requestProperties.value.length === 0 && offerMoney.value === 0 && requestMoney.value === 0) return false;
  return true;
});

const fromPlayer = computed(() =>
  props.proposal ? props.players.find((p) => p.id === props.proposal!.fromPlayerId) ?? null : null,
);

const offeredProperties = computed(() =>
  props.proposal
    ? BOARD_TILES.filter((t) => props.proposal!.offerProperties.includes(t.index))
    : [],
);

const requestedProperties = computed(() =>
  props.proposal
    ? BOARD_TILES.filter((t) => props.proposal!.requestProperties.includes(t.index))
    : [],
);

function tokenIcon(file: string) {
  return GAME_CONFIG.TOKEN_MODELS.find((t) => t.file === file)?.icon ?? "?";
}

function toggleOfferProperty(index: number) {
  const idx = offerProperties.value.indexOf(index);
  if (idx >= 0) {
    offerProperties.value.splice(idx, 1);
  } else {
    offerProperties.value.push(index);
  }
}

function toggleRequestProperty(index: number) {
  const idx = requestProperties.value.indexOf(index);
  if (idx >= 0) {
    requestProperties.value.splice(idx, 1);
  } else {
    requestProperties.value.push(index);
  }
}

function onOfferMoneyInput(e: Event) {
  const val = parseInt((e.target as HTMLInputElement).value) || 0;
  offerMoney.value = Math.max(0, Math.min(val, myCash.value));
}

function onRequestMoneyInput(e: Event) {
  const val = parseInt((e.target as HTMLInputElement).value) || 0;
  const maxCash = targetPlayer.value?.cash ?? 0;
  requestMoney.value = Math.max(0, Math.min(val, maxCash));
}

function onSelectTarget() {
  if (selectedTargetId.value === null) return;
}

function onSendProposal() {
  if (!canSendProposal.value || selectedTargetId.value === null) return;
  emit("propose", {
    fromPlayerId: props.activePlayer.id,
    toPlayerId: selectedTargetId.value,
    offerProperties: [...offerProperties.value],
    offerMoney: offerMoney.value,
    requestProperties: [...requestProperties.value],
    requestMoney: requestMoney.value,
  });
}

function onAccept() {
  emit("accept");
}

function onReject() {
  emit("reject");
}

const playerBtnRefs = ref<(HTMLElement | null)[]>([]);
const selectConfirmRef = ref<HTMLElement | null>(null);
const sendProposalRef = ref<HTMLElement | null>(null);
const acceptRef = ref<HTMLElement | null>(null);
const rejectRef = ref<HTMLElement | null>(null);
const offerMoneyRef = ref<HTMLElement | null>(null);

const activeRefs = computed(() => {
  if (phase.value === "select") {
    return [...playerBtnRefs.value, selectConfirmRef].filter(Boolean) as any[];
  }
  if (phase.value === "propose") {
    return [sendProposalRef].filter(Boolean) as any[];
  }
  if (phase.value === "respond") {
    return [rejectRef, acceptRef].filter(Boolean) as any[];
  }
  return [];
});

useKeyboardNavigation(activeRefs, {
  direction: "vertical",
  autoFocusIndex: 0,
  loop: true,
});

function resetForm() {
  selectedTargetId.value = null;
  offerProperties.value = [];
  offerMoney.value = 0;
  requestProperties.value = [];
  requestMoney.value = 0;
}

onMounted(() => {
  if (props.isResponding && props.proposal) {
    selectedTargetId.value = props.proposal.toPlayerId;
  }
  nextTick(() => {
    if (phase.value === "respond") {
      rejectRef.value?.focus();
    }
  });
});
</script>

<style scoped>
.exchange-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  backdrop-filter: blur(4px);
}

.exchange-modal {
  width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 20px;
  background: #0d0d1a;
  border: 1px solid rgba(74, 222, 128, 0.3);
  box-shadow: 0 32px 64px rgba(0, 0, 0, 0.8);
  font-family: monospace;
  position: relative;
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

.exchange-header {
  background: linear-gradient(135deg, #1a1a2e, #0d1117);
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(74, 222, 128, 0.1);
}

.exchange-tag {
  font-size: 10px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #f59e0b;
}

.exchange-title {
  color: #f1f5f9;
  font-size: 18px;
  margin: 4px 0 2px;
  font-weight: bold;
}

.exchange-subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
}

.exchange-body {
  padding: 20px 24px 24px;
}

.player-select-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.player-select-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.7);
  font-family: monospace;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}

.player-select-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

.player-select-active {
  background: rgba(74, 222, 128, 0.12) !important;
  border-color: rgba(74, 222, 128, 0.4) !important;
  color: #4ade80 !important;
}

.player-select-icon {
  font-size: 18px;
}

.player-select-name {
  flex: 1;
  text-align: left;
}

.player-select-cash {
  color: #4ade80;
  font-weight: bold;
}

.exchange-columns {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.exchange-column {
  flex: 1;
  min-width: 0;
}

.exchange-arrow {
  font-size: 24px;
  color: rgba(255, 255, 255, 0.3);
  padding-top: 36px;
  flex-shrink: 0;
}

.column-title {
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
  margin: 0 0 8px;
}

.property-list {
  max-height: 160px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}

.property-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  transition: all 0.15s;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.75);
}

.property-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.property-item input[type="checkbox"] {
  accent-color: #4ade80;
  width: 14px;
  height: 14px;
  cursor: pointer;
}

.property-item.read-only {
  cursor: default;
}

.property-color {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  flex-shrink: 0;
}

.property-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-msg {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.25);
  margin: 0;
  text-align: center;
  padding: 8px;
}

.money-input-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.money-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
}

.money-input {
  width: 80px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(74, 222, 128, 0.2);
  background: rgba(0, 0, 0, 0.3);
  color: #4ade80;
  font-family: monospace;
  font-size: 14px;
  font-weight: bold;
  text-align: right;
}

.money-input:focus {
  outline: none;
  border-color: rgba(74, 222, 128, 0.5);
  box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.15);
}

.money-suffix {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
}

.money-display {
  padding: 10px 14px;
  background: rgba(74, 222, 128, 0.08);
  border: 1px solid rgba(74, 222, 128, 0.15);
  border-radius: 10px;
  color: #4ade80;
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  margin-top: 8px;
}

.exchange-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.action-btn {
  padding: 12px 24px;
  border-radius: 12px;
  border: none;
  font-family: monospace;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.15s;
}

.confirm-btn {
  background: #10b981;
  color: white;
  box-shadow: 0 8px 16px rgba(16, 185, 129, 0.3);
}

.confirm-btn:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-1px);
}

.confirm-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.confirm-btn:focus-visible {
  outline: 2px solid #4ade80;
  outline-offset: 3px;
  box-shadow: 0 0 0 4px rgba(74, 222, 128, 0.25);
}

.cancel-btn {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.8);
}

.cancel-btn:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.4);
  outline-offset: 3px;
}

.accept-btn {
  background: #10b981;
  color: white;
  box-shadow: 0 8px 16px rgba(16, 185, 129, 0.3);
}

.accept-btn:hover {
  background: #059669;
  transform: translateY(-1px);
}

.accept-btn:focus-visible {
  outline: 2px solid #4ade80;
  outline-offset: 3px;
  box-shadow: 0 0 0 4px rgba(74, 222, 128, 0.25);
}
</style>