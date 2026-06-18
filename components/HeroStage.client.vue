<template>
  <div
    ref="heroStageRef"
    class="hero-stage"
    @pointerdown="startHeroDrag"
    @pointermove="updateHeroDrag"
    @pointerup="endHeroDrag"
    @pointerleave="endHeroDrag"
    @pointercancel="endHeroDrag"
  >
    <Transition name="models-reveal">
      <div v-if="modelsLoading" class="models-skeleton" aria-hidden="true">
        <div class="models-shimmer" />
        <div class="models-orb models-orb-board" />
        <div class="models-orb models-orb-hat" />
        <div class="models-orb models-orb-dedal" />
      </div>
    </Transition>
    <div class="stage-grid" />
    <div class="stage-orbit orbit-a" />
    <div class="stage-orbit orbit-b" />
    <TresCanvas
      class="hero-canvas"
      clear-color="#11131c"
      alpha
      shadows
      @loop="onHeroRenderTick"
    >
      <TresPerspectiveCamera
        :position="[4.8, 5.1, 6.8]"
        :fov="42"
        :near="0.1"
        :far="120"
      />
      <OrbitControls
        :target="[0, 0, 0]"
        :enable-damping="true"
        :enable-zoom="false"
        :enable-pan="false"
        :enable-rotate="false"
      />
      <TresAmbientLight :intensity="1.8" />
      <TresDirectionalLight
        :position="[5, 8, 6]"
        :intensity="3"
        cast-shadow
      />
      <TresPointLight
        :position="[-4, 3, 4]"
        :intensity="1.2"
        color="#00f59b"
      />
      <TresGroup :rotation="[heroRigPitch, heroRigYaw, heroRigRoll]">
        <primitive
          v-if="heroBoardScene"
          :object="heroBoardScene"
          :position="[-0.2, -0.82, 0]"
          :rotation="[-0.34, 0.48, 0.08]"
          :scale="0.68"
        />
        <primitive
          v-if="heroHatScene"
          :object="heroHatScene"
          :position="[1.08, 0.98, 0.5]"
          :rotation="[0.08, -0.62, 0.18]"
          :scale="1.9"
        />
        <primitive
          v-if="heroDedalScene"
          :object="heroDedalScene"
          :position="[-1.04, 0.88, 0.18]"
          :rotation="[0.04, 0.55, -0.12]"
          :scale="1.82"
        />
      </TresGroup>
    </TresCanvas>
    <div class="stage-caption">
      <span class="material-symbols-outlined">view_in_ar</span>
      {{ t("landing.hero.caption") }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef } from "vue";
import { TresCanvas } from "@tresjs/core";
import { OrbitControls } from "@tresjs/cientos";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { Group } from "three";
import { useI18n } from "~/composables/useI18n";

const { t } = useI18n();

const modelsLoading = ref(true);
const heroBoardScene = shallowRef<Group | null>(null);
const heroHatScene = shallowRef<Group | null>(null);
const heroDedalScene = shallowRef<Group | null>(null);
const heroStageRef = ref<HTMLElement | null>(null);
const heroRigYaw = ref(0);
const heroRigPitch = ref(0);
const heroRigRoll = ref(0);

let heroDragging = false;
let heroDragStartX = 0;
let heroDragStartY = 0;
let heroDragStartYaw = 0;
let heroDragStartPitch = 0;
let heroYawVelocity = 0;
let heroPitchVelocity = 0;
let heroRollVelocity = 0;
let stageVisible = true;
let visibilityObserver: IntersectionObserver | null = null;

onMounted(() => {
  void loadHeroModels();

  visibilityObserver = new IntersectionObserver(
    ([entry]) => { stageVisible = entry.isIntersecting; },
    { threshold: 0.1 },
  );
  if (heroStageRef.value) visibilityObserver.observe(heroStageRef.value);
});

onUnmounted(() => {
  visibilityObserver?.disconnect();
});

