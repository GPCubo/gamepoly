<template>
  <div class="exchange-backdrop" @click.self="spectatorMode || emit('cancel')">
    <div class="exchange-modal">
      <button v-if="!spectatorMode" class="close-btn" tabindex="-1" aria-label="Cerrar intercambio" @click="emit('cancel')">
        <span class="material-symbols-outlined">close</span>
      </button>

      <template v-if="phase === 'select'">
        <div class="exchange-header">
          <span class="exchange-tag">
            <span class="material-symbols-outlined">sync_alt</span>
            Intercambio
          </span>
          <h2 class="exchange-title">Selecciona un jugador</h2>
          <p class="exchange-subtitle">Elige con quién negociar propiedades y efectivo.</p>
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
              <span class="player-select-copy">
                <strong>{{ p.name }}</strong>
                <small>{{ ownedCount(p.id) }} propiedades</small>
              </span>
              <span class="player-select-cash">{{ formatMoney(p.cash) }}</span>
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
          <span class="exchange-tag">
            <span class="material-symbols-outlined">handshake</span>
            Propuesta
          </span>
          <h2 class="exchange-title">{{ proposingPlayer?.name }} ↔ {{ targetPlayer?.name }}</h2>
          <p class="exchange-subtitle">Arma una oferta equilibrando propiedades y dinero.</p>
        </div>
        <div class="exchange-body">
          <div class="trade-summary">
            <div>
              <span>Tú entregas</span>
              <strong>{{ offerSummary }}</strong>
            </div>
            <span class="summary-arrow material-symbols-outlined">sync_alt</span>
            <div>
              <span>Tú recibes</span>
              <strong>{{ requestSummary }}</strong>
            </div>
          </div>

          <div v-if="proposalDevelopmentWarnings.length > 0" class="exchange-warning">
            <span class="material-symbols-outlined">warning</span>
            <div>
              <strong>Este intercambio venderá mejoras</strong>
              <p>{{ proposalDevelopmentWarnings.join(" ") }}</p>
            </div>
          </div>

          <div class="exchange-columns">
            <div class="exchange-column">
              <div class="column-heading">
                <h3 class="column-title">Tú ofreces</h3>
                <span>{{ myProperties.length }} disp.</span>
              </div>
              <div class="property-list">
                <label
                  v-for="prop in myProperties"
                  :key="prop.index"
                  class="property-item"
                  :class="{ selected: offerProperties.includes(prop.index) }"
                >
                  <input
                    type="checkbox"
                    :value="prop.index"
                    :checked="offerProperties.includes(prop.index)"
                    @change="toggleOfferProperty(prop.index)"
                  />
                  <span class="property-color" :style="{ background: prop.color ?? '#4b5563' }"></span>
                  <span class="property-copy">
                    <span class="property-name">{{ prop.name }}</span>
                    <small>{{ tileKindLabel(prop.type) }}</small>
                  </span>
                  <span v-if="prop.price" class="property-price">{{ formatMoney(prop.price) }}</span>
                </label>
                <p v-if="myProperties.length === 0" class="empty-msg">Sin propiedades</p>
              </div>
              <div class="money-input-row">
                <label class="money-label">Dinero</label>
                <input
                  ref="offerMoneyRef"
                  type="number"
                  class="money-input"
                  :min="0"
                  :max="myCash"
                  :value="offerMoney"
                  @input="onOfferMoneyInput"
                />
                <span class="money-suffix">max {{ formatMoney(myCash) }}</span>
              </div>
            </div>
            <div class="exchange-column">
              <div class="column-heading">
                <h3 class="column-title">Pides a {{ targetPlayer?.name }}</h3>
                <span>{{ targetProperties.length }} disp.</span>
              </div>
              <div class="property-list">
                <label
                  v-for="prop in targetProperties"
                  :key="prop.index"
                  class="property-item"
                  :class="{ selected: requestProperties.includes(prop.index) }"
                >
                  <input
                    type="checkbox"
                    :value="prop.index"
                    :checked="requestProperties.includes(prop.index)"
                    @change="toggleRequestProperty(prop.index)"
                  />
                  <span class="property-color" :style="{ background: prop.color ?? '#4b5563' }"></span>
                  <span class="property-copy">
                    <span class="property-name">{{ prop.name }}</span>
                    <small>{{ tileKindLabel(prop.type) }}</small>
                  </span>
                  <span v-if="prop.price" class="property-price">{{ formatMoney(prop.price) }}</span>
                </label>
                <p v-if="targetProperties.length === 0" class="empty-msg">Sin propiedades</p>
              </div>
              <div class="money-input-row">
                <label class="money-label">Dinero</label>
                <input
                  type="number"
                  class="money-input"
                  :min="0"
                  :max="targetPlayer!.cash"
                  :value="requestMoney"
                  @input="onRequestMoneyInput"
                />
                <span class="money-suffix">max {{ formatMoney(targetPlayer!.cash) }}</span>
              </div>
            </div>
          </div>
          <div class="exchange-actions">
            <button class="action-btn cancel-btn" tabindex="0" @click="onBackFromProposal">Atrás</button>
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
          <span class="exchange-tag">
            <span class="material-symbols-outlined">fact_check</span>
            Revisión
          </span>
          <h2 class="exchange-title">Propuesta de {{ fromPlayer?.name }}</h2>
          <p class="exchange-subtitle">Revisa lo que cambia de manos antes de aceptar.</p>
        </div>
        <div class="exchange-body">
          <div class="trade-summary respond-summary">
            <div>
              <span>{{ fromPlayer?.name }} entrega</span>
              <strong>{{ incomingSummary }}</strong>
            </div>
            <span class="summary-arrow material-symbols-outlined">sync_alt</span>
            <div>
              <span>{{ fromPlayer?.name }} recibe</span>
              <strong>{{ outgoingSummary }}</strong>
            </div>
          </div>

          <div v-if="respondDevelopmentWarnings.length > 0" class="exchange-warning">
            <span class="material-symbols-outlined">warning</span>
            <div>
              <strong>Al aceptar se venderán mejoras</strong>
              <p>{{ respondDevelopmentWarnings.join(" ") }}</p>
            </div>
          </div>

          <div class="exchange-columns">
            <div class="exchange-column">
              <div class="column-heading">
                <h3 class="column-title">{{ fromPlayer?.name }} ofrece</h3>
              </div>
              <div class="property-list">
                <div
                  v-for="prop in offeredProperties"
                  :key="prop.index"
                  class="property-item read-only"
                >
                  <span class="property-color" :style="{ background: prop.color ?? '#4b5563' }"></span>
                  <span class="property-copy">
                    <span class="property-name">{{ prop.name }}</span>
                    <small>{{ tileKindLabel(prop.type) }}</small>
                  </span>
                  <span v-if="prop.price" class="property-price">{{ formatMoney(prop.price) }}</span>
                </div>
                <p v-if="proposal!.offerProperties.length === 0" class="empty-msg">Sin propiedades</p>
              </div>
              <div v-if="proposal!.offerMoney > 0" class="money-display">
                {{ formatMoney(proposal!.offerMoney) }}
              </div>
            </div>
            <div class="exchange-column">
              <div class="column-heading">
                <h3 class="column-title">{{ fromPlayer?.name }} pide</h3>
              </div>
              <div class="property-list">
                <div
                  v-for="prop in requestedProperties"
                  :key="prop.index"
                  class="property-item read-only"
                >
                  <span class="property-color" :style="{ background: prop.color ?? '#4b5563' }"></span>
                  <span class="property-copy">
                    <span class="property-name">{{ prop.name }}</span>
                    <small>{{ tileKindLabel(prop.type) }}</small>
                  </span>
                  <span v-if="prop.price" class="property-price">{{ formatMoney(prop.price) }}</span>
                </div>
                <p v-if="proposal!.requestProperties.length === 0" class="empty-msg">Sin propiedades</p>
              </div>
              <div v-if="proposal!.requestMoney > 0" class="money-display">
                {{ formatMoney(proposal!.requestMoney) }}
              </div>
            </div>
          </div>
          <div v-if="!spectatorMode" class="exchange-actions">
            <button ref="rejectRef" class="action-btn cancel-btn" tabindex="0" @click="onReject">Rechazar</button>
            <button ref="renegotiateRef" class="action-btn renegotiate-btn" tabindex="0" @click="onRenegotiate">
              Renegociar
            </button>
            <button ref="acceptRef" class="action-btn accept-btn" tabindex="0" @click="onAccept">Aceptar</button>
          </div>
          <div v-else class="spectator-banner" :class="spectatorResult ?? ''">
            <template v-if="!spectatorResult">
              <span class="material-symbols-outlined spectator-icon">smart_toy</span>
              <span>{{ spectatorBannerText }}</span>
            </template>
            <template v-else-if="spectatorResult === 'accepted'">
              <span class="material-symbols-outlined spectator-icon accepted-icon">check_circle</span>
              <span class="spectator-result">Intercambio aceptado</span>
            </template>
            <template v-else>
              <span class="material-symbols-outlined spectator-icon rejected-icon">cancel</span>
              <span class="spectator-result">Intercambio rechazado</span>
            </template>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from "vue";
