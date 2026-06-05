<template>
  <div class="setup-page">
    <div class="ambient-glow ambient-1" />
    <div class="ambient-glow ambient-2" />

    <header class="app-header">
      <div class="header-left">
        <span class="material-symbols-outlined header-logo">casino</span>
        <span class="header-brand">GamePoly</span>
      </div>
      <div class="header-right">
        <span class="header-version">v1.0</span>
      </div>
    </header>

    <div class="page-body">
    <div class="setup-card">
      <div class="card-header">
        <h1 class="main-title">Configuración de Partida</h1>
        <p class="subtitle">Ajusta los parámetros de tu próxima sesión.</p>
      </div>

      <!-- Player Count -->
      <div class="section-block">
        <span class="section-label">NÚMERO DE JUGADORES</span>
        <div class="player-count-bar">
          <button
            v-for="n in GAME_CONFIG.MAX_PLAYERS"
            :key="n"
            class="count-pill"
            :class="{ active: n === selectedCount, disabled: n < 2 }"
            :disabled="n < 2"
            @click="selectCount(n)"
          >
            {{ n }}
          </button>
        </div>
      </div>

      <!-- Swipeable Player Cards -->
      <div class="section-block">
        <div class="section-header">
          <span class="section-label">PARTICIPANTES</span>
          <span class="section-hint">{{ playerPage + 1 }}–{{ Math.min(playerPage + 2, selectedCount) }} de {{ selectedCount }}</span>
        </div>
        <div class="carousel-wrapper">
          <button
            class="carousel-arrow"
            :class="{ hidden: playerPage === 0 }"
            @click="prevPlayers"
          >
            <span class="material-symbols-outlined">chevron_left</span>
          </button>

          <div class="carousel-track">
            <TransitionGroup name="slide" tag="div" class="carousel-inner">
              <div
                v-for="idx in visiblePlayers"
                :key="idx"
                class="player-card"
                :class="'player-accent-' + idx"
              >
                <div class="player-card-top">
                  <div class="player-num-badge">{{ idx }}</div>
                  <div class="player-card-title">Jugador {{ idx }}</div>
                  <span class="material-symbols-outlined player-icon">person</span>
                </div>
                <div class="player-card-fields">
                  <div class="field-group">
                    <label class="field-label">NOMBRE</label>
                    <input
                      v-model="playerNames[idx - 1]"
                      class="field-input"
                      :placeholder="'Jugador ' + idx"
                      maxlength="20"
                    />
                  </div>
                  <div class="field-group">
                    <label class="field-label">FICHA</label>
                    <div class="select-wrapper">
                      <select
                        v-model="playerTokens[idx - 1]"
                        class="field-input field-select"
                      >
                        <option value="" disabled>Elegir ficha</option>
                        <option
                          v-for="token in availableTokens(idx - 1)"
                          :key="token.file"
                          :value="token.file"
                        >
                          {{ token.icon }} {{ token.name }}
                        </option>
                      </select>
                      <span class="material-symbols-outlined select-arrow">expand_more</span>
                    </div>
                  </div>
                </div>
              </div>
            </TransitionGroup>
          </div>

          <button
            class="carousel-arrow"
            :class="{ hidden: playerPage >= maxPlayerPage }"
            @click="nextPlayers"
          >
            <span class="material-symbols-outlined">chevron_right</span>
          </button>
        </div>

        <div class="carousel-dots">
          <span
            v-for="p in maxPlayerPage + 1"
            :key="p"
            class="dot"
            :class="{ active: p - 1 === playerPage }"
            @click="playerPage = p - 1"
          />
        </div>
      </div>

      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

      <!-- Actions -->
      <div class="action-row">
        <button class="settings-btn" @click="showSettings = true">
          <span class="material-symbols-outlined">tune</span>
          Reglas
        </button>
        <button class="reset-btn" @click="resetForm">RESTABLECER</button>
        <button class="start-btn" @click="startGame">
          <span class="material-symbols-outlined start-icon">play_arrow</span>
          INICIAR
        </button>
      </div>
    </div>
    </div>

    <!-- Settings Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showSettings" class="modal-backdrop" @click.self="showSettings = false">
          <div class="modal-card">
            <div class="modal-header">
              <h2 class="modal-title">Reglas Avanzadas</h2>
              <button class="modal-close" @click="showSettings = false">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <div class="modal-body">
              <!-- Starting Cash -->
              <div class="setting-card">
                <div class="setting-top">
                  <div class="setting-icon-wrap setting-icon-primary">
                    <span class="material-symbols-outlined">payments</span>
                  </div>
                  <span class="setting-title">Dinero inicial</span>
                  <span class="setting-value">${{ startingCash.toLocaleString() }}</span>
                </div>
                <input
                  v-model.number="startingCash"
                  class="range-input"
                  type="range"
                  min="500"
                  max="5000"
                  step="100"
                />
                <div class="range-labels">
                  <span>$500</span>
                  <span>$5,000</span>
                </div>
              </div>

              <!-- Go Salary -->
              <div class="setting-card">
                <div class="setting-top">
                  <div class="setting-icon-wrap setting-icon-secondary">
                    <span class="material-symbols-outlined">stadium</span>
                  </div>
                  <span class="setting-title">Salario (Salida)</span>
                  <div class="salary-input-wrap">
                    <span class="salary-prefix">$</span>
                    <input
                      v-model.number="goSalary"
                      class="salary-input"
                      type="number"
                      min="0"
                      step="50"
                    />
                  </div>
                </div>
              </div>

              <!-- Toggle: Skip Buy -->
              <div class="setting-toggle-card">
                <div class="toggle-info">
                  <span class="toggle-title">Permitir omitir compra</span>
                  <span class="toggle-desc">Los jugadores pueden declinar comprar propiedades</span>
                </div>
                <label class="toggle-label">
                  <input type="checkbox" v-model="canSkipBuy" class="toggle-input" />
                  <span class="toggle-track">
                    <span class="toggle-thumb" />
                  </span>
                </label>
              </div>
            </div>

            <button class="modal-done-btn" @click="showSettings = false">
              LISTO
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { GAME_CONFIG } from "~/config/gameConfig";
import { useGameStore } from "~/stores/gameStore";

