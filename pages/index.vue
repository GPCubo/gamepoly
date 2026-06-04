<template>
  <div class="setup-container">
    <div class="setup-card">
      <h1 class="title">Monopoly Web</h1>
      <p class="subtitle">Configuración de jugadores</p>

      <div class="player-count-section">
        <span class="label">Jugadores:</span>
        <div class="count-buttons">
          <button
            v-for="n in GAME_CONFIG.MAX_PLAYERS"
            :key="n"
            class="count-btn"
            :class="{ active: n === selectedCount }"
            :disabled="n < 2"
            @click="selectCount(n)"
          >
            {{ n }}
          </button>
        </div>
      </div>

      <div
        v-for="idx in selectedCount"
        :key="idx"
        class="player-row"
      >
        <span class="player-label">{{ icons[idx - 1] }} Jugador {{ idx }}</span>
        <input
          v-model="playerNames[idx - 1]"
          class="name-input"
          :placeholder="'Jugador ' + idx"
          maxlength="20"
        />
        <select
          v-model="playerTokens[idx - 1]"
          class="token-select"
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
      </div>

      <div class="game-config-section">
        <span class="section-title">Configuración de partida</span>
        <div class="config-row">
          <label class="config-label">💰 Dinero inicial</label>
          <div class="number-input-wrapper">
            <span class="currency">$</span>
            <input
              v-model.number="startingCash"
              class="number-input"
              type="number"
              min="100"
              step="100"
            />
          </div>
        </div>
        <div class="config-row">
          <label class="config-label">🏁 Salario (salida)</label>
          <div class="number-input-wrapper">
            <span class="currency">$</span>
            <input
              v-model.number="goSalary"
              class="number-input"
              type="number"
              min="0"
              step="50"
            />
          </div>
        </div>
      </div>

      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

      <button class="start-btn" @click="startGame">
        Iniciar Juego
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { GAME_CONFIG } from "~/config/gameConfig";
import { useGameStore } from "~/stores/gameStore";

const store = useGameStore();
store.phase = "setup";
store.players = [];
store.activePlayerIndex = 0;

const icons = ["🎩", "🧵", "🐷", "🔑"];

const selectedCount = ref(2);
const playerNames = ref<string[]>(
  Array.from({ length: GAME_CONFIG.MAX_PLAYERS }, (_, i) => `Player 0${i + 1}`)
);
const playerTokens = ref<string[]>(
  GAME_CONFIG.TOKEN_MODELS.slice(0, GAME_CONFIG.MAX_PLAYERS).map((t) => t.file)
);
const startingCash = ref<number>(GAME_CONFIG.STARTING_CASH);
const goSalary = ref<number>(GAME_CONFIG.GO_SALARY);
const errorMsg = ref("");

function onKeyDown(e: KeyboardEvent) {
  if (e.key === "Enter") startGame();
}

onMounted(() => window.addEventListener("keydown", onKeyDown));
onUnmounted(() => window.removeEventListener("keydown", onKeyDown));

function selectCount(n: number) {
  if (n >= 2 && n <= GAME_CONFIG.MAX_PLAYERS) {
    selectedCount.value = n;
  }
}

function availableTokens(excludeIdx: number) {
  const used = playerTokens.value
    .filter((_, i) => i < selectedCount.value && i !== excludeIdx)
    .map((t) => t);
  return GAME_CONFIG.TOKEN_MODELS.filter((t) => !used.includes(t.file));
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
      errorMsg.value = `La ficha ya está asignada a otro jugador.`;
      return;
    }

    seenTokens.add(token);
    players.push({ name, tokenModel: token, startingCash: cash });
  }

  store.setupGame(players, { goSalary: salary });
  navigateTo("/game");
}
</script>

<style scoped>
.setup-container {
  width: 100vw;
  height: 100vh;
  background-color: #1a1a2e;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: monospace;
}

.setup-card {
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(74, 222, 128, 0.2);
  border-radius: 24px;
  padding: 40px 48px;
  max-width: 440px;
  width: 90%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.title {
  color: #4ade80;
  font-size: 28px;
  text-align: center;
  margin: 0;
}

.subtitle {
  color: rgba(74, 222, 128, 0.6);
  font-size: 14px;
  text-align: center;
  margin: -12px 0 0 0;
}

.player-count-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.label {
  color: #4ade80;
  font-size: 14px;
}

.count-buttons {
  display: flex;
  gap: 8px;
}

.count-btn {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 1px solid rgba(74, 222, 128, 0.3);
  background: transparent;
  color: #4ade80;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.count-btn:hover:not(:disabled) {
  background: rgba(74, 222, 128, 0.1);
}

.count-btn.active {
  background: #10b981;
  color: white;
  border-color: #10b981;
}

.count-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.player-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.player-label {
  color: #4ade80;
  font-size: 14px;
  min-width: 100px;
}

.name-input {
  flex: 1;
  min-width: 120px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(74, 222, 128, 0.2);
  background: rgba(0, 0, 0, 0.4);
  color: #e2e8f0;
  font-family: monospace;
  font-size: 14px;
  outline: none;
  transition: border 0.2s;
}

.name-input:focus {
  border-color: #4ade80;
}

.name-input::placeholder {
  color: rgba(255, 255, 255, 0.25);
}

.token-select {
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(74, 222, 128, 0.2);
  background: rgba(0, 0, 0, 0.4);
  color: #e2e8f0;
  font-family: monospace;
  font-size: 14px;
  outline: none;
  cursor: pointer;
  transition: border 0.2s;
  min-width: 160px;
}

.token-select:focus {
  border-color: #4ade80;
}

.token-select option {
  background: #1a1a2e;
}

.error-msg {
  color: #f87171;
  font-size: 13px;
  text-align: center;
  margin: 0;
}

.start-btn {
  margin-top: 8px;
  padding: 16px 32px;
  border-radius: 16px;
  border: none;
  background: #10b981;
  color: white;
  font-size: 18px;
  font-weight: bold;
  font-family: monospace;
  cursor: pointer;
  box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.4);
  transition: all 0.2s;
}

.start-btn:hover {
  background: #059669;
  transform: translateY(-2px);
}

.game-config-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-top: 1px solid rgba(74, 222, 128, 0.15);
  padding-top: 16px;
}

.section-title {
  color: rgba(74, 222, 128, 0.7);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.config-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.config-label {
  color: #4ade80;
  font-size: 14px;
  min-width: 160px;
}

.number-input-wrapper {
  display: flex;
  align-items: center;
  border: 1px solid rgba(74, 222, 128, 0.2);
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.4);
  overflow: hidden;
  transition: border 0.2s;
}

.number-input-wrapper:focus-within {
  border-color: #4ade80;
}

.currency {
  color: rgba(74, 222, 128, 0.6);
  font-size: 14px;
  padding: 10px 0 10px 14px;
  user-select: none;
}

.number-input {
  border: none;
  background: transparent;
  color: #e2e8f0;
  font-family: monospace;
  font-size: 14px;
  padding: 10px 14px 10px 6px;
  outline: none;
  width: 90px;
}

.number-input::-webkit-inner-spin-button,
.number-input::-webkit-outer-spin-button {
  opacity: 0.4;
}
</style>
