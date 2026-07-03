<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import Dice3D from "./Dice3D.vue";

const props = withDefaults(
  defineProps<{
    size?: number;
    /** Auto-roll interval in ms. Set to 0 to disable. */
    autoRollMs?: number;
  }>(),
  { size: 84, autoRollMs: 2200 },
);

const diceRefs = ref<(InstanceType<typeof Dice3D> | null)[]>([]);

function rollAll() {
  diceRefs.value.forEach((d) => d?.roll());
}

let intervalId: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  if (props.autoRollMs) {
    intervalId = setInterval(rollAll, props.autoRollMs);
  }
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});
</script>

<template>
  <div class="dice-tray">
    <Dice3D
      v-for="i in 2"
      :key="i"
      :ref="(el) => { diceRefs[i - 1] = el as InstanceType<typeof Dice3D> | null }"
      :size="size"
      manual
      @trigger="rollAll"
    />
  </div>
</template>

<style scoped>
.dice-tray {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}
</style>
