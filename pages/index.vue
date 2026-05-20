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

        <primitive
          v-if="playerScene"
          :object="playerScene"
          :position="[playerPosition.x, playerPosition.y, playerPosition.z]"
          :scale="playerScale"
        />

        <primitive
          v-if="dedalScene"
          :object="dedalScene"
          :position="[player2Position.x, player2Position.y, player2Position.z]"
          :scale="player2Scale"
        />

        <TresGridHelper :args="[30, 30, '#ff0055', '#444444']" />
      </TresCanvas>
    </ClientOnly>

    <GameOverlay
      :current-position="
        store.activePlayer === 1 ? store.casillaActual : store.casilla2Actual
      "
      :is-moving="store.isMoving || store.isPlayer2Moving"
      @roll="onDiceRoll"
      @toggle-camera="store.toggleCameraFollow()"
      @next-turn="onNextTurn"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, shallowRef, reactive, watch, computed, ref } from "vue";
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

const tableroScene = shallowRef<Group | null>(null);
const playerScene = shallowRef<Group | null>(null);
const dedalScene = shallowRef<Group | null>(null);

const store = useGameStore();
const cameraRef = shallowRef();
const controlsRef = shallowRef();

const playerPosition = reactive({ x: 0, y: 0, z: 0 });
const player2Position = reactive({ x: 0, y: 0, z: 0 });
const { getCasillaCoordinates } = useBoardGeometry();

const isSharedTile = computed(() => {
  const pos1 = store.currentPosition % 40;
  const pos2 = store.player2Position % 40;
  return pos1 === pos2;
});

const playerScale = ref(GAME_CONFIG.DEFAULT_SCALE);
const player2Scale = ref(GAME_CONFIG.DEFAULT_SCALE);

const {
  startHop,
  startGrow,
  cancelGrow,
  tick,
  getCurrentPosition,
  getCurrentScale,
  isAnimating,
  setPosition,
} = usePieceAnimation();

const { getCameraPosition } = useCameraOrbit();

let prevAnimating1 = false;
let prevAnimating2 = false;

function onRenderTick({ delta }: { delta: number }) {
  const deltaMs = delta * 1000;

  tick(deltaMs);

  const justFinished1 = prevAnimating1 && !isAnimating(1);
  const justFinished2 = prevAnimating2 && !isAnimating(2);

  prevAnimating1 = isAnimating(1);
  prevAnimating2 = isAnimating(2);

  const pos1 = getCurrentPosition(1);
  playerPosition.x = pos1.x;
  playerPosition.y = pos1.y;
  playerPosition.z = pos1.z;

  const pos2 = getCurrentPosition(2);
  player2Position.x = pos2.x;
  player2Position.y = pos2.y;
  player2Position.z = pos2.z;

  if (justFinished1) {
    const shared1 = (store.currentPosition % 40) === (store.player2Position % 40);
    if (!shared1) startGrow(1);
    else cancelGrow(1);
  }

  if (justFinished2) {
    const shared2 = (store.currentPosition % 40) === (store.player2Position % 40);
    if (!shared2) startGrow(2);
    else cancelGrow(2);
  }

  playerScale.value = getCurrentScale(1);
  player2Scale.value = getCurrentScale(2);

  if (isSharedTile.value) {
    const halfSpacing = GAME_CONFIG.SAME_TILE_SPACING / 2;
    playerPosition.x -= halfSpacing;
    playerPosition.z -= halfSpacing;
    player2Position.x += halfSpacing;
    player2Position.z += halfSpacing;
    playerScale.value = GAME_CONFIG.SHARED_TILE_SCALE;
    player2Scale.value = GAME_CONFIG.SHARED_TILE_SCALE;
  }

  if (!cameraRef.value || !controlsRef.value) return;
  const camera = cameraRef.value;
  const controls = controlsRef.value?.instance;
  if (!controls || typeof controls.update !== "function") return;

  controls.update();

  if (!store.isCamFollowActive) return;

  const activePosition =
    store.activePlayer === 1 ? playerPosition : player2Position;
  const activeCasilla =
    store.activePlayer === 1 ? store.currentPosition : store.player2Position;

  controls.target.x = activePosition.x;
  controls.target.y = activePosition.y;
  controls.target.z = activePosition.z;

  const camTarget = getCameraPosition(
    activeCasilla || 0,
    activePosition,
  );

  camera.position.x += (camTarget.x - camera.position.x) * CAM_LERP;
  camera.position.y += (camTarget.y - camera.position.y) * CAM_LERP;
  camera.position.z += (camTarget.z - camera.position.z) * CAM_LERP;
}

onMounted(async () => {
  try {
    const loader = new GLTFLoader();
    store.setStatusMessage("Descargando mallas 3D...");

    const [gltfTablero, gltfFicha, gltfDedal] = await Promise.all([
      loader.loadAsync("/models/tablero.glb"),
      loader.loadAsync("/models/users/sombrero.glb"),
      loader.loadAsync("/models/users/dedal.glb"),
    ]);

    tableroScene.value = gltfTablero.scene as Group;
    playerScene.value = gltfFicha.scene as Group;
    dedalScene.value = gltfDedal.scene as Group;

    const coords = getCasillaCoordinates(store.currentPosition || 0);

    setPosition(1, coords);
    playerPosition.x = coords.x;
    playerPosition.y = coords.y;
    playerPosition.z = coords.z;
    console.log(
      `[DEBUG] Coordenadas iniciales de la ficha establecidas: (${playerPosition.x}, ${playerPosition.y}, ${playerPosition.z})`,
    );
    const coords2 = getCasillaCoordinates(store.player2Position || 0);
    setPosition(2, coords2);
    player2Position.x = coords2.x;
    player2Position.y = coords2.y;
    player2Position.z = coords2.z;
    console.log(
      `[DEBUG] Coordenadas iniciales de la segunda ficha establecidas: (${player2Position.x}, ${player2Position.y}, ${player2Position.z})`,
    );

    store.setStatusMessage("¡Todo listo!");
  } catch (error) {
    store.setStatusMessage("Error al cargar assets.");
    console.error(error);
  }
});

// ESCUCHA: Monitorea la casilla del jugador en el store de Pinia.
watch(
  () => store.currentPosition,
  (newCasilla) => {
    store.setStatusMessage(`🏃 Moviendo a casilla ${newCasilla}...`);
    const from = { ...getCurrentPosition(1) };
    const to = getCasillaCoordinates(newCasilla);
    startHop(1, from, to);
  },
);

watch(
  () => store.player2Position,
  (newCasilla) => {
    const from = { ...getCurrentPosition(2) };
    const to = getCasillaCoordinates(newCasilla);
    startHop(2, from, to);
  },
);

watch(isSharedTile, (shared, wasShared) => {
  if (shared) {
    cancelGrow(1);
    cancelGrow(2);
  } else if (wasShared) {
    if (!isAnimating(1)) startGrow(1);
    if (!isAnimating(2)) startGrow(2);
  }
}, { immediate: true });

function onDiceRoll(value: number) {
  store.lastDiceRoll = value;
  if (store.activePlayer === 1) {
    store.movePlayer(value);
  } else {
    store.movePlayer2(value);
  }
}

function onNextTurn() {
  store.finishTurn();
}
</script>
