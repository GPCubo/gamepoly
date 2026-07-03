<script setup lang="ts">
import { computed, ref } from "vue";

type DiceValue = 1 | 2 | 3 | 4 | 5 | 6;

const FACE_TRANSFORMS: Record<DiceValue, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: -90 },
  3: { x: 0, y: 180 },
  4: { x: 0, y: 90 },
  5: { x: -90, y: 0 },
  6: { x: 90, y: 0 },
};

const PIP_POSITIONS: Record<DiceValue, number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

const props = withDefaults(
  defineProps<{
    size?: number;
    /** When true, clicking emits "trigger" instead of rolling itself. */
    manual?: boolean;
  }>(),
  { size: 88, manual: false },
);

const emit = defineEmits<{
  (e: "roll", value: DiceValue): void;
  (e: "trigger"): void;
}>();

const value = ref<DiceValue>(1);
const spin = ref({ x: -20, y: 24 });
const rolling = ref(false);
let rollingLock = false;

const faces = computed(() => {
  const half = props.size / 2;
  return ([1, 2, 3, 4, 5, 6] as DiceValue[]).map((v) => {
    const transform =
      v === 1 ? `rotateY(0deg) translateZ(${half}px)`
      : v === 2 ? `rotateY(90deg) translateZ(${half}px)`
      : v === 3 ? `rotateY(180deg) translateZ(${half}px)`
      : v === 4 ? `rotateY(-90deg) translateZ(${half}px)`
      : v === 5 ? `rotateX(90deg) translateZ(${half}px)`
      : `rotateX(-90deg) translateZ(${half}px)`;
    return { v, t: transform, pips: PIP_POSITIONS[v] };
  });
});

function roll() {
  if (rollingLock) return;
  rollingLock = true;
  rolling.value = true;
  const next = (Math.floor(Math.random() * 6) + 1) as DiceValue;
  const target = FACE_TRANSFORMS[next];
  const turns = 2 + Math.floor(Math.random() * 2);
  spin.value = { x: target.x + 360 * turns, y: target.y + 360 * turns };
  window.setTimeout(() => {
    value.value = next;
    rolling.value = false;
    rollingLock = false;
    emit("roll", next);
  }, 900);
}

function handleClick() {
  if (props.manual) {
    emit("trigger");
  } else {
    roll();
  }
}

defineExpose({ roll });
</script>

<template>
  <button
    type="button"
    class="dice3d"
    :style="{ width: `${size}px`, height: `${size}px`, perspective: `${size * 5}px` }"
    :aria-label="`Roll the dice. Current value: ${value}`"
    @click="handleClick"
  >
    <span class="dice3d-glow" aria-hidden="true" />
    <div
      class="dice3d-cube"
      :style="{
        transform: `rotateX(${spin.x}deg) rotateY(${spin.y}deg)`,
        transition: rolling
          ? 'transform 0.9s cubic-bezier(0.18, 0.9, 0.28, 1.1)'
          : 'transform 0.4s ease-out',
      }"
    >
      <div v-for="f in faces" :key="f.v" class="dice3d-face" :style="{ transform: f.t }">
        <span
          v-for="slot in 9"
          :key="slot"
          class="dice3d-pip"
          :class="{ 'is-active': f.pips.includes(slot) }"
        />
      </div>
    </div>
  </button>
</template>

<style scoped>
.dice3d {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  cursor: pointer;
  border: 0;
  background: none;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.15s ease;
}

.dice3d:active {
  transform: scale(0.94);
}

.dice3d-glow {
  position: absolute;
  inset: 12%;
  z-index: -1;
  border-radius: 50%;
  background: rgba(0, 255, 157, 0.38);
  filter: blur(16px);
  opacity: 0.55;
  transition: opacity 0.25s ease;
}

.dice3d:hover .dice3d-glow {
  opacity: 1;
}

.dice3d-cube {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
}

.dice3d-face {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  place-items: center;
  gap: 2px;
  padding: 15%;
  border-radius: 20%;
  border: 1px solid rgba(0, 255, 157, 0.35);
  background: rgba(22, 31, 39, 0.95);
  box-shadow: inset 0 0 14px rgba(0, 0, 0, 0.4);
  backface-visibility: hidden;
}

.dice3d-pip {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  opacity: 0;
  background: #00ff9d;
  box-shadow: 0 0 6px rgba(0, 255, 157, 0.7);
  transition: opacity 0.2s ease;
}

.dice3d-pip.is-active {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .dice3d-cube {
    transition: none !important;
  }
}
</style>
