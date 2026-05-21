<template>
  <div
    style="
      width: 100vw;
      height: 100vh;
      background-color: #1a1a2e;
      margin: 0;
      padding: 0;
      overflow: hidden;
      position: relative;
    "
  >
    <ClientOnly>
      <TresCanvas
        shadows
        clear-color="#1a1a2e"
        style="width: 100%; height: 100%"
        @loop="onRenderTick"
      >
        <TresPerspectiveCamera
          ref="cameraRef"
          :position="[12, 15, 12]"
          :fov="45"
          :near="0.1"
          :far="1000"
        />
        <OrbitControls
          ref="controlsRef"
          :enable-damping="true"
          :target="[0, 0, 0]"
        />
        <TresAmbientLight :intensity="1.8" />
        <TresDirectionalLight
          :position="[10, 20, 10]"
          :intensity="2.0"
          cast-shadow
        />
        <primitive
          v-if="tableroScene"
          :object="tableroScene"
          :position="[0, 0, 0]"
          :scale="1.0"
        />
        <template v-for="(scene, idx) in playerScenes" :key="idx">
          <primitive
            v-if="scene"
            :object="scene"
            :position="[
              displayPositions[idx]?.x ?? 0,
              displayPositions[idx]?.y ?? 0,
              displayPositions[idx]?.z ?? 0,
            ]"
            :scale="displayScales[idx] ?? 1"
          />
        </template>
        <TresGridHelper :args="[30, 30, '#ff0055', '#444444']" />
      </TresCanvas>
    </ClientOnly>

    <GameOverlay
      :current-position="store.casillaActual"
      :is-moving="store.isAnyMoving"
      @roll="onDiceRoll"
      @toggle-camera="store.toggleCameraFollow()"
      @next-turn="onNextTurn"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, shallowRef, reactive, watch, ref } from "vue";
import { TresCanvas } from "@tresjs/core";
import { OrbitControls } from "@tresjs/cientos";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useGameStore } from "~/stores/gameStore";
import { useBoardGeometry } from "~/composables/useBoardGeometry";
import { usePieceAnimation } from "~/composables/usePieceAnimation";
import { useCameraOrbit, CAM_LERP } from "~/composables/useCameraOrbit";
import { GAME_CONFIG } from "~/config/gameConfig";
import GameOverlay from "~/components/GameOverlay.vue";
import type { Group } from "three";

const store = useGameStore();

if (store.players.length === 0) {
  navigateTo("/");
}

const tableroScene = shallowRef<Group | null>(null);
const playerScenes = shallowRef<(Group | null)[]>([]);

const cameraRef = shallowRef();
const controlsRef = shallowRef();

const playerCount = store.players.length;
const displayPositions = reactive<{ x: number; y: number; z: number }[]>(
  Array.from({ length: playerCount }, () => ({ x: 0, y: 0, z: 0 })),
);
const displayScales = ref<number[]>(
  Array(playerCount).fill(GAME_CONFIG.DEFAULT_SCALE),
);

const {
  init,
  startHop,
  startGrow,
  cancelGrow,
  tick,
  getCurrentPosition,
  getCurrentScale,
  isAnimating,
  setPosition,
} = usePieceAnimation();

if (playerCount > 0) {
  init(playerCount);
}

const { getCameraPosition } = useCameraOrbit();
const { getCasillaCoordinates } = useBoardGeometry();

const prevAnimating: boolean[] = Array(playerCount).fill(false);
const prevShared: boolean[] = Array(playerCount).fill(false);

function playerSharesTile(idx: number): boolean {
  const tile = store.players[idx].position % 40;
  return store.players.some((p, i) => i !== idx && p.position % 40 === tile);
}

function getSharedOffset(idx: number): { x: number; z: number } {
  const tile = store.players[idx].position % 40;
  const group = store.players
    .map((p, i) => ({ idx: i, tile: p.position % 40 }))
    .filter((g) => g.tile === tile);

  if (group.length <= 1) return { x: 0, z: 0 };

  const posInGroup = group.findIndex((g) => g.idx === idx);
  const angle = (posInGroup / group.length) * 2 * Math.PI;
  const radius = GAME_CONFIG.SAME_TILE_SPACING;

  return {
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
  };
}

function onRenderTick({ delta }: { delta: number }) {
  const deltaMs = delta * 1000;

  tick(deltaMs);

  for (let i = 0; i < playerCount; i++) {
    const justFinished = prevAnimating[i] && !isAnimating(i);
    prevAnimating[i] = isAnimating(i);

    const shared = playerSharesTile(i);

    if (shared !== prevShared[i] || justFinished) {
      if (shared) {
        cancelGrow(i);
      } else if (!isAnimating(i)) {
        startGrow(i);
      }
    }
    prevShared[i] = shared;

    const pos = getCurrentPosition(i);
    const offset = getSharedOffset(i);
    displayPositions[i].x = pos.x + offset.x;
    displayPositions[i].y = pos.y;
    displayPositions[i].z = pos.z + offset.z;

    if (shared) {
      displayScales.value[i] = GAME_CONFIG.SHARED_TILE_SCALE;
    } else {
      displayScales.value[i] = getCurrentScale(i);
    }
  }

  if (!cameraRef.value || !controlsRef.value) return;
  const camera = cameraRef.value;
  const controls = controlsRef.value?.instance;
  if (!controls || typeof controls.update !== "function") return;

  controls.update();

  if (!store.isCamFollowActive) return;

  const activeIdx = store.activePlayerIndex;
  const activePos = displayPositions[activeIdx];
  if (!activePos) return;
  const activeCasilla = store.players[activeIdx]?.position ?? 0;

  controls.target.x = activePos.x;
  controls.target.y = activePos.y;
  controls.target.z = activePos.z;

  const camTarget = getCameraPosition(activeCasilla, activePos);

  camera.position.x += (camTarget.x - camera.position.x) * CAM_LERP;
  camera.position.y += (camTarget.y - camera.position.y) * CAM_LERP;
  camera.position.z += (camTarget.z - camera.position.z) * CAM_LERP;
}

onMounted(async () => {
  try {
    const loader = new GLTFLoader();
    store.setStatusMessage("Descargando mallas 3D...");

    const tokenModels = store.players.map((p) => p.tokenModel);
    const loadResults = await Promise.all(
      tokenModels.map((file) => loader.loadAsync(`/models/users/${file}`)),
    );

    tableroScene.value = (await loader.loadAsync("/models/tablero.glb"))
      .scene as Group;

    playerScenes.value = loadResults.map((gltf) => gltf.scene as Group);

    for (let i = 0; i < playerCount; i++) {
      const coords = getCasillaCoordinates(0);
      setPosition(i, coords);
      displayPositions[i].x = coords.x;
      displayPositions[i].y = coords.y;
      displayPositions[i].z = coords.z;
    }

    store.setStatusMessage("¡Todo listo!");
  } catch (error) {
    store.setStatusMessage("Error al cargar assets.");
    console.error(error);
  }
});

watch(
  () => store.moveEvent,
  (event) => {
    if (!event) return;
    const from = { ...getCurrentPosition(event.playerIndex) };
    const to = getCasillaCoordinates(event.position);
    startHop(event.playerIndex, from, to);
  },
);

function onDiceRoll(value: number) {
  store.moveCurrentPlayer(value);
}

function onNextTurn() {
  store.finishTurn();
}
</script>