async function loadHeroModels() {
  try {
    const loader = new GLTFLoader();
    const [board, hat, dedal] = await Promise.all([
      loader.loadAsync("/models/tablero.glb"),
      loader.loadAsync("/models/users/sombrero.glb"),
      loader.loadAsync("/models/users/dedal.glb"),
    ]);

    for (const scene of [board.scene, hat.scene, dedal.scene]) {
      scene.traverse((child) => {
        child.castShadow = true;
        child.receiveShadow = true;
      });
    }

    heroBoardScene.value = board.scene;
    heroHatScene.value = hat.scene;
    heroDedalScene.value = dedal.scene;
  } catch (error) {
    console.error("No se pudieron cargar los modelos de la landing", error);
  } finally {
    modelsLoading.value = false;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function startHeroDrag(event: PointerEvent) {
  heroDragging = true;
  heroDragStartX = event.clientX;
  heroDragStartY = event.clientY;
  heroDragStartYaw = heroRigYaw.value;
  heroDragStartPitch = heroRigPitch.value;
  heroYawVelocity = 0;
  heroPitchVelocity = 0;
  heroRollVelocity = 0;
  heroStageRef.value?.setPointerCapture?.(event.pointerId);
}

function updateHeroDrag(event: PointerEvent) {
  if (!heroDragging) return;
  const nextYaw = clamp(
    heroDragStartYaw + (event.clientX - heroDragStartX) * 0.009,
    -Math.PI * 1.35,
    Math.PI * 1.35,
  );
  const nextPitch = clamp(
    heroDragStartPitch + (event.clientY - heroDragStartY) * 0.0055,
    -0.78,
    0.78,
  );
  const nextRoll = clamp(-nextYaw * 0.12, -0.38, 0.38);
  heroYawVelocity = (nextYaw - heroRigYaw.value) * 18;
  heroPitchVelocity = (nextPitch - heroRigPitch.value) * 18;
  heroRollVelocity = (nextRoll - heroRigRoll.value) * 18;
  heroRigYaw.value = nextYaw;
  heroRigPitch.value = nextPitch;
  heroRigRoll.value = nextRoll;
}

function endHeroDrag(event: PointerEvent) {
  if (!heroDragging) return;
  heroDragging = false;
  heroStageRef.value?.releasePointerCapture?.(event.pointerId);
}

function onHeroRenderTick({ elapsed, delta }: { elapsed: number; delta: number }) {
  if (!stageVisible || document.hidden) return;

  const dt = Math.min(delta || 0.016, 0.033);

  if (!heroDragging) {
    const stiffness = 3.2;
    const damping = 0.82;
    const dampingFactor = Math.exp(-damping * dt);

    heroYawVelocity += -heroRigYaw.value * stiffness * dt;
    heroYawVelocity *= dampingFactor;
    heroRigYaw.value += heroYawVelocity * dt;

    heroPitchVelocity += -heroRigPitch.value * stiffness * dt;
    heroPitchVelocity *= dampingFactor;
    heroRigPitch.value += heroPitchVelocity * dt;

    heroRollVelocity += -heroRigRoll.value * 3.8 * dt;
    heroRollVelocity *= Math.exp(-0.95 * dt);
    heroRigRoll.value += heroRollVelocity * dt;

    if (Math.abs(heroRigYaw.value) < 0.001 && Math.abs(heroYawVelocity) < 0.001) {
      heroRigYaw.value = 0;
      heroYawVelocity = 0;
    }
    if (Math.abs(heroRigPitch.value) < 0.001 && Math.abs(heroPitchVelocity) < 0.001) {
      heroRigPitch.value = 0;
      heroPitchVelocity = 0;
    }
  }

  if (heroBoardScene.value) {
    heroBoardScene.value.rotation.y = 0.48 + Math.sin(elapsed * 0.28) * 0.12;
    heroBoardScene.value.position.y = -0.8 + Math.sin(elapsed * 0.9) * 0.04;
  }
  if (heroHatScene.value) {
    heroHatScene.value.rotation.y = -0.62 + elapsed * 0.65;
    heroHatScene.value.rotation.z = 0.18 + Math.sin(elapsed * 1.4) * 0.12;
    heroHatScene.value.position.y = 0.84 + Math.sin(elapsed * 1.7) * 0.12;
  }
  if (heroDedalScene.value) {
    heroDedalScene.value.rotation.y = 0.55 - elapsed * 0.55;
    heroDedalScene.value.rotation.z = -0.12 + Math.sin(elapsed * 1.25) * 0.1;
    heroDedalScene.value.position.y = 0.88 + Math.sin(elapsed * 1.55 + 1.1) * 0.11;
  }
}
</script>

<style scoped>
.material-symbols-outlined {
  font-variation-settings:
    "FILL" 0,
    "wght" 400,
    "GRAD" 0,
    "opsz" 24;
}

.hero-stage {
  position: relative;
  min-height: clamp(360px, 52vw, 600px);
  border-radius: 22px;
  overflow: hidden;
  isolation: isolate;
  cursor: grab;
  touch-action: none;
  background:
    radial-gradient(circle at 58% 42%, rgba(0, 245, 155, 0.13), transparent 38%),
    rgba(8, 13, 22, 0.68);
  border: 1px solid rgba(148, 163, 184, 0.08);
}

.hero-stage:active {
  cursor: grabbing;
}

.stage-grid {
  position: absolute;
  inset: 6%;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 22px;
  background:
    linear-gradient(rgba(148, 163, 184, 0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.07) 1px, transparent 1px),
    radial-gradient(circle at 62% 42%, rgba(0, 245, 155, 0.16), transparent 44%),
    rgba(15, 23, 42, 0.22);
  background-size: 34px 34px, 34px 34px, auto, auto;
  transform: perspective(900px) rotateX(58deg) rotateZ(-9deg);
  animation: gridDrift 9s ease-in-out infinite alternate;
}

.stage-orbit {
  position: absolute;
  border: 1px solid rgba(0, 245, 155, 0.22);
  border-radius: 50%;
  transform: rotateX(62deg);
  animation: orbitSpin 16s linear infinite;
}

.orbit-a {
  inset: 15% 9%;
}

.orbit-b {
  inset: 24% 20%;
  border-color: rgba(255, 209, 101, 0.18);
  animation-duration: 11s;
  animation-direction: reverse;
}

.hero-canvas {
  position: absolute;
  inset: -8% -6% -4% -10%;
  z-index: 2;
  width: 116%;
  height: 116%;
}

.stage-caption {
  position: absolute;
  right: 18px;
  bottom: 18px;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 11px;
  border: 1px solid rgba(248, 250, 252, 0.13);
  border-radius: 8px;
  color: rgba(248, 250, 252, 0.78);
  background: rgba(10, 16, 25, 0.72);
  backdrop-filter: blur(10px);
  font-size: 12px;
  font-weight: 800;
}

@keyframes gridDrift {
  from { transform: perspective(900px) rotateX(58deg) rotateZ(-9deg) translateY(0); }
  to { transform: perspective(900px) rotateX(58deg) rotateZ(-5deg) translateY(14px); }
}

@keyframes orbitSpin {
  to { transform: rotateX(62deg) rotateZ(360deg); }
}

@media (max-width: 980px) {
  .hero-stage { min-height: 420px; }
}

@media (max-width: 600px) {
  .hero-stage { width: 100%; min-height: 320px; right: 0; }
  .hero-canvas { inset: -4% -24% -8% -26%; width: 150%; height: 116%; }
  .stage-caption { right: 12px; bottom: 12px; }
}

.models-skeleton {
  position: absolute;
  inset: 0;
  z-index: 3;
  border-radius: 22px;
  pointer-events: none;
}

.models-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 30%,
    rgba(0, 245, 155, 0.07) 50%,
    rgba(103, 232, 249, 0.05) 55%,
    transparent 70%
  );
  background-size: 250% 100%;
  animation: modelsShimmer 2s ease-in-out infinite;
}

.models-orb {
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(148, 163, 184, 0.1), rgba(148, 163, 184, 0.03));
  animation: orbPulse 2.2s ease-in-out infinite;
}

.models-orb-board {
  width: 44%;
  aspect-ratio: 1;
  bottom: 8%;
  left: 8%;
  border-radius: 12px;
  animation-delay: 0s;
}

.models-orb-hat {
  width: 22%;
  aspect-ratio: 1;
  top: 14%;
  right: 22%;
  animation-delay: 0.3s;
}

.models-orb-dedal {
  width: 18%;
  aspect-ratio: 1;
  top: 18%;
  left: 20%;
  animation-delay: 0.6s;
}

.models-reveal-leave-active {
  transition: opacity 0.5s ease, filter 0.5s ease;
}

.models-reveal-leave-to {
  opacity: 0;
  filter: blur(8px);
}

@keyframes modelsShimmer {
  0% { background-position: 150% center; }
  100% { background-position: -50% center; }
}

@keyframes orbPulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.9; transform: scale(1.05); }
}

@media (prefers-reduced-motion: reduce) {
  .stage-grid, .stage-orbit, .models-shimmer, .skeleton-shimmer { animation: none; }
}
</style>
