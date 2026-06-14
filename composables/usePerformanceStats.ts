import { computed, onUnmounted, ref } from 'vue'

export function usePerformanceStats() {
  const fps = ref(0)
  let frameHandle: number | null = null
  let lastSampleAt = 0
  let frames = 0

  function tick(now: number) {
    if (lastSampleAt === 0) lastSampleAt = now
    frames += 1
    const elapsed = now - lastSampleAt
    if (elapsed >= 1000) {
      fps.value = Math.round((frames * 1000) / elapsed)
      frames = 0
      lastSampleAt = now
    }
    frameHandle = requestAnimationFrame(tick)
  }

  function start() {
    if (typeof window === 'undefined' || frameHandle !== null) return
    frameHandle = requestAnimationFrame(tick)
  }

  function stop() {
    if (frameHandle !== null) {
      cancelAnimationFrame(frameHandle)
      frameHandle = null
    }
  }

  onUnmounted(stop)

  return {
    fps: computed(() => fps.value),
    start,
    stop,
  }
}
