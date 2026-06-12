<template>
  <div class="lobby-page">
    <div class="ambient-glow ambient-1" />
    <div class="ambient-glow ambient-2" />

    <header class="app-header">
      <div class="header-left">
        <button class="back-btn" @click="navigateTo('/')">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <span class="material-symbols-outlined header-logo">casino</span>
        <span class="header-brand">GamePoly</span>
        <span class="header-badge">Multijugador</span>
      </div>
    </header>

    <div class="page-body">
      <!-- Join view -->
      <div v-if="mode === 'join'" class="lobby-card">
        <div class="card-header">
          <h1 class="main-title">Unirse a mesa</h1>
          <p class="subtitle">Ingresa el código de la mesa que te compartieron.</p>
        </div>
        <div class="field-group">
          <label class="field-label">TU NOMBRE</label>
          <input v-model="playerName" class="field-input" placeholder="Cómo te llamas?" maxlength="20" />
        </div>
        <div class="field-group">
          <label class="field-label">CÓDIGO DE MESA</label>
          <input v-model="joinCode" class="field-input field-mono" placeholder="T-xxxxxxxx" maxlength="20" />
        </div>
        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
        <div class="action-row">
          <button class="reset-btn" @click="mode = 'create'">Crear mesa</button>
          <button class="start-btn" :disabled="joining" @click="joinTable">
            <span class="material-symbols-outlined">login</span>
            {{ joining ? 'Uniéndose...' : 'UNIRSE' }}
          </button>
        </div>
      </div>

      <!-- Create view -->
      <div v-else class="lobby-card">
        <div class="card-header">
          <h1 class="main-title">Nueva mesa</h1>
          <p class="subtitle">Configura los slots y las reglas de la partida.</p>
        </div>

        <!-- Player name -->
        <div class="field-group">
          <label class="field-label">TU NOMBRE</label>
          <input v-model="playerName" class="field-input" placeholder="Cómo te llamas?" maxlength="20" />
        </div>

        <!-- Slot count -->
        <div class="section-block">
          <span class="section-label">NÚMERO DE SLOTS</span>
          <div class="player-count-bar">
            <button
              v-for="n in 4"
              :key="n"
              class="count-pill"
              :class="{ active: n === slotCount, disabled: n < 2 }"
              :disabled="n < 2"
              @click="setSlotCount(n)"
            >{{ n }}</button>
          </div>
        </div>

        <!-- Slot configuration -->
        <div class="section-block">
          <span class="section-label">SLOTS</span>
          <div class="slots-grid">
            <div
              v-for="(slot, idx) in slots"
              :key="idx"
              class="slot-card"
              :class="'slot-accent-' + (idx + 1)"
            >
              <div class="slot-top">
                <span class="slot-num">{{ idx + 1 }}</span>
                <span v-if="idx === 0" class="slot-you-badge">Tú</span>
              </div>
              <div class="field-group" v-if="idx > 0">
                <label class="field-label">TIPO</label>
                <div class="select-wrapper">
                  <select v-model="slot.type" class="field-input field-select">
                    <option value="open">Esperando jugador</option>
                    <option value="bot_regular">Bot Regular</option>
                    <option value="bot_difficult">Bot Difícil</option>
                  </select>
                  <span class="material-symbols-outlined select-arrow">expand_more</span>
                </div>
              </div>
              <div class="slot-type-label" v-if="idx === 0">
                <span class="material-symbols-outlined">person</span> Jugador humano
              </div>
            </div>
          </div>
        </div>

        <!-- Rules -->
        <div class="section-block">
          <button class="settings-btn" @click="showRules = !showRules">
            <span class="material-symbols-outlined">tune</span>
            {{ showRules ? 'Ocultar reglas' : 'Configurar reglas' }}
          </button>
          <div v-if="showRules" class="rules-panel">
            <div class="rule-row">
              <span class="rule-label">Dinero inicial</span>
              <span class="rule-value">${{ startingCash }}</span>
            </div>
            <input v-model.number="startingCash" type="range" min="500" max="5000" step="100" class="range-input" />
            <div class="rule-row">
              <span class="rule-label">Salario (GO)</span>
              <input v-model.number="goSalary" type="number" min="0" step="50" class="small-input" />
            </div>
            <label class="toggle-row">
              <span>Dobles dan turno extra</span>
              <input type="checkbox" v-model="doublesGiveExtra" />
            </label>
            <label class="toggle-row">
              <span>Solo subastas</span>
              <input type="checkbox" v-model="auctionOnly" />
            </label>
          </div>
        </div>

        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

        <div class="action-row">
          <button class="reset-btn" @click="mode = 'join'">Unirse a mesa</button>
          <button class="start-btn" :disabled="creating" @click="createTable">
            <span class="material-symbols-outlined">add_circle</span>
            {{ creating ? 'Creando...' : 'CREAR MESA' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useMultiplayerStore } from '~/stores/multiplayerStore'
import { getApiBaseUrl } from '~/utils/env'
import { GAME_CONFIG } from '~/config/gameConfig'
import { enabledLocalScenarioSeedKeys } from '~/config/localScenarioSeeds'

const mpStore = useMultiplayerStore()

const mode = ref<'create' | 'join'>('create')
const playerName = ref('')
const joinCode = ref('')
const errorMsg = ref('')
const creating = ref(false)
const joining = ref(false)
const showRules = ref(false)
const slotCount = ref(2)

const startingCash = ref(1500)
const goSalary = ref(200)
const doublesGiveExtra = ref(true)
const auctionOnly = ref(false)

interface SlotDef { type: 'open' | 'bot_regular' | 'bot_difficult' }
const slots = reactive<SlotDef[]>([
  { type: 'open' },   // slot 0 = always creator (human)
  { type: 'bot_difficult' },
  { type: 'bot_regular' },
  { type: 'open' },
])

function setSlotCount(n: number) {
  slotCount.value = n
}

const API_BASE = getApiBaseUrl()

function isLocalGameUrl() {
  if (typeof window === 'undefined') return false
  return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(window.location.hostname)
}

function activeLocalScenarioSeeds() {
  if (!isLocalGameUrl()) return []
  return enabledLocalScenarioSeedKeys(new URLSearchParams(window.location.search))
}

function tokenModelForSlot(index: number) {
  return GAME_CONFIG.TOKEN_MODELS[index % GAME_CONFIG.TOKEN_MODELS.length]?.file ?? 'sombrero.glb'
}

async function createTable() {
  errorMsg.value = ''
  if (!playerName.value.trim()) {
    errorMsg.value = 'Ingresa tu nombre.'
    return
  }
  creating.value = true
  try {
    const slotsPayload = Array.from({ length: slotCount.value }, (_, i) => {
      const tokenModel = tokenModelForSlot(i)
      if (i === 0) return { type: 'human', name: playerName.value.trim(), tokenModel }
      const s = slots[i]
      if (s.type === 'open') return { type: 'open', name: '', tokenModel }
      const diff = s.type === 'bot_difficult' ? 'difficult' : 'regular'
      return { type: 'bot', difficulty: diff, name: s.type === 'bot_difficult' ? `Bot Difícil ${i + 1}` : `Bot Regular ${i + 1}`, tokenModel }
    })

    const res = await fetch(`${API_BASE}/api/v1/tables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creatorName: playerName.value.trim(),
        config: {
          startingCash: startingCash.value,
          goSalary: goSalary.value,
          doublesGiveExtraTurn: doublesGiveExtra.value,
          auctionOnly: auctionOnly.value,
          jailBailCost: 50,
          scenarioSeeds: activeLocalScenarioSeeds(),
        },
        slots: slotsPayload,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      errorMsg.value = text || 'Error al crear la mesa'
      return
    }

    const data = await res.json()
    mpStore.setConnection(data.tableId, data.playerId)
    navigateTo(`/multiplayer/game?tableId=${data.tableId}&playerId=${data.playerId}`)
  } catch (e) {
    errorMsg.value = 'No se pudo conectar al servidor'
    console.error(e)
  } finally {
    creating.value = false
  }
}

async function joinTable() {
  errorMsg.value = ''
  if (!playerName.value.trim()) {
    errorMsg.value = 'Ingresa tu nombre.'
    return
  }
  if (!joinCode.value.trim()) {
    errorMsg.value = 'Ingresa el código de la mesa.'
    return
  }
  joining.value = true
  try {
    const res = await fetch(`${API_BASE}/api/v1/tables/${joinCode.value.trim()}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName: playerName.value.trim() }),
    })

    if (!res.ok) {
      const text = await res.text()
      errorMsg.value = text || 'No se pudo unir a la mesa'
      return
    }

    const data = await res.json()
    mpStore.setConnection(joinCode.value.trim(), data.playerId)
    navigateTo(`/multiplayer/game?tableId=${joinCode.value.trim()}&playerId=${data.playerId}`)
  } catch (e) {
    errorMsg.value = 'No se pudo conectar al servidor'
    console.error(e)
  } finally {
    joining.value = false
  }
}
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@500;700&family=Hanken+Grotesk:wght@400;500;600&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1");

