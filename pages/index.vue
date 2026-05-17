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

        <TresGroup v-if="diceScene" :position="[0, 2.5, 0]">
          <primitive
            :object="diceScene"
            :rotation="[diceRotation.x, diceRotation.y, diceRotation.z]"
            :scale="4.0"
          />
        </TresGroup>

        <primitive
          v-if="playerScene"
          :object="playerScene"
          :position="[playerPosition.x, playerPosition.y, playerPosition.z]"
          :scale="1"
        />

        <TresGridHelper :args="[30, 30, '#ff0055', '#444444']" />
      </TresCanvas>
    </ClientOnly>

    <div
      style="
        position: absolute;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 100;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15px;
      "
    >
      <div
        style="
          background: rgba(0, 0, 0, 0.8);
          padding: 8px 16px;
          border-radius: 20px;
          color: #4ade80;
          font-family: monospace;
          font-size: 12px;
          border: 1px solid rgba(74, 222, 128, 0.2);
        "
      >
        Casilla Actual: {{ store.currentPosition }} | Estado:
        {{ statusMessage }}
      </div>

      <div style="display: flex; gap: 10px">
        <button
          @click="handleRoll"
          :disabled="store.isMoving || store.isRolling"
          style="
            background: #10b981;
            color: white;
            border: none;
            padding: 14px 32px;
            font-size: 18px;
            font-weight: bold;
            border-radius: 16px;
            cursor: pointer;
            box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.4);
            transition: all 0.1s;
          "
          :style="{
            opacity: store.isMoving || store.isRolling ? 0.5 : 1,
            cursor:
              store.isMoving || store.isRolling ? 'not-allowed' : 'pointer',
          }"
        >
          {{
            store.isRolling
              ? "Rodando..."
              : store.isMoving
                ? "Moviendo..."
                : "🎲 Tirar Dados"
          }}
        </button>

        <button
          @click="isCamFollowActive = !isCamFollowActive"
          style="
            background: #312e81;
            color: white;
            border: none;
            padding: 14px 24px;
            font-size: 16px;
            font-weight: bold;
            border-radius: 16px;
            cursor: pointer;
            box-shadow: 0 10px 15px -3px rgba(49, 46, 129, 0.4);
          "
        >
          {{ isCamFollowActive ? "🎥 Cámara: Fija" : "🎥 Cámara: Libre" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, shallowRef, ref, reactive, watch } from "vue";
import { TresCanvas } from "@tresjs/core";
import { OrbitControls } from "@tresjs/cientos";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useDice } from "~/composables/useDice";
import { useGameStore } from "~/stores/gameStore";
import { useBoardGeometry } from "~/composables/useBoardGeometry";
import type { Group } from "three";

const tableroScene = shallowRef<Group | null>(null);
const diceScene = shallowRef<Group | null>(null);
const playerScene = shallowRef<Group | null>(null);

const statusMessage = ref("Cargando entorno...");
const store = useGameStore();
const cameraRef = shallowRef();
const controlsRef = shallowRef();
const { throwDice } = useDice();
// 🔥 ¡ESTA ES LA LÍNEA QUE CORRIGE EL ERROR! 🎥
const isCamFollowActive = ref(false);

// Rotación del dado
const diceRotation = reactive({ x: 0, y: 0, z: 0 });

// Coordenadas reactivas de la ficha en el espacio 3D
// Iniciamos en un punto visible aproximado sobre la casilla de salida
const playerPosition = reactive({ x: 4.5, y: 0.2, z: 4.5 });
// Al inicio de tu <script setup> (Nuxt lo auto-importa)
const { getCasillaCoordinates } = useBoardGeometry();
// Mapeo de coordenadas 3D para cada casilla (X, Y, Z)

function onRenderTick() {
  if (!cameraRef.value || !controlsRef.value) return;

  // MODO LIBRE / CALIBRADOR (Por si necesitas inspeccionar)
  if (!isCamFollowActive.value) {
    debugCameraOffsets();
    return;
  }

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
  // Forzar a OrbitControls a refrescar la matriz de vista
  controls.update();
}
// 🚀 FUNCIÓN DE INGENIERÍA INVERSA PARA CALIBRAR VALORES EN VIVO

