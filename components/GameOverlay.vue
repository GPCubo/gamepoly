<template>
  <div class="overlay-container">
    <div class="status-badge">
      Casilla Actual: {{ currentPosition }} | Estado: {{ statusMessage }}
    </div>

    <div class="action-buttons">
      <button
        @click="$emit('roll')"
        :disabled="isMoving || isRolling"
        class="action-btn roll-btn"
        :class="{ 'disabled-btn': isMoving || isRolling }"
      >
        {{
          isRolling ? "Rodando..." : isMoving ? "Moviendo..." : "🎲 Tirar Dados"
        }}
      </button>

      <button
        @click="$emit('toggle-camera')"
        class="action-btn cam-btn"
        :class="{ 'cam-active': isCamFollowActive }"
      >
        {{ isCamFollowActive ? "🎥 Cámara: Siguiendo" : "🎥 Cámara: Libre" }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
// Recibimos de forma estricta los estados del store e index.vue
defineProps<{
  currentPosition: number;
  statusMessage: string;
  isMoving: boolean;
  isRolling: boolean;
  isCamFollowActive: boolean;
}>();

// Avisamos al index.vue cuándo se ejecutan los clicks
defineEmits<{
  (e: "roll"): void;
  (e: "toggle-camera"): void;
}>();
</script>

<style scoped>
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
  pointer-events: none; /* Crucial: permite clickear el 3D a través del contenedor */
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
