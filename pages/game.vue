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
            v-if="scene && !store.bankruptPlayers.includes(idx)"
            :object="scene"
            :position="[
              displayPositions[idx]?.x ?? 0,
              displayPositions[idx]?.y ?? 0,
              displayPositions[idx]?.z ?? 0,
            ]"
            :scale="displayScales[idx] ?? 1"
          />
        </template>
        <!-- <TresGridHelper :args="[30, 30, '#ff0055', '#444444']" /> -->
        <!-- <template v-for="label in tileLabels" :key="'label-' + label.index">
          <TresMesh
            :position="[label.position.x, label.position.y, label.position.z]"
            :rotation="[label.rotation.x, label.rotation.y, label.rotation.z]"
          >
            <TresPlaneGeometry :args="[label.width, label.height]" />
            <TresMeshBasicMaterial
              :map="label.texture"
              :transparent="true"
              :side="2"
            />
          </TresMesh>
        </template> -->
      </TresCanvas>
    </ClientOnly>

    <GameOverlay
      :current-position="store.casillaActual"
      :is-moving="store.isAnyMoving"
      :card-open="showTileCard || showAuction || showCardOverlay"
      @roll="onDiceRoll"
      @toggle-camera="store.toggleCameraFollow()"
      @next-turn="onNextTurn"
      @pay-bail="onPayBail"
    />

    <TileCard
      v-if="showTileCard && !store.winner"
      :tile="currentTile"
      :owner-id="tileOwnerId"
      :owner-name="tileOwnerName"
      :rent-amount="tileRentAmount"
      :active-player-id="store.activePlayer?.id ?? -1"
      :active-player-cash="store.activePlayer?.cash ?? 0"
      :can-skip-buy="store.canSkipBuy"
      @close="showTileCard = false"
      @buy="onBuyTile"
      @auction="onAuctionTile"
      @skip="onSkipTile"
    />

    <CardOverlay
      v-if="showCardOverlay && store.activeCard && !store.winner"
      :card="store.activeCard"
      @close="onCardClose"
      @accept="onCardAccept"
    />

    <AuctionModal
      v-if="showAuction && !store.winner"
      :tile="currentTile"
      :players="store.activePlayers"
      :starting-bidder-index="auctionStartBidder"
      @sold="onAuctionSold"
      @unsold="onAuctionUnsold"
    />

    <WinnerOverlay
      v-if="store.winner"
      :player="store.winner"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, shallowRef, reactive, watch, ref, computed } from "vue";
import { TresCanvas } from "@tresjs/core";
import { OrbitControls } from "@tresjs/cientos";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useGameStore } from "~/stores/gameStore";
import { useBoardGeometry } from "~/composables/useBoardGeometry";
import { usePieceAnimation } from "~/composables/usePieceAnimation";
import { useCameraOrbit, CAM_LERP } from "~/composables/useCameraOrbit";
import { useTileLabels } from "~/composables/useTileLabels";
import { GAME_CONFIG } from "~/config/gameConfig";
import { BOARD_TILES } from "~/config/boardTilesConfig";
import type { BoardTile } from "~/config/boardTilesConfig";
import GameOverlay from "~/components/GameOverlay.vue";
import TileCard from "~/components/TileCard.vue";
import AuctionModal from "~/components/AuctionModal.vue";
import WinnerOverlay from "~/components/WinnerOverlay.vue";
import CardOverlay from "~/components/CardOverlay.vue";
import type { Group } from "three";

const store = useGameStore();

if (store.players.length === 0) {
  navigateTo("/");
}

const showTileCard = ref(false);
const showAuction = ref(false);
const showCardOverlay = ref(false);
const currentTile = computed(() => BOARD_TILES[(store.casillaActual - 1 + 40) % 40]);

const TAX_AMOUNTS: Record<number, number> = { 4: 200, 38: 100 };

function computeRent(tile: BoardTile, ownerId: number): number {
  if (tile.type === "railroad") {
    const count = BOARD_TILES.filter(
      (t) => t.type === "railroad" && store.propertyOwners[t.index] === ownerId,
    ).length;
    return 25 * count;
  }
  if (tile.type === "utility") {
    const count = BOARD_TILES.filter(
      (t) => t.type === "utility" && store.propertyOwners[t.index] === ownerId,
    ).length;
    return store.diceTotal * (count >= 2 ? 10 : 4);
  }
  return Math.floor((tile.price ?? 0) * 0.1);
}

const tileOwnerId = computed<number | undefined>(() => {
  const t = currentTile.value;
  if (t.type !== "property" && t.type !== "railroad" && t.type !== "utility") return undefined;
  return store.propertyOwners[t.index];
});

const tileOwnerName = computed(
  () => store.players.find((p) => p.id === tileOwnerId.value)?.name,
);

const tileRentAmount = computed(() => {
  if (tileOwnerId.value === undefined) return 0;
  return computeRent(currentTile.value, tileOwnerId.value);
});