import { BOARD_TILES, type BoardTile, type TileType } from "~/config/boardTilesConfig";
import { GAME_CONFIG } from "~/config/gameConfig";
import { useKeyboardNavigation } from "~/composables/useKeyboardNavigation";

export type ExchangePlayerId = number | string;

export interface ExchangePlayer {
  id: ExchangePlayerId;
  name: string;
  tokenModel: string;
  cash: number;
}

export interface ExchangeProposalShape {
  fromPlayerId: ExchangePlayerId;
  toPlayerId: ExchangePlayerId;
  offerProperties: number[];
  offerMoney: number;
  requestProperties: number[];
  requestMoney: number;
  renegotiationCount: number;
}

export interface ExchangeDevelopmentState {
  houses: number;
  hotel: boolean;
  mortgaged: boolean;
}

const props = defineProps<{
  activePlayer: ExchangePlayer;
  players: ExchangePlayer[];
  propertyOwners: Record<number, ExchangePlayerId>;
  propertyDevelopments: Record<number, ExchangeDevelopmentState>;
  proposal: ExchangeProposalShape | null;
  isResponding: boolean;
  spectatorMode?: boolean;
  spectatorResult?: "accepted" | "rejected" | null;
}>();

const emit = defineEmits<{
  (e: "propose", proposal: ExchangeProposalShape): void;
  (e: "accept"): void;
  (e: "reject"): void;
  (e: "cancel"): void;
}>();

