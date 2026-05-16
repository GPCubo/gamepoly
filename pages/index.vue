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
      >
        <TresPerspectiveCamera
          :position="[12, 15, 12]"
          :fov="45"
          :near="0.1"
          :far="1000"
          :look-at="[0, 0, 0]"
        />

        <OrbitControls :enable-damping="true" :target="[0, 0, 0]" />

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
          cursor: store.isMoving || store.isRolling ? 'not-allowed' : 'pointer',
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
import type { Group } from "three";

const tableroScene = shallowRef<Group | null>(null);
const diceScene = shallowRef<Group | null>(null);
const playerScene = shallowRef<Group | null>(null);

const statusMessage = ref("Cargando entorno...");
const store = useGameStore();
const { throwDice } = useDice();

// Rotación del dado
const diceRotation = reactive({ x: 0, y: 0, z: 0 });

// Coordenadas reactivas de la ficha en el espacio 3D
// Iniciamos en un punto visible aproximado sobre la casilla de salida
const playerPosition = reactive({ x: 4.5, y: 0.2, z: 4.5 });

// Mapeo de coordenadas 3D para cada casilla (X, Y, Z)
// Aquí debes colocar los vectores correspondientes a tu tablero.
// Como ejemplo rápido, definimos una función o un array que calcule el movimiento en el tablero:
const getCasillaCoordinates = (casillaIndex: number) => {
  const ySuelo = 0; // Tu altura perfecta fijada 🎯

  // Tu punto de partida verificado para la casilla 0
  const inicioX = 0.1;
  const inicioZ = -0.1;
  const pasoCasilla = 0.4; // Espaciado milimétrico

  // Casilla 0: Salida (GO)
  if (casillaIndex === 0) {
    return { x: inicioX, y: ySuelo, z: inicioZ };
  }

  // LADO 1 (Casillas 1 a 9): Avanza hacia la derecha (Sumamos en X, Z fijo)
  // ¡Este funcionó perfecto! Sirve de ancla para el resto.
  if (casillaIndex < 10) {
    return {
      x: inicioX + casillaIndex * pasoCasilla,
      y: ySuelo,
      z: inicioZ + 0.05,
    };
  }

  // LADO 2 (Casillas 10 a 19): Sube por el lateral derecho hacia el fondo (Restamos en Z, X fijo en la esquina derecha)
  if (casillaIndex < 20) {
    const esquina1X = inicioX + 10 * pasoCasilla;
    return {
      x: esquina1X + 0.1,
      y: ySuelo,
      z: inicioZ - (casillaIndex - 10) * pasoCasilla,
    };
  }

  // LADO 3 (Casillas 20 a 29): Regresa por el fondo hacia la izquierda (Restamos en X, Z fijo al fondo)
  if (casillaIndex < 30) {
    const esquina1X = inicioX + 10 * pasoCasilla;
    const esquina2Z = inicioZ - 10 * pasoCasilla;
    return {
      x: esquina1X - (casillaIndex - 20) * pasoCasilla,
      y: ySuelo,
      z: esquina2Z - 0.1,
    };
  }

  // LADO 4 (Casillas 30 a 39): Baja por el lateral izquierdo de vuelta a la salida (Sumamos en Z para regresar a inicioZ)
  const esquina2Z = inicioZ - 10 * pasoCasilla;
  return {
    x: inicioX - 0.05, // Pequeño ajuste para que no se salga del tablero
    y: ySuelo,
    z: esquina2Z + (casillaIndex - 30) * pasoCasilla,
  };
};

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
