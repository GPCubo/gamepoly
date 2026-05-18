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

  <!-- Dados 2D -->
  <div class="dado-wrapper" v-if="store.isDiceVisible" :class="{ sliding: isSliding }">
    <div class="dado-titulo">Total: {{ store.diceTotal }} · Casilla: {{ currentPosition }}</div>
    <div class="dados-row">
      <div class="dado-pequeño" v-for="(value, idx) in store.diceValues" :key="idx">
        <span
          v-for="(pos, i) in facePositions[value]"
          :key="i"
          class="circulo"
          :style="pos"
        ></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '~/stores/gameStore';
import { ref } from 'vue';

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

const isSliding = ref(false);

const facePositions: Record<number, Record<string, string>[]> = {
  1: [{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }],
  2: [{ top: '15%', right: '15%' }, { bottom: '15%', left: '15%' }],
  3: [{ top: '15%', right: '15%' }, { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }, { bottom: '15%', left: '15%' }],
  4: [{ top: '15%', left: '15%' }, { top: '15%', right: '15%' }, { bottom: '15%', left: '15%' }, { bottom: '15%', right: '15%' }],
  5: [{ top: '15%', left: '15%' }, { top: '15%', right: '15%' }, { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }, { bottom: '15%', left: '15%' }, { bottom: '15%', right: '15%' }],
  6: [{ top: '15%', left: '15%' }, { top: '50%', left: '15%', transform: 'translateY(-50%)' }, { bottom: '15%', left: '15%' }, { top: '15%', right: '15%' }, { top: '50%', right: '15%', transform: 'translateY(-50%)' }, { bottom: '15%', right: '15%' }],
};

async function onRollClick() {
  store.showDice();
  isSliding.value = false;
  
  await new Promise((resolve) => {
    setTimeout(() => {
      // Empezar animación de caída
      isSliding.value = true;
      
      setTimeout(() => {
        store.finishDiceRoll();
        setTimeout(() => {
          const result = store.diceTotal;
          store.hideDice();
          isSliding.value = false;
          emit('roll', result);
        }, 500); // tiempo para ver el resultado
      }, 500); // duración de la animación slideDown
    }, 1500); // tiempo de "rodar"
  });
}
</script>

<style scoped>
.dado-wrapper {
  background: rgba(0, 0, 0, 0.8);
  border-radius: 20px;
  color: #4ade80;
  font-family: monospace;
  font-size: 12px;
  border: 1px solid rgba(74, 222, 128, 0.2);
  padding: 10px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 150;
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: auto;
}

.dados-row {
  display: flex;
  flex-direction: row;
  gap: 10px;
  align-items: center;
  justify-content: center;
}

.dado-titulo {
  font-size: 11px;
  opacity: 0.9;
}

.dado-pequeño {
  width: 40px;
  height: 40px;
  background: white;
  border: 1px solid #333;
  border-radius: 6px;
  position: relative;
}

.circulo {
  width: 8px;
  height: 8px;
  background: #333;
  border-radius: 50%;
  position: absolute;
}

.sliding {
  animation: slideDown 0.5s ease-in forwards;
}

@keyframes slideDown {
  from {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  to {
    opacity: 0;
    transform: translateX(-50%) translateY(100px);
  }
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