type Phase = "select" | "propose" | "respond";

const phase = computed<Phase>(() => {
  if (isRenegotiating.value) return "propose";
  if (props.isResponding && props.proposal) return "respond";
  if (selectedTargetId.value !== null) return "propose";
  return "select";
});

const selectedTargetId = ref<ExchangePlayerId | null>(null);
const isRenegotiating = ref(false);

const proposingPlayer = computed(() => {
  if (isRenegotiating.value && props.proposal) {
    return props.players.find((p) => p.id === props.proposal!.toPlayerId) ?? props.activePlayer;
  }
  return props.activePlayer;
});

const targetPlayers = computed(() =>
  props.players.filter((p) => p.id !== proposingPlayer.value.id),
);

const targetPlayer = computed(() =>
  props.players.find((p) => p.id === selectedTargetId.value) ?? null,
);

const myProperties = computed(() =>
  BOARD_TILES.filter(
    (t) =>
      (t.type === "property" || t.type === "railroad" || t.type === "utility") &&
      props.propertyOwners[t.index] === proposingPlayer.value.id,
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

const myCash = computed(() => proposingPlayer.value.cash);

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

const offerSummary = computed(() =>
  tradeSideSummary(offerProperties.value, offerMoney.value),
);

const requestSummary = computed(() =>
  tradeSideSummary(requestProperties.value, requestMoney.value),
);

const incomingSummary = computed(() =>
  props.proposal
    ? tradeSideSummary(props.proposal.offerProperties, props.proposal.offerMoney)
    : "Sin elementos",
);

const outgoingSummary = computed(() =>
  props.proposal
    ? tradeSideSummary(props.proposal.requestProperties, props.proposal.requestMoney)
    : "Sin elementos",
);

const proposalDevelopmentWarnings = computed(() => {
  const warnings = [
    ...developmentWarningsForTransfer(offerProperties.value, proposingPlayer.value.id),
  ];
  if (selectedTargetId.value !== null) {
    warnings.push(
      ...developmentWarningsForTransfer(requestProperties.value, selectedTargetId.value),
    );
  }
  return warnings;
});

const respondDevelopmentWarnings = computed(() => {
  if (!props.proposal) return [];
  return [
    ...developmentWarningsForTransfer(
      props.proposal.offerProperties,
      props.proposal.fromPlayerId,
    ),
    ...developmentWarningsForTransfer(
      props.proposal.requestProperties,
      props.proposal.toPlayerId,
    ),
  ];
});

const spectatorBannerText = computed(() => {
  if (!props.proposal) return "Los bots están negociando...";
  const from = props.players.find((p) => p.id === props.proposal!.fromPlayerId);
  const to = props.players.find((p) => p.id === props.proposal!.toPlayerId);
  return `${to?.name ?? "Bot"} está evaluando la oferta de ${from?.name ?? "Bot"}...`;
});

function tokenIcon(file: string) {
  return GAME_CONFIG.TOKEN_MODELS.find((t) => t.file === file)?.icon ?? "?";
}

function formatMoney(amount: number) {
  return `$${amount.toLocaleString()}`;
}

function ownedCount(playerId: ExchangePlayerId) {
  return BOARD_TILES.filter(
    (tile) =>
      isExchangeableTile(tile) &&
      props.propertyOwners[tile.index] === playerId,
  ).length;
}

function isExchangeableTile(tile: BoardTile) {
  return tile.type === "property" || tile.type === "railroad" || tile.type === "utility";
}

function tileKindLabel(type: TileType) {
  if (type === "railroad") return "Estación";
  if (type === "utility") return "Servicio";
  return "Propiedad";
}

function tradeSideSummary(propertyIndexes: number[], money: number) {
  const parts = [];
  if (propertyIndexes.length > 0) {
    parts.push(`${propertyIndexes.length} prop.`);
  }
  if (money > 0) {
    parts.push(formatMoney(money));
  }
  return parts.length > 0 ? parts.join(" + ") : "Sin elementos";
}

function developmentWarningsForTransfer(propertyIndexes: number[], ownerId: ExchangePlayerId) {
  const transferSet = new Set(propertyIndexes);
  const warnedGroups = new Set<string>();
  const warnings: string[] = [];

  for (const tileIndex of propertyIndexes) {
    const tile = BOARD_TILES.find((candidate) => candidate.index === tileIndex);
    if (!tile || tile.type !== "property" || warnedGroups.has(tile.group)) continue;

    const groupTiles = BOARD_TILES.filter(
      (candidate) => candidate.type === "property" && candidate.group === tile.group,
    );
    const fullGroupTransfers = groupTiles.every(
      (groupTile) =>
        props.propertyOwners[groupTile.index] === ownerId &&
        transferSet.has(groupTile.index),
    );
    if (fullGroupTransfers) continue;

    const improvedTiles = groupTiles.filter((groupTile) => {
      if (props.propertyOwners[groupTile.index] !== ownerId) return false;
      const development = props.propertyDevelopments[groupTile.index];
      return Boolean(development && (development.hotel || development.houses > 0));
    });
    if (improvedTiles.length === 0) continue;

    warnedGroups.add(tile.group);
    const ownerName = props.players.find((player) => player.id === ownerId)?.name ?? "El jugador";
    const groupName = colorGroupLabel(tile.group);
    const affected = improvedTiles
      .map((groupTile) => {
        const development = props.propertyDevelopments[groupTile.index];
        if (!development) return groupTile.name;
        const level = development.hotel
          ? "hotel"
          : `${development.houses} casa${development.houses === 1 ? "" : "s"}`;
        return `${groupTile.name} (${level})`;
      })
      .join(", ");
    warnings.push(`${ownerName} no transfiere todo el grupo ${groupName}; se venderán mejoras en ${affected}.`);
  }

  return warnings;
}

function colorGroupLabel(group: string) {
  const labels: Record<string, string> = {
    brown: "marrón",
    lightBlue: "celeste",
    pink: "rosa",
    orange: "naranja",
    red: "rojo",
    yellow: "amarillo",
    green: "verde",
    darkBlue: "azul",
  };
  return labels[group] ?? group;
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
    fromPlayerId: proposingPlayer.value.id,
    toPlayerId: selectedTargetId.value,
    offerProperties: [...offerProperties.value],
    offerMoney: offerMoney.value,
    requestProperties: [...requestProperties.value],
    requestMoney: requestMoney.value,
    renegotiationCount: isRenegotiating.value
      ? (props.proposal?.renegotiationCount ?? 0) + 1
      : 0,
  });
  isRenegotiating.value = false;
}

