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
          :scale="1"
        />

        <primitive
          v-if="dedalScene"
          :object="dedalScene"
          :position="[player2Position.x, player2Position.y, player2Position.z]"
          :scale="1"
        />

        <TresGridHelper :args="[30, 30, '#ff0055', '#444444']" />
      </TresCanvas>
    </ClientOnly>

    <GameOverlay
      :current-position="store.activePlayer === 1 ? store.currentPosition : store.player2Position"
      :is-moving="store.isMoving || store.isPlayer2Moving"
      @roll="onDiceRoll"
      @toggle-camera="store.toggleCameraFollow()"
      @next-turn="onNextTurn"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, shallowRef, reactive, watch } from "vue";
import { TresCanvas } from "@tresjs/core";
import { OrbitControls } from "@tresjs/cientos";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useGameStore } from "~/stores/gameStore";
import { useBoardGeometry } from "~/composables/useBoardGeometry";
import GameOverlay from "~/components/GameOverlay.vue";
import type { Group } from "three";

const tableroScene = shallowRef<Group | null>(null);
const playerScene = shallowRef<Group | null>(null);
const dedalScene = shallowRef<Group | null>(null);

const store = useGameStore();
const cameraRef = shallowRef();
const controlsRef = shallowRef();

// Coordenadas reactivas de la ficha en el espacio 3D
const playerPosition = reactive({ x: 4.5, y: 0.2, z: 4.5 });
const player2Position = reactive({ x: 4.5, y: 0.2, z: 4.5 });
const player1Geo = useBoardGeometry(0);
const player2Geo = useBoardGeometry(1);

function onRenderTick() {
  if (!cameraRef.value || !controlsRef.value) return;
  const camera = cameraRef.value;
  const controls = controlsRef.value?.instance;
  if (!controls || typeof controls.update !== "function") return;

  const activePosition = store.activePlayer === 1 ? playerPosition : player2Position;
  const activeCasilla = store.activePlayer === 1 ? store.currentPosition : store.player2Position;

  controls.target.x = activePosition.x;
  controls.target.y = activePosition.y;
  controls.target.z = activePosition.z;

  let targetCamX = 0;
  let targetCamY = 0;
  let targetCamZ = 0;
  let tramo = 0;

  let casilla = activeCasilla || 0;
  if (casilla >= 40) casilla -= 40;

  // 🕹️ CONFIGURACIÓN DE COORDENADAS COCHINAS (A MANO POR TRAMO)
  if (casilla >= 0 && casilla < 10) {
    targetCamX = activePosition.x - 3.64;
    targetCamY = activePosition.y + 1.61;
    targetCamZ = activePosition.z + 3.66;
    tramo = 1;
  } else if (casilla >= 10 && casilla < 20) {
    targetCamX = activePosition.x - 3.64;
    targetCamY = activePosition.y + 1.61;
    targetCamZ = activePosition.z + 3.66;
    tramo = 2;
  } else if (casilla >= 20 && casilla < 30) {
    targetCamX = activePosition.x - 3.64;
    targetCamY = activePosition.y + 1.61;
    targetCamZ = activePosition.z + 3.66;
    tramo = 3;
  } else {
    targetCamX = activePosition.x - 3.64;
    targetCamY = activePosition.y + 1.61;
    targetCamZ = activePosition.z + 3.66;
    tramo = 4;
  }

  // 🎬 3. INTERPOLACIÓN CINEMÁTICA (Giro suave de 90° entre tramos)
  const lerpFactor = 0.05; // Sube a 0.1 si quieres que gire más rápido al doblar la esquina
  camera.position.x += (targetCamX - camera.position.x) * lerpFactor;
  camera.position.y += (targetCamY - camera.position.y) * lerpFactor;
  camera.position.z += (targetCamZ - camera.position.z) * lerpFactor;
  controls.update();
}

onMounted(async () => {
  try {
    const loader = new GLTFLoader();
    store.setStatusMessage("Descargando mallas 3D...");

    const [gltfTablero, gltfFicha, gltfDedal] = await Promise.all([
      loader.loadAsync("/models/tablero.glb"),
      loader.loadAsync("/models/sombrero.glb"),
      loader.loadAsync("/models/dedal.glb"),
    ]);

    tableroScene.value = gltfTablero.scene as Group;
    playerScene.value = gltfFicha.scene as Group;
    dedalScene.value = gltfDedal.scene as Group;

    const coords = player1Geo.getCasillaCoordinates(store.currentPosition || 0);
    console.log(
      `[DEBUG] Posición inicial de la ficha: Casilla ${store.currentPosition} -> Coordenadas (${coords.x}, ${coords.y}, ${coords.z})`,
    );
    playerPosition.x = coords.x;
    playerPosition.y = coords.y;
    playerPosition.z = coords.z;

    const coords2 = player2Geo.getCasillaCoordinates(store.player2Position || 0);
    player2Position.x = coords2.x;
    player2Position.y = coords2.y;
    player2Position.z = coords2.z;

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
    const targetCoords = player1Geo.getCasillaCoordinates(newCasilla);
    playerPosition.x = targetCoords.x;
    playerPosition.y = targetCoords.y;
    playerPosition.z = targetCoords.z;
  },
);

watch(
  () => store.player2Position,
  (newCasilla) => {
    const targetCoords = player2Geo.getCasillaCoordinates(newCasilla);
    player2Position.x = targetCoords.x;
    player2Position.y = targetCoords.y;
    player2Position.z = targetCoords.z;
  },
);

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