const store = useGameStore();
store.phase = "setup";
store.players = [];
store.activePlayerIndex = 0;

const selectedCount = ref(2);
const playerNames = ref<string[]>(
  Array.from({ length: GAME_CONFIG.MAX_PLAYERS }, (_, i) => `Player 0${i + 1}`)
);
const playerTokens = ref<string[]>(
  GAME_CONFIG.TOKEN_MODELS.slice(0, GAME_CONFIG.MAX_PLAYERS).map((t) => t.file)
);
const startingCash = ref<number>(GAME_CONFIG.STARTING_CASH);
const goSalary = ref<number>(GAME_CONFIG.GO_SALARY);
const canSkipBuy = ref<boolean>(GAME_CONFIG.CAN_SKIP_BUY);
const errorMsg = ref("");
const showSettings = ref(false);
const playerPage = ref(0);

const maxPlayerPage = computed(() => Math.max(0, Math.ceil(selectedCount.value / 2) - 1));

const visiblePlayers = computed(() => {
  const start = playerPage.value * 2;
  const end = Math.min(start + 2, selectedCount.value);
  const arr: number[] = [];
  for (let i = start + 1; i <= end; i++) arr.push(i);
  return arr;
});

function onKeyDown(e: KeyboardEvent) {
  if (e.key === "Enter") startGame();
  if (e.key === "Escape" && showSettings.value) showSettings.value = false;
}

onMounted(() => window.addEventListener("keydown", onKeyDown));
onUnmounted(() => window.removeEventListener("keydown", onKeyDown));

function selectCount(n: number) {
  if (n >= 2 && n <= GAME_CONFIG.MAX_PLAYERS) {
    selectedCount.value = n;
    if (playerPage.value > maxPlayerPage.value) {
      playerPage.value = maxPlayerPage.value;
    }
  }
}

function prevPlayers() {
  if (playerPage.value > 0) playerPage.value--;
}

function nextPlayers() {
  if (playerPage.value < maxPlayerPage.value) playerPage.value++;
}

function availableTokens(excludeIdx: number) {
  const used = playerTokens.value
    .filter((_, i) => i < selectedCount.value && i !== excludeIdx)
    .map((t) => t);
  return GAME_CONFIG.TOKEN_MODELS.filter((t) => !used.includes(t.file));
}

function resetForm() {
  selectedCount.value = 2;
  playerNames.value = Array.from(
    { length: GAME_CONFIG.MAX_PLAYERS },
    (_, i) => `Player 0${i + 1}`
  );
  playerTokens.value = GAME_CONFIG.TOKEN_MODELS.slice(0, GAME_CONFIG.MAX_PLAYERS).map((t) => t.file);
  startingCash.value = GAME_CONFIG.STARTING_CASH;
  goSalary.value = GAME_CONFIG.GO_SALARY;
  canSkipBuy.value = GAME_CONFIG.CAN_SKIP_BUY;
  errorMsg.value = "";
  playerPage.value = 0;
}