function onAccept() {
  emit("accept");
}

function onReject() {
  emit("reject");
}

function onRenegotiate() {
  if (!props.proposal) return;
  isRenegotiating.value = true;
  selectedTargetId.value = props.proposal.fromPlayerId;
  offerProperties.value = [...props.proposal.requestProperties];
  offerMoney.value = props.proposal.requestMoney;
  requestProperties.value = [...props.proposal.offerProperties];
  requestMoney.value = props.proposal.offerMoney;
  nextTick(() => {
    sendProposalRef.value?.focus();
  });
}

function onBackFromProposal() {
  if (isRenegotiating.value) {
    isRenegotiating.value = false;
    selectedTargetId.value = props.proposal?.toPlayerId ?? null;
    nextTick(() => {
      renegotiateRef.value?.focus();
    });
    return;
  }
  selectedTargetId.value = null;
}

const playerBtnRefs = ref<(HTMLElement | null)[]>([]);
const selectConfirmRef = ref<HTMLElement | null>(null);
const sendProposalRef = ref<HTMLElement | null>(null);
const acceptRef = ref<HTMLElement | null>(null);
const rejectRef = ref<HTMLElement | null>(null);
const renegotiateRef = ref<HTMLElement | null>(null);
const offerMoneyRef = ref<HTMLElement | null>(null);

