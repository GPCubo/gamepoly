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
    <GameOverlay
      :currentPosition="store.currentPosition"
      :statusMessage="statusMessage"
      :isMoving="store.isMoving"
      :isRolling="store.isRolling"
      :isCamFollowActive="isCamFollowActive"
      @roll="throwDice"
      @toggle-camera="isCamFollowActive = !isCamFollowActive"
    />
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
const { throwDice } = useDice();

// Rotación del dado
const diceRotation = reactive({ x: 0, y: 0, z: 0 });

// Coordenadas reactivas de la ficha en el espacio 3D
// Iniciamos en un punto visible aproximado sobre la casilla de salida
const playerPosition = reactive({ x: 4.5, y: 0.2, z: 4.5 });
// Al inicio de tu <script setup> (Nuxt lo auto-importa)
const { getCasillaCoordinates } = useBoardGeometry();
// Mapeo de coordenadas 3D para cada casilla (X, Y, Z)

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
