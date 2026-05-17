<template>
  <div class="overlay-container">
    <div class="status-badge">
      Casilla Actual: {{ currentPosition }} | Estado: {{ store.statusMessage }}
    </div>

    <div class="action-buttons">
      <button
        @click="onRollClick"
        :disabled="isMoving || store.isDiceRolling"
        class="action-btn roll-btn"
        :class="{ 'disabled-btn': isMoving || store.isDiceRolling }"
      >
        {{ store.isDiceRolling ? "Rodando..." : isMoving ? "Moviendo..." : "🎲 Tirar Dados" }}
      </button>

      <button
        @click="store.toggleCameraFollow()"
        class="action-btn cam-btn"
        :class="{ 'cam-active': store.isCamFollowActive }"
      >
        {{ store.isCamFollowActive ? "🎥 Cámara: Fija" : "🎥 Cámara: Libre" }}
      </button>
    </div>
  </div>

  <!-- Dado 2D Overlay -->
  <div class="dado-overlay" v-if="store.isDiceVisible">
    <div class="dado-3d" :class="{ rolling: store.isDiceRolling }">
      <div class="face face-1" :class="{ active: store.diceValue === 1 }">
        <span class="dot" style="grid-area: 2 / 2"></span>
      </div>
      <div class="face face-2" :class="{ active: store.diceValue === 2 }">
        <span class="dot" style="grid-area: 1 / 1"></span>
        <span class="dot" style="grid-area: 3 / 3"></span>
      </div>
      <div class="face face-3" :class="{ active: store.diceValue === 3 }">
        <span class="dot" style="grid-area: 1 / 1"></span>
        <span class="dot" style="grid-area: 2 / 2"></span>
        <span class="dot" style="grid-area: 3 / 3"></span>
      </div>
      <div class="face face-4" :class="{ active: store.diceValue === 4 }">
        <span class="dot" style="grid-area: 1 / 1"></span>
        <span class="dot" style="grid-area: 1 / 3"></span>
        <span class="dot" style="grid-area: 3 / 1"></span>
        <span class="dot" style="grid-area: 3 / 3"></span>
      </div>
      <div class="face face-5" :class="{ active: store.diceValue === 5 }">
        <span class="dot" style="grid-area: 1 / 1"></span>
        <span class="dot" style="grid-area: 1 / 3"></span>
        <span class="dot" style="grid-area: 2 / 2"></span>
        <span class="dot" style="grid-area: 3 / 1"></span>
        <span class="dot" style="grid-area: 3 / 3"></span>
      </div>
      <div class="face face-6" :class="{ active: store.diceValue === 6 }">
        <span class="dot" style="grid-area: 1 / 1"></span>
        <span class="dot" style="grid-area: 1 / 3"></span>
        <span class="dot" style="grid-area: 2 / 1"></span>
        <span class="dot" style="grid-area: 2 / 3"></span>
        <span class="dot" style="grid-area: 3 / 1"></span>
        <span class="dot" style="grid-area: 3 / 3"></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '~/stores/gameStore';

const store = useGameStore();

// Recibimos de forma estricta los estados del store e index.vue
const props = defineProps<{
  currentPosition: number;
  isMoving: boolean;
}>();

// Avisamos al index.vue cuándo se ejecutan los clicks
const emit = defineEmits<{
  (e: 'roll', value: number): void;
  (e: 'toggle-camera'): void;
}>();

async function onRollClick() {
  store.showDice();
  await new Promise((resolve) => {
    setTimeout(() => {
      store.finishDiceRoll();
      setTimeout(() => {
        const result = store.diceValue;
        store.hideDice();
        emit('roll', result);
      }, 600);
    }, 1500);
  });
}
</script>

<style scoped>
.dado-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  pointer-events: auto;
}

.dado-3d {
  width: 100px;
  height: 100px;
  position: relative;
  transform-style: preserve-3d;
}

.dado-3d.rolling {
  animation: roll 0.1s linear infinite;
}

@keyframes roll {
  0%   { transform: rotateX(0deg) rotateY(0deg); }
  25%  { transform: rotateX(90deg) rotateY(180deg); }
  50%  { transform: rotateX(180deg) rotateY(360deg); }
  75%  { transform: rotateX(270deg) rotateY(540deg); }
  100% { transform: rotateX(360deg) rotateY(720deg); }
}

.face {
  position: absolute;
  width: 100px;
  height: 100px;
  background: white;
  border: 2px solid #333;
  border-radius: 10px;
  display: none;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  padding: 10px;
}

.face.active {
  display: grid;
}

.face-1 { transform: translateZ(50px); }
.face-2 { transform: rotateY(90deg) translateZ(50px); }
.face-3 { transform: rotateY(180deg) translateZ(50px); }
.face-4 { transform: rotateY(-90deg) translateZ(50px); }
.face-5 { transform: rotateX(90deg) translateZ(50px); }
.face-6 { transform: rotateX(-90deg) translateZ(50px); }

.dot {
  width: 16px;
  height: 16px;
  background: #333;
  border-radius: 50%;
  justify-self: center;
  align-self: center;
}

.overlay-container {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  pointer-events: none;
}

.status-badge {
  background: rgba(0, 0, 0, 0.8);
  padding: 8px 16px;
  border-radius: 20px;
  color: #4ade80;
  font-family: monospace;
  font-size: 12px;
  border: 1px solid rgba(74, 222, 128, 0.2);
  pointer-events: auto;
}

.action-buttons {
  display: flex;
  gap: 12px;
  pointer-events: auto;
}

.action-btn {
  color: white;
  border: none;
  padding: 14px 24px;
  font-size: 16px;
  font-weight: bold;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.roll-btn {
  background: #10b981;
  padding: 14px 32px;
  font-size: 18px;
  box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.4);
}

.roll-btn:hover:not(.disabled-btn) {
  background: #059669;
  transform: translateY(-2px);
}

.cam-btn {
  background: #4b5563;
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.2);
}

.cam-btn:hover:not(.cam-active) {
  background: #374151;
  transform: translateY(-2px);
}

.cam-active {
  background: #3b82f6;
  box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.4);
}

.disabled-btn {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}
</style>