// Variables para recordar el último estado impreso (fuera de la función)
let lastCamX = 0;
let lastCamY = 0;
let lastCamZ = 0;
let lastCasilla = -1;
async function debugCameraOffsets() {
  if (!cameraRef.value || !controlsRef.value) return;

  const camera = cameraRef.value;
  const controls = controlsRef.value?.instance;

  // 1. Posición absoluta actual de la cámara
  const camX = camera.position.x;
  const camY = camera.position.y;
  const camZ = camera.position.z;

  // 2. Averiguar casilla actual
  let casilla = store.currentPosition || 0;
  if (casilla >= 40) casilla -= 40;

  // 3. VALIDACIÓN: ¿La cámara se ha movido o cambió la casilla?
  // Usamos un umbral de 0.01 unidades para ignorar micro-movimientos
  const seMovio =
    Math.abs(camX - lastCamX) > 0.01 ||
    Math.abs(camY - lastCamY) > 0.01 ||
    Math.abs(camZ - lastCamZ) > 0.01 ||
    casilla !== lastCasilla;

  // Si NADA ha cambiado, rompemos la ejecución aquí y no escribimos en consola
  if (!seMovio) return;

  // 4. Actualizamos el historial con los valores actuales para el próximo frame
  lastCamX = camX;
  lastCamY = camY;
  lastCamZ = camZ;
  lastCasilla = casilla;

  // 5. PROCESAMIENTO DE DATA (Solo se ejecuta si hubo movimiento real)
  const offsetX = camX - playerPosition.x;
  const offsetY = camY - playerPosition.y;
  const offsetZ = camZ - playerPosition.z;

  const targetX = controls ? controls.target.x : playerPosition.x;
  const targetY = controls ? controls.target.y : playerPosition.y;
  const targetZ = controls ? controls.target.z : playerPosition.z;

  const tramoEstimado = Math.floor(casilla / 10) + 1;

  // Ahora el clear solo se ejecuta al mover el mouse, manteniendo la consola limpia
  console.clear();

  console.log(
    "%c--- 🎥 CALIBRADOR DE CÁMARA PRO (MUTACIÓN DETECTADA) ---",
    "color: #3b82f6; font-weight: bold; font-size: 14px;",
  );

  console.table({
    Propiedad: ["Coordenada X", "Coordenada Y", "Coordenada Z"],
    "Cámara (Global)": [camX.toFixed(2), camY.toFixed(2), camZ.toFixed(2)],
    "Ficha (Player)": [
      playerPosition.x.toFixed(2),
      playerPosition.y.toFixed(2),
      playerPosition.z.toFixed(2),
    ],
    "Target (Mirada)": [
      targetX.toFixed(2),
      targetY.toFixed(2),
      targetZ.toFixed(2),
    ],
    "Offsets (Deltas)": [
      offsetX.toFixed(2),
      offsetY.toFixed(2),
      offsetZ.toFixed(2),
    ],
  });

  console.log(
    `%c\n📍 Ubicación Actual: Casilla ${casilla} (Tramo ${tramoEstimado})`,
    "color: #eab308; font-weight: bold;",
  );

  console.log(
    "%c📋 CÓDIGO LISTO PARA TU SWITCH DE TRAMOS:",
    "color: #10b981; font-weight: bold;\n" +
      `targetCamX = playerPosition.x + (${offsetX.toFixed(2)}); \n` +
      `targetCamY = playerPosition.y + (${offsetY.toFixed(2)}); \n` +
      `targetCamZ = playerPosition.z + (${offsetZ.toFixed(2)});`,
  );
}

onMounted(async () => {
  try {
    const loader = new GLTFLoader();
    statusMessage.value = "Descargando mallas 3D...";

    const [gltfTablero, gltfDado, gltfFicha] = await Promise.all([
      loader.loadAsync("/models/tablero.glb"),
      loader.loadAsync("/models/dado.glb"),
      loader.loadAsync("/models/sombrero.glb"),
    ]);

    tableroScene.value = gltfTablero.scene as Group;
    diceScene.value = gltfDado.scene as Group;
    playerScene.value = gltfFicha.scene as Group;

    // Sincronizar posición inicial de la ficha con el store
    const coords = getCasillaCoordinates(store.currentPosition || 0);
    console.log(
      `[DEBUG] Posición inicial de la ficha: Casilla ${store.currentPosition} -> Coordenadas (${coords.x}, ${coords.y}, ${coords.z})`,
    );
    playerPosition.x = coords.x;
    playerPosition.y = coords.y;
    playerPosition.z = coords.z;

    statusMessage.value = "¡Todo listo!";
  } catch (error) {
    statusMessage.value = "Error al cargar assets.";
    console.error(error);
  }
});

// ESCUCHA: Si cambias el valor de 'isRolling' en el store, hacemos girar el dado con furia
watch(
  () => store.isRolling,
  (rolling) => {
    if (rolling) {
      statusMessage.value = "🎲 Rodando dados...";
      // Incremento brusco de ángulos para simular tiro rápido
      diceRotation.x = Math.random() * Math.PI * 4;
      diceRotation.y = Math.random() * Math.PI * 4;
      diceRotation.z = Math.random() * Math.PI * 4;
    }
  },
);

// ESCUCHA: Monitorea la casilla del jugador en tu store de Pinia.
// Cuando store.startMove cambie 'store.currentPosition', la ficha viajará automáticamente a las nuevas coordenadas
watch(
  () => store.currentPosition,
  (newCasilla) => {
    statusMessage.value = `🏃 Moviendo a casilla ${newCasilla}...`;
    const targetCoords = getCasillaCoordinates(newCasilla);

    // Asignación reactiva directa (Teletransporte instantáneo por ahora)
    // Tip: Si tienes una función de interpolación (lerp) o animaciones de pasos en el store, se verá fluido.
    playerPosition.x = targetCoords.x;
    playerPosition.y = targetCoords.y;
    playerPosition.z = targetCoords.z;
  },
);

function handleRoll() {
  throwDice();
}
</script>