const activeRefs = computed(() => {
  if (phase.value === "select") {
    return [...playerBtnRefs.value, selectConfirmRef].filter(Boolean) as any[];
  }
  if (phase.value === "propose") {
    return [sendProposalRef].filter(Boolean) as any[];
  }
  if (phase.value === "respond") {
    return [rejectRef, renegotiateRef, acceptRef].filter(Boolean) as any[];
  }
  return [];
});

useKeyboardNavigation(activeRefs, {
  direction: "horizontal",
  autoFocusIndex: 0,
  loop: true,
});

function resetForm() {
  selectedTargetId.value = null;
  isRenegotiating.value = false;
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
      renegotiateRef.value?.focus();
    }
  });
});

watch(
  () => [phase.value, props.proposal?.renegotiationCount ?? 0],
  () => {
    if (phase.value !== "respond") return;
    nextTick(() => {
      renegotiateRef.value?.focus();
    });
  },
);
</script>

<style scoped>
.exchange-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(4, 8, 16, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  padding: 24px;
  backdrop-filter: blur(6px);
}

.exchange-modal {
  width: min(860px, 94vw);
  max-height: 90vh;
  overflow: hidden;
  border-radius: 8px;
  background: #111827;
  border: 1px solid rgba(148, 163, 184, 0.24);
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.72);
  color: #f8fafc;
  font-family: "Inter", "Hanken Grotesk", system-ui, sans-serif;
  position: relative;
}

.close-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.72);
  color: #cbd5e1;
  cursor: pointer;
  display: grid;
  place-items: center;
  z-index: 10;
  padding: 0;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.close-btn:hover {
  background: rgba(30, 41, 59, 0.96);
  border-color: rgba(148, 163, 184, 0.38);
  color: #ffffff;
}

.exchange-header {
  padding: 24px 28px 18px;
  background: #172033;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
}

.exchange-tag {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #fbbf24;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.exchange-tag .material-symbols-outlined {
  font-size: 18px;
}

.exchange-title {
  margin: 8px 44px 4px 0;
  color: #f8fafc;
  font-size: 24px;
  line-height: 1.15;
  font-weight: 800;
  letter-spacing: 0;
}