const auctionStartBidder = computed(() => {
  const alive = store.activePlayers;
  const activeId = store.activePlayer?.id ?? -1;
  const idx = alive.findIndex((p) => p.id === activeId);
  return idx >= 0 ? idx : 0;
});

watch(
  () => store.isTurnComplete,
  (done) => {
    if (!done) return;
    const activePlayer = store.activePlayer;
    if (activePlayer && activePlayer.inJail) return;

    const tile = currentTile.value;
    const activeId = store.activePlayer?.id ?? -1;

    if (tile.group === "gotojail") {
      pendingDoublesTurn = false;
      store.sendToJail(activeId);
      return;
    }

    if (tile.type === "corner") return;

    if (tile.type === "card") {
      store.drawCard(tile.group as "chance" | "community");
      showCardOverlay.value = true;
      return;
    }

    if (tile.type === "tax") {
      store.payTax(activeId, TAX_AMOUNTS[tile.index] ?? 100);
    }

    if (tile.type === "property" || tile.type === "railroad" || tile.type === "utility") {
      const ownerId = store.propertyOwners[tile.index];
      if (ownerId !== undefined && ownerId !== activeId) {
        store.collectRent(activeId, ownerId, computeRent(tile, ownerId));
      }
    }

    showTileCard.value = true;
  },
);

watch(
  () => store.winner,
  (w) => { if (w) showTileCard.value = false; },
);

function onBuyTile() {
  const activeId = store.activePlayer?.id ?? -1;
  store.buyProperty(currentTile.value.index, activeId);
  showTileCard.value = false;
  if (pendingDoublesTurn) {
    pendingDoublesTurn = false;
    store.finishTurnKeepPlayer();
  } else {
    store.finishTurn();
  }
}

function onAuctionTile() {
  showTileCard.value = false;
  showAuction.value = true;
}

function onSkipTile() {
  showTileCard.value = false;
  if (pendingDoublesTurn) {
    pendingDoublesTurn = false;
    store.finishTurnKeepPlayer();
  } else {
    store.finishTurn();
  }
}

function onAuctionSold(winnerId: number, amount: number) {
  const tile = currentTile.value;
  const winner = store.players.find((p) => p.id === winnerId);
  if (winner) {
    winner.cash -= amount;
    store.propertyOwners[tile.index] = winnerId;
    store._checkBankruptcy(winnerId);
    store.statusMessage = `${winner.name} ganó la subasta de ${tile.name} por $${amount}`;
  }
  showAuction.value = false;
  if (pendingDoublesTurn) {
    pendingDoublesTurn = false;
    store.finishTurnKeepPlayer();
  } else {
    store.finishTurn();
  }
}

function onAuctionUnsold() {
  showAuction.value = false;
  if (pendingDoublesTurn) {
    pendingDoublesTurn = false;
    store.finishTurnKeepPlayer();
  } else {
    store.finishTurn();
  }
}

function onCardClose() {
  showCardOverlay.value = false;
  store.activeCard = null;
  if (pendingDoublesTurn) {
    pendingDoublesTurn = false;
    store.finishTurnKeepPlayer();
  } else {
    store.finishTurn();
  }
}

async function onCardAccept() {
  showCardOverlay.value = false;
  const movedPosition = await store.applyCardEffect();
  const activePlayer = store.activePlayer;
  if (activePlayer && activePlayer.inJail) {
    pendingDoublesTurn = false;
    return;
  }
  if (movedPosition) {
    return;
  }
  const tile = currentTile.value;
  if (tile.type === "property" || tile.type === "railroad" || tile.type === "utility") {
    showTileCard.value = true;
  } else {
    if (pendingDoublesTurn) {
      pendingDoublesTurn = false;
      store.finishTurnKeepPlayer();
    } else {
      store.finishTurn();
    }
  }
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
const tileLabels = useTileLabels();

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
  const player = store.activePlayer;
  if (!player) return;

  if (player.inJail) {
    const result = store.rollFromJail();
    if (result === "stayed") {
      store.isTurnComplete = true;
      return;
    }
    if (result === "forced_free") {
      store.moveCurrentPlayer(value);
      return;
    }
    store.moveCurrentPlayer(value);
    const isExtraTurn = store.doublesGiveExtraTurn && store.checkDoubles();
    if (isExtraTurn) {
      pendingDoublesTurn = true;
    }
    return;
  }

  store.moveCurrentPlayer(value);

  if (store.doublesGiveExtraTurn) {
    const activePlayer = store.activePlayer;
    if (activePlayer && activePlayer.inJail) {
      pendingDoublesTurn = false;
      return;
    }
    const isExtraTurn = store.checkDoubles();
    if (isExtraTurn) {
      pendingDoublesTurn = true;
    }
  }
}

let pendingDoublesTurn = false;

function onNextTurn() {
  showTileCard.value = false;
  if (pendingDoublesTurn) {
    pendingDoublesTurn = false;
    store.finishTurnKeepPlayer();
  } else {
    store.finishTurn();
  }
}

function onPayBail() {
  const player = store.activePlayer;
  if (!player || !player.inJail) return;
  store.payJailBail(player.id);
}
</script>
