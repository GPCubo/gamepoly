<template>
  <div class="winner-backdrop" @keydown.stop @click.stop>
    <div class="winner-card">
      <div class="confetti-row">🎉 🏆 🎉</div>
      <p class="winner-label">¡GANADOR!</p>
      <h1 class="winner-name">{{ player.name }}</h1>
      <p class="winner-token">{{ tokenIcon }}</p>
      <p class="winner-cash">con ${{ player.cash.toLocaleString() }}</p>
      <button
        ref="newGameBtnRef"
        class="new-game-btn"
        tabindex="0"
        @click.stop="onNewGameClick"
        @keydown.enter.stop
        @keydown.space.stop
      >
        Nueva partida
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, nextTick } from "vue";
import { GAME_CONFIG } from "~/config/gameConfig";
import type { PlayerState } from "~/stores/gameStore";

const props = defineProps<{ player: PlayerState }>();

const newGameBtnRef = ref<HTMLElement | null>(null);

const tokenIcon = computed(
  () => GAME_CONFIG.TOKEN_MODELS.find((t) => t.file === props.player.tokenModel)?.icon ?? "🎩",
);

onMounted(() => {
  nextTick(() => newGameBtnRef.value?.focus());
});

function onNewGameClick() {
  navigateTo("/");
}
</script>

<style scoped>
.winner-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 400;
  backdrop-filter: blur(8px);
}

.winner-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  background: #0d0d1a;
  border: 1px solid rgba(74, 222, 128, 0.4);
  border-radius: 24px;
  padding: 40px 56px;
  box-shadow:
    0 0 80px rgba(74, 222, 128, 0.15),
    0 40px 80px rgba(0, 0, 0, 0.8);
  font-family: monospace;
  text-align: center;
}

.confetti-row {
  font-size: 28px;
  letter-spacing: 8px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.winner-label {
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #f59e0b;
  margin: 0;
}

.winner-name {
  font-size: 36px;
  color: #4ade80;
  margin: 0;
}

.winner-token {
  font-size: 48px;
  margin: 0;
  line-height: 1;
}

.winner-cash {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

.new-game-btn {
  margin-top: 16px;
  padding: 14px 40px;
  border-radius: 14px;
  border: none;
  background: #10b981;
  color: white;
  font-family: monospace;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4);
  transition: all 0.2s;
}

.new-game-btn:hover {
  background: #059669;
  transform: translateY(-2px);
}

.new-game-btn:focus-visible {
  outline: 2px solid #4ade80;
  outline-offset: 3px;
  box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4), 0 0 0 4px rgba(74, 222, 128, 0.25);
}
</style>