.exchange-subtitle {
  margin: 0;
  color: #94a3b8;
  font-size: 14px;
}

.exchange-body {
  padding: 22px 28px 26px;
  overflow-y: auto;
  max-height: calc(90vh - 118px);
}

.player-select-list {
  display: grid;
  gap: 10px;
  margin-bottom: 18px;
}

.player-select-btn {
  min-height: 70px;
  display: grid;
  grid-template-columns: 44px 1fr auto;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.82);
  color: #e2e8f0;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, border-color 0.15s, transform 0.15s;
}

.player-select-btn:hover {
  background: rgba(30, 41, 59, 0.96);
  border-color: rgba(251, 191, 36, 0.42);
}

.player-select-active {
  background: rgba(20, 83, 45, 0.44);
  border-color: rgba(74, 222, 128, 0.62);
}

.player-select-icon {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: rgba(251, 191, 36, 0.13);
  border: 1px solid rgba(251, 191, 36, 0.28);
  font-size: 22px;
}

.player-select-copy {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.player-select-copy strong {
  color: #f8fafc;
  font-size: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-select-copy small {
  color: #94a3b8;
  font-size: 12px;
}

.player-select-cash {
  color: #86efac;
  font-weight: 800;
  font-size: 15px;
}

.trade-summary {
  display: grid;
  grid-template-columns: 1fr 42px 1fr;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
  padding: 14px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.trade-summary div {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.trade-summary span:not(.summary-arrow) {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}

.trade-summary strong {
  color: #f8fafc;
  font-size: 16px;
  overflow-wrap: anywhere;
}

.summary-arrow {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.1);
}

.respond-summary {
  border-color: rgba(74, 222, 128, 0.22);
}

.exchange-warning {
  display: grid;
  grid-template-columns: 38px 1fr;
  gap: 12px;
  align-items: start;
  margin: -4px 0 18px;
  padding: 12px 14px;
  border-radius: 8px;
  background: rgba(120, 53, 15, 0.42);
  border: 1px solid rgba(251, 191, 36, 0.38);
  color: #fde68a;
}

.exchange-warning > .material-symbols-outlined {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.14);
}

.exchange-warning strong {
  display: block;
  margin-bottom: 3px;
  color: #fef3c7;
  font-size: 13px;
  font-weight: 900;
}

.exchange-warning p {
  margin: 0;
  color: #fcd34d;
  font-size: 12px;
  line-height: 1.45;
}

.exchange-columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  align-items: stretch;
  margin-bottom: 18px;
}

.exchange-column {
  min-width: 0;
  padding: 14px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.66);
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.column-heading {
  min-height: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.column-title {
  margin: 0;
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.column-heading > span {
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.property-list {
  max-height: 250px;
  min-height: 118px;
  overflow-y: auto;
  display: grid;
  align-content: start;
  gap: 8px;
  margin-bottom: 12px;
  padding-right: 2px;
}

.property-item {
  display: grid;
  grid-template-columns: 16px 14px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  min-height: 46px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.34);
  border: 1px solid rgba(148, 163, 184, 0.14);
  cursor: pointer;
  color: #e2e8f0;
  transition: background 0.15s, border-color 0.15s;
}

.property-item:hover {
  background: rgba(30, 41, 59, 0.78);
  border-color: rgba(148, 163, 184, 0.3);
}

.property-item.selected {
  background: rgba(22, 101, 52, 0.34);
  border-color: rgba(74, 222, 128, 0.55);
}

.property-item.read-only {
  grid-template-columns: 14px minmax(0, 1fr) auto;
  cursor: default;
}

.property-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #22c55e;
  cursor: pointer;
}

.property-color {
  width: 14px;
  height: 28px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
}

.property-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.property-name {
  color: #f8fafc;
  font-size: 13px;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.property-copy small {
  color: #94a3b8;
  font-size: 11px;
}

.property-price {
  color: #fbbf24;
  font-size: 12px;
  font-weight: 900;
  white-space: nowrap;
}

.empty-msg {
  margin: 0;
  padding: 22px 12px;
  border-radius: 8px;
  color: #64748b;
  background: rgba(2, 6, 23, 0.24);
  border: 1px dashed rgba(148, 163, 184, 0.16);
  font-size: 12px;
  text-align: center;
}

.money-input-row {
  display: grid;
  grid-template-columns: auto 112px 1fr;
  align-items: center;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
}

.money-label {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.money-input {
  width: 100%;
  min-width: 0;
  padding: 9px 10px;
  border-radius: 8px;
  border: 1px solid rgba(74, 222, 128, 0.3);
  background: rgba(2, 6, 23, 0.6);
  color: #86efac;
  font-size: 14px;
  font-weight: 900;
  text-align: right;
}

.money-input:focus {
  outline: none;
  border-color: rgba(74, 222, 128, 0.78);
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.18);
}

.money-suffix {
  color: #64748b;
  font-size: 11px;
  white-space: nowrap;
}

.money-display {
  margin-top: 10px;
  padding: 11px 12px;
  border-radius: 8px;
  color: #86efac;
  background: rgba(22, 101, 52, 0.24);
  border: 1px solid rgba(74, 222, 128, 0.22);
  font-size: 18px;
  font-weight: 900;
  text-align: center;
}

.exchange-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.action-btn {
  min-height: 44px;
  padding: 0 20px;
  border-radius: 8px;
  border: 1px solid transparent;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.15s, opacity 0.15s;
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.confirm-btn,
.accept-btn {
  background: #16a34a;
  color: #ffffff;
  box-shadow: 0 10px 22px rgba(22, 163, 74, 0.24);
}

.confirm-btn:hover:not(:disabled),
.accept-btn:hover {
  background: #15803d;
}

.renegotiate-btn {
  background: rgba(217, 119, 6, 0.18);
  color: #fde68a;
  border-color: rgba(251, 191, 36, 0.38);
}

.renegotiate-btn:hover {
  background: rgba(217, 119, 6, 0.32);
  border-color: rgba(251, 191, 36, 0.62);
}

.confirm-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.cancel-btn {
  background: rgba(15, 23, 42, 0.88);
  color: #cbd5e1;
  border-color: rgba(148, 163, 184, 0.2);
}

.cancel-btn:hover {
  background: rgba(30, 41, 59, 0.96);
  border-color: rgba(148, 163, 184, 0.36);
}

.action-btn:focus-visible,
.close-btn:focus-visible,
.player-select-btn:focus-visible {
  outline: 2px solid #fbbf24;
  outline-offset: 3px;
}

@media (max-width: 760px) {
  .exchange-backdrop {
    padding: 12px;
    align-items: flex-start;
  }

  .exchange-modal {
    width: 100%;
    max-height: calc(100vh - 24px);
  }

  .exchange-header,
  .exchange-body {
    padding-left: 18px;
    padding-right: 18px;
  }

  .exchange-title {
    font-size: 20px;
  }

  .trade-summary,
  .exchange-columns {
    grid-template-columns: 1fr;
  }

  .summary-arrow {
    width: 100%;
    height: 30px;
  }

  .money-input-row {
    grid-template-columns: 1fr;
  }

  .exchange-actions {
    flex-direction: column-reverse;
  }

  .action-btn {
    width: 100%;
  }
}

.spectator-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px 20px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.18);
  color: #94a3b8;
  font-size: 14px;
  font-weight: 700;
  text-align: center;
  transition: border-color 0.3s, background 0.3s;
}

.spectator-banner.accepted {
  background: rgba(20, 83, 45, 0.28);
  border-color: rgba(74, 222, 128, 0.45);
}

.spectator-banner.rejected {
  background: rgba(127, 29, 29, 0.28);
  border-color: rgba(248, 113, 113, 0.45);
}

.spectator-icon {
  font-size: 20px;
  color: #fbbf24;
  flex-shrink: 0;
}

.accepted-icon {
  color: #4ade80;
}

.rejected-icon {
  color: #f87171;
}

.spectator-result {
  font-size: 15px;
  font-weight: 900;
  color: inherit;
}

.spectator-banner.accepted .spectator-result {
  color: #4ade80;
}

.spectator-banner.rejected .spectator-result {
  color: #f87171;
}
</style>