.lobby-page {
  min-height: 100vh;
  background: #11131c;
  color: #e1e1ef;
  font-family: "Hanken Grotesk", sans-serif;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.ambient-glow {
  position: fixed;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
}

.ambient-1 {
  top: -10%; right: -10%; width: 50%; height: 50%;
  background: rgba(0, 245, 155, 0.06);
  filter: blur(120px);
}

.ambient-2 {
  bottom: -10%; left: -10%; width: 50%; height: 50%;
  background: rgba(100, 3, 215, 0.05);
  filter: blur(120px);
}

.app-header {
  display: flex;
  align-items: center;
  padding: 12px 24px;
  background: rgba(17, 19, 28, 0.85);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(132, 149, 136, 0.08);
  position: relative;
  z-index: 10;
}

.header-left { display: flex; align-items: center; gap: 10px; }

.back-btn {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.6);
  border-radius: 8px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}
.back-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }

.header-logo { font-size: 26px; color: #00f59b; font-variation-settings: "FILL" 1; }
.header-brand {
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 19px;
  font-weight: 800;
  color: #e1e1ef;
}
.header-badge {
  font-family: "JetBrains Mono", monospace;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  background: rgba(0,245,155,0.12);
  color: #00e38f;
  border: 1px solid rgba(0,245,155,0.22);
  border-radius: 6px;
  text-transform: uppercase;
}

.page-body {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  overflow-y: auto;
  padding: 24px 16px;
  position: relative;
  z-index: 1;
}

.lobby-card {
  width: 100%;
  max-width: 620px;
  background: rgba(29, 31, 41, 0.7);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(132, 149, 136, 0.1);
  border-radius: 24px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: 0 32px 64px -12px rgba(0, 0, 0, 0.5);
}

.main-title {
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 24px;
  font-weight: 800;
  color: #e1e1ef;
  margin: 0;
}

.subtitle { color: #849588; font-size: 14px; margin: 4px 0 0; }

.section-block { display: flex; flex-direction: column; gap: 12px; }
.section-label {
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #849588;
}

.field-group { display: flex; flex-direction: column; gap: 4px; }
.field-label {
  font-family: "JetBrains Mono", monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(132,149,136,0.7);
  padding-left: 2px;
}
.field-input {
  background: rgba(17,19,28,0.6);
  border: 1px solid rgba(132,149,136,0.12);
  border-radius: 10px;
  padding: 10px 14px;
  color: #e1e1ef;
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}
.field-input:focus { border-color: #00f59b; }
.field-mono { font-family: "JetBrains Mono", monospace; letter-spacing: 0.08em; }

.select-wrapper { position: relative; }
.field-select { appearance: none; cursor: pointer; width: 100%; padding-right: 36px; }
.select-arrow {
  position: absolute;
  right: 10px; top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: rgba(132,149,136,0.5);
  font-size: 18px;
}

.player-count-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  background: rgba(25,27,36,0.8);
  padding: 6px;
  border-radius: 16px;
  border: 1px solid rgba(132,149,136,0.1);
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
.count-pill:hover:not(.disabled) { background: rgba(50,52,62,0.5); }
.count-pill.active { background: #00f59b; color: #003920; }
.count-pill.disabled { opacity: 0.3; cursor: not-allowed; }

.slots-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }

.slot-card {
  background: rgba(25,27,36,0.8);
  border: 1px solid rgba(132,149,136,0.1);
  border-radius: 14px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.slot-top { display: flex; align-items: center; gap: 8px; }
.slot-num {
  width: 28px; height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 14px;
  font-weight: 700;
}
.slot-accent-1 .slot-num { background: rgba(0,245,155,0.15); color: #00f59b; }
.slot-accent-2 .slot-num { background: rgba(215,3,87,0.15); color: #d70357; }
.slot-accent-3 .slot-num { background: rgba(255,209,101,0.15); color: #ffd165; }
.slot-accent-4 .slot-num { background: rgba(248,113,113,0.15); color: #f87171; }

.slot-you-badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: #00e38f;
  background: rgba(0,245,155,0.1);
  border: 1px solid rgba(0,245,155,0.2);
  border-radius: 4px;
  padding: 2px 6px;
}

.slot-type-label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgba(255,255,255,0.5);
  font-size: 12px;
  font-weight: 500;
}

.settings-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: 1px solid rgba(132,149,136,0.15);
  background: rgba(25,27,36,0.6);
  color: #849588;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  align-self: flex-start;
}
.settings-btn:hover { color: #00e38f; border-color: rgba(0,245,155,0.3); }

.rules-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  background: rgba(25,27,36,0.5);
  border: 1px solid rgba(132,149,136,0.08);
  border-radius: 12px;
}
.rule-row { display: flex; align-items: center; justify-content: space-between; }
.rule-label { color: #e1e1ef; font-size: 13px; font-weight: 600; }
.rule-value { color: #00e38f; font-family: "JetBrains Mono", monospace; font-weight: 700; }
.small-input {
  width: 80px;
  background: rgba(17,19,28,0.6);
  border: 1px solid rgba(132,149,136,0.15);
  border-radius: 8px;
  padding: 6px 10px;
  color: #e1e1ef;
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 14px;
  font-weight: 700;
  text-align: right;
  outline: none;
}
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  color: #e1e1ef;
  font-size: 13px;
  font-weight: 600;
}
.range-input {
  width: 100%;
  height: 6px;
  appearance: none;
  background: rgba(50,52,62,0.8);
  border-radius: 9999px;
  cursor: pointer;
}
.range-input::-webkit-slider-thumb {
  appearance: none;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: #00f59b;
}

.error-msg {
  color: #f87171;
  font-size: 13px;
  text-align: center;
  padding: 10px;
  background: rgba(248,113,113,0.08);
  border: 1px solid rgba(248,113,113,0.2);
  border-radius: 10px;
  margin: 0;
}

.action-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.reset-btn {
  padding: 12px 18px;
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
  border-radius: 12px;
}
.reset-btn:hover { color: #00e38f; }

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
.start-btn:hover:not(:disabled) { transform: scale(1.03); }
.start-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.material-symbols-outlined {
  font-variation-settings: "FILL" 0, "wght" 400;
  font-size: 18px;
  line-height: 1;
}

@media (max-width: 600px) {
  .slots-grid { grid-template-columns: 1fr; }
  .lobby-card { padding: 20px 16px; }
  .main-title { font-size: 20px; }
}
</style>