function startGame() {
  errorMsg.value = "";

  const cash = Math.floor(startingCash.value);
  const salary = Math.floor(goSalary.value);

  if (!Number.isFinite(cash) || cash < 100) {
    errorMsg.value = "El dinero inicial debe ser al menos $100.";
    return;
  }
  if (!Number.isFinite(salary) || salary < 0) {
    errorMsg.value = "El salario de salida no puede ser negativo.";
    return;
  }

  const players = [];
  const seenTokens = new Set<string>();

  for (let i = 0; i < selectedCount.value; i++) {
    const name = playerNames.value[i].trim() || `Jugador ${i + 1}`;
    const token = playerTokens.value[i];

    if (!token) {
      errorMsg.value = `Jugador ${i + 1}: selecciona una ficha.`;
      return;
    }

    if (seenTokens.has(token)) {
      errorMsg.value = "La ficha ya está asignada a otro jugador.";
      return;
    }

    seenTokens.add(token);
    players.push({ name, tokenModel: token, startingCash: cash });
  }

  store.setupGame(players, { goSalary: salary, canSkipBuy: canSkipBuy.value });
  navigateTo("/game");
}
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&family=Hanken+Grotesk:wght@400;500;600&display=swap");
@import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1");

.material-symbols-outlined {
  font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24;
}

