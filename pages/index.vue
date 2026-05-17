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

        <TresGridHelper :args="[30, 30, '#ff0055', '#444444']" />
      </TresCanvas>
    </ClientOnly>

    <GameOverlay
      :current-position="store.currentPosition"
      :is-moving="store.isMoving"
      @roll="onDiceRoll"
      @toggle-camera="store.toggleCameraFollow()"
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

const store = useGameStore();
const cameraRef = shallowRef();
const controlsRef = shallowRef();

// Coordenadas reactivas de la ficha en el espacio 3D
const playerPosition = reactive({ x: 4.5, y: 0.2, z: 4.5 });
const { getCasillaCoordinates } = useBoardGeometry();

function onRenderTick() {
  if (!cameraRef.value || !controlsRef.value) return;
  const camera = cameraRef.value;
  const controls = controlsRef.value?.instance;
  if (!controls || typeof controls.update !== "function") return;

  // 1. 🎯 EL ENFOQUE SIEMPRE EN EL JUGADOR (El centro de la pantalla es la ficha)
  controls.target.x = playerPosition.x;
  controls.target.y = playerPosition.y;
  controls.target.z = playerPosition.z;

  // 📐 2. VARIABLES DE DESTINO DE LA CÁMARA
  let targetCamX = 0;
  let targetCamY = 0;
  let targetCamZ = 0;
  let tramo = 0;

  // Evaluamos la posición del store para saber el tramo
  let casilla = store.currentPosition || 0;
  if (casilla >= 40) casilla -= 40;

  // 🕹️ CONFIGURACIÓN DE COORDENADAS COCHINAS (A MANO POR TRAMO)
  if (casilla >= 0 && casilla < 10) {
    // 🚩 TRAMO 1 (Casillas 0 a 9 - Abajo)
    // Pon aquí lo que mediste para el primer lado
    targetCamX = playerPosition.x - 3.64; // Te echas a la izquierda de la ficha
    targetCamY = playerPosition.y + 1.61; // Altura cinematográfica a ras de pista
    targetCamZ = playerPosition.z + 3.66; // Te sales hacia la pantalla para ver el tablero de frente
    tramo = 1;
  } else if (casilla >= 10 && casilla < 20) {
    // 🚩 TRAMO 2 (Casillas 10 a 19 - Derecha)
    // Aquí pones las coordenadas exactas que te dieron la toma buena de tu captura
    targetCamX = playerPosition.x - 3.64; // Te echas a la izquierda de la ficha
    targetCamY = playerPosition.y + 1.61; // Altura cinematográfica a ras de pista
    targetCamZ = playerPosition.z + 3.66; // Te sales hacia la pantalla para ver el tablero de frente
    tramo = 2;
  } else if (casilla >= 20 && casilla < 30) {
    // 🚩 TRAMO 3 (Casillas 20 a 29 - Arriba)
    targetCamX = playerPosition.x - 3.64; // Te echas a la izquierda de la ficha
    targetCamY = playerPosition.y + 1.61; // Altura cinematográfica a ras de pista
    targetCamZ = playerPosition.z + 3.66; // Te sales hacia la pantalla para ver el tablero de frente
    tramo = 3;
  } else {
    // 🚩 TRAMO 4 (Casillas 30 a 39 - Izquierda)
    targetCamX = playerPosition.x - 3.64; // Te echas a la izquierda de la ficha
    targetCamY = playerPosition.y + 1.61; // Altura cinematográfica a ras de pista
    targetCamZ = playerPosition.z + 3.66; // Te sales hacia la pantalla para ver el tablero de frente
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

    const [gltfTablero, gltfFicha] = await Promise.all([
      loader.loadAsync("/models/tablero.glb"),
      loader.loadAsync("/models/sombrero.glb"),
    ]);

    tableroScene.value = gltfTablero.scene as Group;
    playerScene.value = gltfFicha.scene as Group;

    // Sincronizar posición inicial de la ficha con el store
    const coords = getCasillaCoordinates(store.currentPosition || 0);
    console.log(
      `[DEBUG] Posición inicial de la ficha: Casilla ${store.currentPosition} -> Coordenadas (${coords.x}, ${coords.y}, ${coords.z})`,
    );
    playerPosition.x = coords.x;
    playerPosition.y = coords.y;
    playerPosition.z = coords.z;

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
    const targetCoords = getCasillaCoordinates(newCasilla);
    playerPosition.x = targetCoords.x;
    playerPosition.y = targetCoords.y;
    playerPosition.z = targetCoords.z;
  },
);

function onDiceRoll(value: number) {
  store.lastDiceRoll = value;
  store.movePlayer(value);
}
</script>