.setup-page {
  height: 100vh;
  height: 100dvh;
  background: #11131c;
  color: #e1e1ef;
  font-family: "Hanken Grotesk", sans-serif;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.page-body {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow-y: auto;
  padding: 16px;
  position: relative;
  z-index: 1;
}

.ambient-glow {
  position: fixed;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
}

.ambient-1 {
  top: -10%;
  right: -10%;
  width: 50%;
  height: 50%;
  background: rgba(0, 245, 155, 0.06);
  filter: blur(120px);
}

.ambient-2 {
  bottom: -10%;
  left: -10%;
  width: 50%;
  height: 50%;
  background: rgba(215, 3, 87, 0.04);
  filter: blur(120px);
}

/* Header */
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: rgba(17, 19, 28, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(132, 149, 136, 0.08);
  position: relative;
  z-index: 10;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-logo {
  font-size: 28px;
  color: #00f59b;
  font-variation-settings: "FILL" 1, "wght" 400;
}

.header-brand {
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 20px;
  font-weight: 800;
  color: #e1e1ef;
  letter-spacing: -0.02em;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-version {
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  font-weight: 500;
  color: rgba(132, 149, 136, 0.4);
  padding: 4px 10px;
  background: rgba(25, 27, 36, 0.6);
  border-radius: 8px;
  border: 1px solid rgba(132, 149, 136, 0.08);
}

.setup-card {
  width: 100%;
  max-width: 680px;
  background: rgba(29, 31, 41, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(132, 149, 136, 0.1);
  border-radius: 24px;
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  position: relative;
  z-index: 1;
  box-shadow: 0 32px 64px -12px rgba(0, 0, 0, 0.5);
}

.card-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.main-title {
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 24px;
  font-weight: 800;
  color: #e1e1ef;
  margin: 0;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.subtitle {
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 14px;
  color: #849588;
  margin: 0;
  line-height: 1.4;
}

.section-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-label {
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #849588;
}

.section-hint {
  font-size: 11px;
  color: rgba(132, 149, 136, 0.5);
}

/* Player count bar */
.player-count-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  background: rgba(25, 27, 36, 0.8);
  padding: 6px;
  border-radius: 16px;
  border: 1px solid rgba(132, 149, 136, 0.1);
}

.count-pill {
  padding: 10px;
  border-radius: 12px;
  border: none;
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #849588;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.count-pill:hover:not(.disabled) {
  background: rgba(50, 52, 62, 0.5);
}

.count-pill.active {
  background: #00f59b;
  color: #003920;
  box-shadow: 0 4px 16px rgba(0, 245, 155, 0.2);
}

.count-pill.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Carousel */
.carousel-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.carousel-arrow {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(132, 149, 136, 0.15);
  background: rgba(25, 27, 36, 0.6);
  color: #849588;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
}

.carousel-arrow:hover {
  background: rgba(50, 52, 62, 0.8);
  color: #00e38f;
  border-color: rgba(0, 245, 155, 0.3);
}

.carousel-arrow.hidden {
  opacity: 0;
  pointer-events: none;
}

.carousel-track {
  flex: 1;
  overflow: hidden;
}

.carousel-inner {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.carousel-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding-top: 4px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(132, 149, 136, 0.25);
  cursor: pointer;
  transition: all 0.2s;
}

.dot.active {
  background: #00f59b;
  box-shadow: 0 0 8px rgba(0, 245, 155, 0.3);
}

/* Player cards */
.player-card {
  background: rgba(25, 27, 36, 0.8);
  border: 1px solid rgba(132, 149, 136, 0.1);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.25s ease;
}

.player-card:hover {
  border-color: rgba(0, 245, 155, 0.3);
}

.player-card-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.player-num-badge {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 15px;
  font-weight: 700;
  flex-shrink: 0;
}

.player-accent-1 .player-num-badge {
  background: rgba(0, 245, 155, 0.15);
  color: #00f59b;
}

.player-accent-2 .player-num-badge {
  background: rgba(215, 3, 87, 0.15);
  color: #d70357;
}

.player-accent-3 .player-num-badge {
  background: rgba(255, 209, 101, 0.15);
  color: #ffd165;
}

.player-accent-4 .player-num-badge {
  background: rgba(248, 113, 113, 0.15);
  color: #f87171;
}

.player-card-title {
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #e1e1ef;
  flex: 1;
}

.player-icon {
  font-size: 20px;
  color: rgba(132, 149, 136, 0.4);
}

.player-accent-1 .player-icon { color: #00e38f; }
.player-accent-2 .player-icon { color: #d70357; }
.player-accent-3 .player-icon { color: #ffd165; }
.player-accent-4 .player-icon { color: #f87171; }

.player-card-fields {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-family: "JetBrains Mono", monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(132, 149, 136, 0.7);
  padding-left: 2px;
}

.field-input {
  width: 100%;
  background: rgba(17, 19, 28, 0.6);
  border: 1px solid rgba(132, 149, 136, 0.12);
  border-radius: 10px;
  padding: 10px 14px;
  color: #e1e1ef;
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.field-input:focus {
  border-color: #00f59b;
  box-shadow: 0 0 0 2px rgba(0, 245, 155, 0.15);
}

.field-input::placeholder {
  color: rgba(225, 225, 239, 0.2);
}

.select-wrapper {
  position: relative;
}

.field-select {
  appearance: none;
  cursor: pointer;
  padding-right: 40px;
}

.select-arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: rgba(132, 149, 136, 0.5);
  font-size: 18px;
}

.field-select option {
  background: #1d1f29;
  color: #e1e1ef;
}

/* Error */
.error-msg {
  color: #f87171;
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 13px;
  text-align: center;
  margin: 0;
  padding: 10px;
  background: rgba(248, 113, 113, 0.08);
  border: 1px solid rgba(248, 113, 113, 0.2);
  border-radius: 10px;
}

/* Actions */
.action-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.settings-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 18px;
  border: 1px solid rgba(132, 149, 136, 0.15);
  background: rgba(25, 27, 36, 0.6);
  color: #849588;
  border-radius: 14px;
  font-family: "JetBrains Mono", monospace;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
}

.settings-btn .material-symbols-outlined {
  font-size: 18px;
}

.settings-btn:hover {
  color: #00e38f;
  border-color: rgba(0, 245, 155, 0.3);
  background: rgba(0, 245, 155, 0.05);
}

.reset-btn {
  padding: 12px 20px;
  border: none;
  background: transparent;
  color: #849588;
  font-family: "JetBrains Mono", monospace;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 0.2s;
  border-radius: 14px;
}

.reset-btn:hover {
  color: #00e38f;
}

.start-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 28px;
  margin-left: auto;
  background: #00f59b;
  color: #003920;
  border: none;
  border-radius: 14px;
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 8px 24px -6px rgba(0, 245, 155, 0.35);
  transition: all 0.3s;
}

.start-btn:hover {
  transform: scale(1.03);
  box-shadow: 0 12px 32px -6px rgba(0, 245, 155, 0.45);
}

.start-btn:active {
  transform: scale(0.97);
}

.start-icon {
  font-size: 22px;
  font-variation-settings: "FILL" 1, "wght" 400;
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.modal-card {
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
  background: rgba(29, 31, 41, 0.95);
  border: 1px solid rgba(132, 149, 136, 0.12);
  border-radius: 24px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
  box-shadow: 0 32px 80px -12px rgba(0, 0, 0, 0.6);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 20px;
  font-weight: 800;
  color: #e1e1ef;
  margin: 0;
}

.modal-close {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(132, 149, 136, 0.12);
  background: rgba(25, 27, 36, 0.6);
  color: #849588;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-close:hover {
  color: #f87171;
  border-color: rgba(248, 113, 113, 0.3);
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.modal-done-btn {
  padding: 14px;
  background: #00f59b;
  color: #003920;
  border: none;
  border-radius: 14px;
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-done-btn:hover {
  transform: scale(1.02);
}

/* Setting cards (in modal) */
.setting-card {
  background: rgba(25, 27, 36, 0.5);
  border: 1px solid rgba(132, 149, 136, 0.08);
  border-radius: 16px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-top {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.setting-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.setting-icon-wrap .material-symbols-outlined {
  font-size: 20px;
}

.setting-icon-primary {
  background: rgba(0, 245, 155, 0.1);
  color: #00e38f;
}

.setting-icon-secondary {
  background: rgba(215, 3, 87, 0.1);
}

.setting-icon-secondary .material-symbols-outlined {
  color: #d70357;
}

.setting-title {
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #e1e1ef;
  flex: 1;
}

.setting-value {
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 20px;
  font-weight: 800;
  color: #00e38f;
}

/* Range input */
.range-input {
  width: 100%;
  height: 8px;
  appearance: none;
  background: rgba(50, 52, 62, 0.8);
  border-radius: 9999px;
  outline: none;
  cursor: pointer;
}

.range-input::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #00f59b;
  box-shadow: 0 2px 8px rgba(0, 245, 155, 0.4);
  cursor: pointer;
}

.range-input::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #00f59b;
  border: none;
  box-shadow: 0 2px 8px rgba(0, 245, 155, 0.4);
  cursor: pointer;
}

.range-labels {
  display: flex;
  justify-content: space-between;
  font-family: "JetBrains Mono", monospace;
  font-size: 10px;
  color: rgba(132, 149, 136, 0.5);
}

/* Salary input */
.salary-input-wrap {
  display: flex;
  align-items: center;
  background: rgba(17, 19, 28, 0.6);
  border: 1px solid rgba(132, 149, 136, 0.15);
  border-radius: 10px;
  overflow: hidden;
}

.salary-prefix {
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 16px;
  font-weight: 800;
  color: #00e38f;
  padding: 6px 0 6px 12px;
}

.salary-input {
  background: transparent;
  border: none;
  color: #e1e1ef;
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 16px;
  font-weight: 800;
  padding: 6px 12px 6px 4px;
  outline: none;
  width: 80px;
  text-align: right;
}

.salary-input::-webkit-inner-spin-button,
.salary-input::-webkit-outer-spin-button {
  opacity: 0.4;
}

/* Toggle card */
.setting-toggle-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: rgba(25, 27, 36, 0.5);
  border: 1px solid rgba(132, 149, 136, 0.08);
  border-radius: 16px;
  padding: 16px 18px;
  transition: border-color 0.2s;
}

.setting-toggle-card:hover {
  border-color: rgba(0, 245, 155, 0.2);
}

.toggle-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
}

.toggle-title {
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #e1e1ef;
}

.toggle-desc {
  font-size: 11px;
  color: rgba(132, 149, 136, 0.5);
  line-height: 1.4;
}

.toggle-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
}

.toggle-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
}

.toggle-track {
  position: relative;
  width: 48px;
  height: 26px;
  background: rgba(50, 52, 62, 0.8);
  border-radius: 9999px;
  transition: background 0.2s;
}

.toggle-input:checked + .toggle-track {
  background: #00f59b;
}

.toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-input:checked + .toggle-track .toggle-thumb {
  transform: translateX(22px);
}

/* Transitions */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.25s ease;
}

.slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.modal-enter-active {
  transition: opacity 0.25s ease;
}

.modal-enter-active .modal-card {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.modal-enter-from {
  opacity: 0;
}

.modal-enter-from .modal-card {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
}

.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-leave-active .modal-card {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-leave-to {
  opacity: 0;
}

.modal-leave-to .modal-card {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
}

@media (max-width: 600px) {
  .app-header {
    padding: 10px 16px;
  }

  .header-brand {
    font-size: 17px;
  }

  .header-logo {
    font-size: 24px;
  }

  .setup-card {
    padding: 20px 16px;
    gap: 16px;
    border-radius: 18px;
  }

  .main-title {
    font-size: 20px;
  }

  .carousel-inner {
    grid-template-columns: 1fr;
  }

  .action-row {
    flex-wrap: wrap;
  }

  .start-btn {
    flex: 1;
  }

  .player-card {
    padding: 14px;
    gap: 10px;
  }

  .player-card-fields {
    gap: 8px;
  }
}
</style>