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
    <div
      style="
        position: absolute;
        top: 12px;
        right: 3rem;
        z-index: 50;
        padding: 4px 10px;
        border-radius: 8px;
        background: rgba(0, 0, 0, 0.6);
        color: #00e676;
        font-family: monospace;
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.5px;
        pointer-events: none;
        user-select: none;
      "
    >
      {{ fps }} FPS
    </div>

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
          v-if="boardHouseInstancedGroup"
          :object="boardHouseInstancedGroup"
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
      :card-open="
        showTileCard ||
        showAuction ||
        showCardOverlay ||
        showExchange ||
        !!store.winner
      "
      @roll="onDiceRoll"
      @next-turn="onNextTurn"
      @open-exchange="onOpenExchange"
      @skip-move="onSkipMove"
    />

    <TileCard
      v-if="showTileCard && !store.isCurrentPlayerBot && !store.winner"
      :tile="currentTile"
      :owner-id="tileOwnerId"
      :owner-name="tileOwnerName"
      :owner-color="tileOwnerColor"
      :rent-amount="tileRentAmount"
      :active-player-id="store.activePlayer?.id ?? -1"
      :active-player-cash="store.activePlayer?.cash ?? 0"
      :can-skip-buy="store.canSkipBuy"
      :auction-only="store.auctionOnly"
      :houses="tileDevelopment.houses"
      :has-hotel="tileDevelopment.hotel"
      :is-mortgaged="tileDevelopment.mortgaged"
      :can-build-house="canBuildHouseOnTile"
      :can-build-hotel="canBuildHotelOnTile"
      :can-sell-improvement="canSellImprovementOnTile"
      :can-mortgage="canMortgageTile"
      :can-unmortgage="canUnmortgageTile"
      :house-cost="tileHouseCost"
      :hotel-cost="tileHotelCost"
      :mortgage-value="tileMortgageValue"
      :unmortgage-cost="tileUnmortgageCost"
      @close="showTileCard = false"
      @buy="onBuyTile"
      @auction="onAuctionTile"
      @skip="onSkipTile"
      @build-house="onBuildHouse"
      @build-hotel="onBuildHotel"
      @sell-improvement="onSellImprovement"
      @mortgage="onMortgageTile"
      @unmortgage="onUnmortgageTile"
    />

    <CardOverlay
      v-if="showCardOverlay && store.activeCard && !store.winner"
      :card="store.activeCard"
      :close-disabled="store.isCurrentPlayerBot"
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

    <WinnerOverlay v-if="store.winner" :player="store.winner" />

    <ExchangeModal
      v-if="showExchange && !store.winner"
      :active-player="store.activePlayer!"
      :players="store.activePlayers"
      :property-owners="store.propertyOwners"
      :property-developments="store.propertyDevelopments"
      :proposal="store.exchangeProposal"
      :is-responding="exchangeIsResponding"
      :spectator-mode="exchangeSpectatorMode"
      :spectator-result="exchangeSpectatorResult"
      @propose="onExchangePropose"
      @accept="onExchangeAccept"
      @reject="onExchangeReject"
      @cancel="onExchangeCancel"
    />
  </div>
</template>

<script setup lang="ts">
import {
  onMounted,
  shallowRef,
  reactive,
  watch,
  ref,
  computed,
  nextTick,
} from "vue";
import { TresCanvas } from "@tresjs/core";
import { OrbitControls } from "@tresjs/cientos";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useGameStore } from "~/stores/gameStore";
import { useBoardGeometry } from "~/composables/useBoardGeometry";
import { usePieceAnimation } from "~/composables/usePieceAnimation";
import { useCameraOrbit, CAM_LERP } from "~/composables/useCameraOrbit";
import { useTileLabels } from "~/composables/useTileLabels";
import {
  useBotTurn,
  getBotExchangeResponse,
  type BotExchangeResult,
} from "~/composables/useBotTurn";
import { GAME_CONFIG } from "~/config/gameConfig";
import { useBoardStore } from "~/stores/boardStore";
import type { BoardTile } from "~/types/board";
import {
  BOARD_HOUSE_ASSET_GROUPS,
  BOARD_HOUSE_ASSET_DEFINITIONS,
  getBoardHouseAssetGroup,
  getBoardHouseAssetKey,
  getBoardHouseGroupModelPath,
  getPropertyDevelopmentPlacements,
  getAllPropertyHousePlacements,
} from "~/config/boardHouseAssets";
import type {
  BoardHouseAssetPlacement,
  BoardHouseAssetType,
} from "~/config/boardHouseAssets";
import GameOverlay from "~/components/GameOverlay.vue";
import TileCard from "~/components/TileCard.vue";
import AuctionModal from "~/components/AuctionModal.vue";
import WinnerOverlay from "~/components/WinnerOverlay.vue";
import CardOverlay from "~/components/CardOverlay.vue";
import ExchangeModal from "~/components/ExchangeModal.vue";
import { useI18n } from "~/composables/useI18n";
import {
  Group as ThreeGroup,
  InstancedMesh,
  Matrix4,
  Euler,
  Quaternion,
  Vector3,
} from "three";
import type { Group, Mesh, BufferGeometry, Material } from "three";
import type { ExchangeProposal } from "~/stores/gameStore";
import type { ExchangeProposalShape } from "~/components/ExchangeModal.vue";

const store = useGameStore();
const runtimeConfig = useRuntimeConfig();
const { t } = useI18n();

if (store.players.length === 0) {
  navigateTo("/");
}

const showTileCard = ref(false);
const showAuction = ref(false);
const showCardOverlay = ref(false);
const isResolvingCardEffect = ref(false);
const showExchange = ref(false);
const exchangeIsResponding = ref(false);
const exchangeSpectatorMode = ref(false);
const exchangeSpectatorResult = ref<"accepted" | "rejected" | null>(null);
let pendingBotExchangeResolve: ((result: BotExchangeResult) => void) | null =
  null;

const isTurnCompleteRef = computed(() => store.isTurnComplete);
const isAnyMovingRef = computed(() => store.isAnyMoving);
const BOT_CARD_READ_MS = 2600;
const botTurn = useBotTurn(isTurnCompleteRef, isAnyMovingRef, {
  onBotCardDrawn: waitForBotCardRead,
  onBotExchangeProposed: waitForBotExchangeResponse,
});
const currentTile = computed(
  () => useBoardStore().tiles[(store.casillaActual - 1 + 40) % 40],
);

const TAX_AMOUNTS: Record<number, number> = { 4: 200, 38: 100 };

async function waitForBotCardRead() {
  showCardOverlay.value = true;
  await new Promise((resolve) => setTimeout(resolve, BOT_CARD_READ_MS));
  showCardOverlay.value = false;
}

function resolvePendingBotExchange(result: BotExchangeResult) {
  if (!pendingBotExchangeResolve) return;
  const resolve = pendingBotExchangeResolve;
  pendingBotExchangeResolve = null;
  resolve(result);
}

function waitForBotExchangeResponse(
  proposal: ExchangeProposal,
): Promise<BotExchangeResult> {
  return new Promise((resolve) => {
    if (pendingBotExchangeResolve || store.exchangeProposal) {
      resolve("cancelled");
      return;
    }

    pendingBotExchangeResolve = resolve;
    store.startExchange(proposal);

    if (!store.exchangeProposal) {
      resolvePendingBotExchange("cancelled");
      return;
    }

    exchangeIsResponding.value = true;
    const target = store.players.find(
      (player) => player.id === proposal.toPlayerId,
    );
    exchangeSpectatorMode.value = !!target?.isBot;
    showExchange.value = true;
  });
}

function computeRent(tile: BoardTile, ownerId: number): number {
  return store.calculateRent(tile, ownerId);
}

const tileOwnerId = computed<number | undefined>(() => {
  const t = currentTile.value;
  if (t.type !== "property" && t.type !== "railroad" && t.type !== "utility")
    return undefined;
  return store.propertyOwners[t.index];
});

const tileOwnerName = computed(
  () => store.players.find((p) => p.id === tileOwnerId.value)?.name,
);

const tileOwnerColor = computed<string | undefined>(() => {
  if (tileOwnerId.value === undefined) return undefined;
  const owner = store.players.find((p) => p.id === tileOwnerId.value);
  if (!owner) return undefined;
  const token = GAME_CONFIG.TOKEN_MODELS.find(
    (t) => t.file === owner.tokenModel,
  );
  return token?.color;
});

const tileRentAmount = computed(() => {
  if (tileOwnerId.value === undefined) return undefined;
  return computeRent(currentTile.value, tileOwnerId.value);
});

const tileDevelopment = computed(() =>
  store.getPropertyDevelopment(currentTile.value.index),
);
const activePlayerId = computed(() => store.activePlayer?.id ?? -1);
const tileHouseCost = computed(() =>
  store.getHouseCost(currentTile.value.index),
);
const tileHotelCost = computed(() =>
  store.getHotelCost(currentTile.value.index),
);
const tileMortgageValue = computed(() =>
  store.getMortgageValue(currentTile.value.index),
);
const tileUnmortgageCost = computed(() =>
  store.getUnmortgageCost(currentTile.value.index),
);
const canBuildHouseOnTile = computed(() =>
  store.canBuildHouse(currentTile.value.index, activePlayerId.value),
);
const canBuildHotelOnTile = computed(() =>
  store.canBuildHotel(currentTile.value.index, activePlayerId.value),
);
const canSellImprovementOnTile = computed(() =>
  store.canSellImprovement(currentTile.value.index, activePlayerId.value),
);
const canMortgageTile = computed(() =>
  store.canMortgageProperty(currentTile.value.index, activePlayerId.value),
);
const canUnmortgageTile = computed(() =>
  store.canUnmortgageProperty(currentTile.value.index, activePlayerId.value),
);

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

    if (store.isCurrentPlayerBot) {
      botTurn.resolveBotLanding();
      return;
    }

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

    if (
      tile.type === "property" ||
      tile.type === "railroad" ||
      tile.type === "utility"
    ) {
      const ownerId = store.propertyOwners[tile.index];
      if (ownerId !== undefined && ownerId !== activeId) {
        const rent = computeRent(tile, ownerId);
        if (rent > 0) {
          store.collectRent(activeId, ownerId, rent);
        } else {
          store.setStatusMessage(t("tile.mortgagedNoRent"));
        }
      }
    }

    showTileCard.value = true;
  },
);

watch(
  () => store.winner,
  (w) => {
    if (w) showTileCard.value = false;
  },
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
  store.isAuctionActive = true;
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

function onBuildHouse() {
  store.buildHouse(currentTile.value.index, activePlayerId.value);
}

function onBuildHotel() {
  store.buildHotel(currentTile.value.index, activePlayerId.value);
}

function onSellImprovement() {
  store.sellImprovement(currentTile.value.index, activePlayerId.value);
}

function onMortgageTile() {
  store.mortgageProperty(currentTile.value.index, activePlayerId.value);
}

function onUnmortgageTile() {
  store.unmortgageProperty(currentTile.value.index, activePlayerId.value);
}

function onAuctionSold(winnerId: number, amount: number) {
  const tile = currentTile.value;
  store.buyAuctionedProperty(tile.index, winnerId, amount);
  store.isAuctionActive = false;
  store.clearBotThinking();
  showAuction.value = false;
  if (pendingDoublesTurn) {
    pendingDoublesTurn = false;
    store.finishTurnKeepPlayer();
  } else {
    store.finishTurn();
  }
}

function onAuctionUnsold() {
  store.isAuctionActive = false;
  store.clearBotThinking();
  showAuction.value = false;
  if (pendingDoublesTurn) {
    pendingDoublesTurn = false;
    store.finishTurnKeepPlayer();
  } else {
    store.finishTurn();
  }
}

function onCardClose() {
  void onCardAccept();
}

async function onCardAccept() {
  if (isResolvingCardEffect.value) return;
  if (!store.activeCard) return;
  isResolvingCardEffect.value = true;
  showCardOverlay.value = false;
  try {
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
    if (
      tile.type === "property" ||
      tile.type === "railroad" ||
      tile.type === "utility"
    ) {
      showTileCard.value = true;
    } else {
      if (pendingDoublesTurn) {
        pendingDoublesTurn = false;
        store.finishTurnKeepPlayer();
      } else {
        store.finishTurn();
      }
    }
  } finally {
    isResolvingCardEffect.value = false;
  }
}

const tableroScene = shallowRef<Group | null>(null);
const playerScenes = shallowRef<(Group | null)[]>([]);
const boardHouseInstancedGroup = shallowRef<Group | null>(null);
const boardHouseModels = shallowRef<Map<string, Group>>(new Map());

const fps = ref(0);
let fpsFrames = 0;
let fpsElapsedMs = 0;

const boardHouseModelVariantFiles = import.meta.glob(
  "../public/models/{casa_detallada,hotel_detallado}_*.glb",
  {
    eager: true,
    import: "default",
    query: "?url",
  },
) as Record<string, string>;

const availableBoardHouseModelPaths = new Set(
  Object.keys(boardHouseModelVariantFiles).map(
    (path) => `/models/${path.split("/").pop()}`,
  ),
);

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
const {
  getCasillaCoordinates,
  getPropertyBuildSlot,
  getPropertyBuildingSlots,
  getBoardLocalOffset,
} = useBoardGeometry();
const tileLabels = useTileLabels();

function getConfiguredBoardHousePlacements(): BoardHouseAssetPlacement[] {
  if (runtimeConfig.public.hideAllHouses) return [];
  if (runtimeConfig.public.showAllHouses) {
    return getAllPropertyHousePlacements(useBoardStore().tiles);
  }
  return getPropertyDevelopmentPlacements(store.propertyDevelopments);
}

const boardHousePlacements = computed(() =>
  getConfiguredBoardHousePlacements(),
);
const boardHouseTransforms = computed(() =>
  boardHousePlacements.value.map((placement) => {
    const definition = BOARD_HOUSE_ASSET_DEFINITIONS[placement.type];
    const buildSlots = placement.buildCount
      ? getPropertyBuildingSlots(placement.tileIndex, placement.buildCount)
      : [];
    const buildSlot = placement.buildCount
      ? buildSlots[placement.buildIndex ?? 0]
      : getPropertyBuildSlot(placement.tileIndex);
    const position =
      buildSlot?.position ?? getCasillaCoordinates(placement.tileIndex);
    const rotation = buildSlot?.rotation ?? { x: 0, y: 0, z: 0 };
    const localOffset = getBoardLocalOffset(
      placement.tileIndex,
      placement.inwardOffset ?? definition.defaultInwardOffset,
      placement.alongOffset ?? definition.defaultAlongOffset,
    );

    return {
      position: {
        x:
          position.x +
          localOffset.x +
          (placement.xOffset ?? definition.defaultXOffset),
        y: position.y + (placement.yOffset ?? definition.defaultYOffset),
        z:
          position.z +
          localOffset.z +
          (placement.zOffset ?? definition.defaultZOffset),
      },
      rotation: {
        x: rotation.x,
        y: rotation.y + (placement.rotationYOffset ?? 0),
        z: rotation.z,
      },
      scale: placement.scale ?? definition.defaultScale,
    };
  }),
);

interface BoardHouseLeaf {
  geometry: BufferGeometry;
  material: Material | Material[];
  matrix: Matrix4;
}

const boardHouseLeafCache = new Map<string, BoardHouseLeaf[]>();
const _placementMatrix = new Matrix4();
const _instanceMatrix = new Matrix4();
const _instancePosition = new Vector3();
const _instanceQuaternion = new Quaternion();
const _instanceEuler = new Euler();
const _instanceScale = new Vector3();

// Extrae las mallas hoja del modelo fuente con su transform relativo a la raiz,
// replicando lo que hacia `<primitive :object>` al clonar la escena.
function getBoardHouseLeaves(
  modelKey: string,
  source: Group,
): BoardHouseLeaf[] {
  const cached = boardHouseLeafCache.get(modelKey);
  if (cached) return cached;

  source.position.set(0, 0, 0);
  source.rotation.set(0, 0, 0);
  source.scale.set(1, 1, 1);
  source.updateMatrixWorld(true);

  const leaves: BoardHouseLeaf[] = [];
  source.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) return;
    leaves.push({
      geometry: mesh.geometry,
      material: mesh.material,
      matrix: mesh.matrixWorld.clone(),
    });
  });

  boardHouseLeafCache.set(modelKey, leaves);
  return leaves;
}

// Construye un unico grupo de InstancedMesh: todas las construcciones que comparten
// modelo se dibujan en una sola draw call por malla, sin importar cuantas haya.
function rebuildBoardHouseInstances() {
  const models = boardHouseModels.value;
  const placements = boardHousePlacements.value;
  const transforms = boardHouseTransforms.value;

  const groupedByModel = new Map<
    string,
    { source: Group; indices: number[] }
  >();

  placements.forEach((placement, idx) => {
    const group = getBoardHouseAssetGroup(placement.tileIndex, useBoardStore().tiles);
    const modelKey = getBoardHouseAssetKey(placement.type, group);
    const source = models.get(modelKey) ?? models.get(placement.type);
    if (!source) return;

    const entry = groupedByModel.get(modelKey);
    if (entry) {
      entry.indices.push(idx);
    } else {
      groupedByModel.set(modelKey, { source, indices: [idx] });
    }
  });

  const container = new ThreeGroup();

  for (const [modelKey, { source, indices }] of groupedByModel) {
    const leaves = getBoardHouseLeaves(modelKey, source);

    for (const leaf of leaves) {
      const instanced = new InstancedMesh(
        leaf.geometry,
        leaf.material,
        indices.length,
      );
      instanced.frustumCulled = false;

      indices.forEach((placementIdx, i) => {
        const transform = transforms[placementIdx];
        _instancePosition.set(
          transform.position.x,
          transform.position.y,
          transform.position.z,
        );
        _instanceEuler.set(
          transform.rotation.x,
          transform.rotation.y,
          transform.rotation.z,
        );
        _instanceQuaternion.setFromEuler(_instanceEuler);
        _instanceScale.setScalar(transform.scale);
        _placementMatrix.compose(
          _instancePosition,
          _instanceQuaternion,
          _instanceScale,
        );
        _instanceMatrix.multiplyMatrices(_placementMatrix, leaf.matrix);
        instanced.setMatrixAt(i, _instanceMatrix);
      });

      instanced.instanceMatrix.needsUpdate = true;
      container.add(instanced);
    }
  }

  const previous = boardHouseInstancedGroup.value;
  boardHouseInstancedGroup.value = container;

  if (previous) {
    previous.traverse((child) => {
      const instanced = child as InstancedMesh;
      if (instanced.isInstancedMesh) instanced.dispose();
    });
  }
}

watch(boardHousePlacements, rebuildBoardHouseInstances, { deep: true });

async function loadGltfScene(
  loader: GLTFLoader,
  modelPath: string,
): Promise<Group> {
  return (await loader.loadAsync(modelPath)).scene as Group;
}

async function loadOptionalGltfScene(
  loader: GLTFLoader,
  modelPath: string,
): Promise<Group | null> {
  if (!availableBoardHouseModelPaths.has(modelPath)) return null;
  return await loadGltfScene(loader, modelPath);
}

async function loadBoardHouseModels(
  loader: GLTFLoader,
): Promise<Map<string, Group>> {
  const models = new Map<string, Group>();
  const types = Object.keys(
    BOARD_HOUSE_ASSET_DEFINITIONS,
  ) as BoardHouseAssetType[];

  for (const type of types) {
    const definition = BOARD_HOUSE_ASSET_DEFINITIONS[type];
    const fallbackScene = await loadGltfScene(loader, definition.modelPath);
    models.set(getBoardHouseAssetKey(type), fallbackScene);

    for (const group of BOARD_HOUSE_ASSET_GROUPS) {
      const groupScene =
        (await loadOptionalGltfScene(
          loader,
          getBoardHouseGroupModelPath(type, group),
        )) ?? fallbackScene;

      models.set(getBoardHouseAssetKey(type, group), groupScene);
    }
  }

  return models;
}

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

  fpsFrames += 1;
  fpsElapsedMs += deltaMs;
  if (fpsElapsedMs >= 500) {
    fps.value = Math.round((fpsFrames * 1000) / fpsElapsedMs);
    fpsFrames = 0;
    fpsElapsedMs = 0;
  }

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
    store.setStatusMessage(t("game.status.loadingAssets"));

    const tokenModels = store.players.map((p) => p.tokenModel);
    const loadResults = await Promise.all(
      tokenModels.map((file) => loader.loadAsync(`/models/users/${file}`)),
    );

    tableroScene.value = (await loader.loadAsync("/models/tablero.glb"))
      .scene as Group;

    boardHouseLeafCache.clear();
    boardHouseModels.value = await loadBoardHouseModels(loader);
    rebuildBoardHouseInstances();

    playerScenes.value = loadResults.map((gltf) => gltf.scene as Group);

    for (let i = 0; i < playerCount; i++) {
      const coords = getCasillaCoordinates(store.players[i]?.position ?? 0);
      setPosition(i, coords);
      displayPositions[i].x = coords.x;
      displayPositions[i].y = coords.y;
      displayPositions[i].z = coords.z;
    }

    store.setStatusMessage(t("game.status.ready"));
    nextTick(() => {
      if (store.isCurrentPlayerBot && store.phase === "playing") {
        botTurn.startBotTurn();
      }
    });
  } catch (error) {
    store.setStatusMessage(t("game.status.assetsError"));
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

  if (store.doublesGiveExtraTurn) {
    const isExtraTurn = store.checkDoubles();
    if (player.inJail) {
      pendingDoublesTurn = false;
      return;
    }
    if (isExtraTurn) {
      pendingDoublesTurn = true;
    }
  }

  store.moveCurrentPlayer(value);
}

function onSkipMove() {
  store.skipCurrentMovement();
}

let pendingDoublesTurn = false;

watch(
  () => store.activePlayerIndex,
  () => {
    pendingDoublesTurn = false;
    nextTick(() => {
      if (store.isCurrentPlayerBot && store.phase === "playing") {
        botTurn.startBotTurn();
      }
    });
  },
);

function onNextTurn() {
  showTileCard.value = false;
  const activePlayer = store.activePlayer;
  if (activePlayer && activePlayer.cash < 0) {
    store.setStatusMessage(
      t("game.status.debt", {
        player: activePlayer.name,
        amount: Math.abs(activePlayer.cash),
      }),
    );
    return;
  }
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

function onOpenExchange() {
  showExchange.value = true;
  exchangeIsResponding.value = false;
}

function onExchangePropose(proposal: ExchangeProposalShape) {
  store.startExchange(proposal as ExchangeProposal);
  exchangeIsResponding.value = true;
}

function onExchangeAccept() {
  store.respondExchange(true);
  showExchange.value = false;
  exchangeIsResponding.value = false;
  exchangeSpectatorMode.value = false;
  exchangeSpectatorResult.value = null;
  resolvePendingBotExchange("accepted");
}

function onExchangeReject() {
  store.respondExchange(false);
  showExchange.value = false;
  exchangeIsResponding.value = false;
  exchangeSpectatorMode.value = false;
  exchangeSpectatorResult.value = null;
  resolvePendingBotExchange("rejected");
}

function onExchangeCancel() {
  if (store.exchangeProposal) {
    store.cancelExchange();
  }
  showExchange.value = false;
  exchangeIsResponding.value = false;
  exchangeSpectatorMode.value = false;
  exchangeSpectatorResult.value = null;
  resolvePendingBotExchange("cancelled");
}

watch(
  () => store.exchangeProposal,
  (proposal) => {
    if (!proposal) return;
    const toPlayer = store.players.find((p) => p.id === proposal.toPlayerId);
    if (toPlayer?.isBot && toPlayer.botDifficulty) {
      const response = getBotExchangeResponse(proposal);
      setTimeout(() => {
        if (store.exchangeProposal !== proposal) return;
        if (response.action === "renegotiate" && response.counterProposal) {
          store.startExchange(response.counterProposal);
          if (!store.exchangeProposal) {
            resolvePendingBotExchange("cancelled");
            return;
          }
          const nextTarget = store.players.find(
            (p) => p.id === response.counterProposal!.toPlayerId,
          );
          exchangeIsResponding.value = true;
          exchangeSpectatorMode.value = !!nextTarget?.isBot;
          showExchange.value = true;
          return;
        }

        const accepted = response.action === "accept";
        if (exchangeSpectatorMode.value) {
          exchangeSpectatorResult.value = accepted ? "accepted" : "rejected";
          setTimeout(() => {
            store.respondExchange(accepted);
            showExchange.value = false;
            exchangeIsResponding.value = false;
            exchangeSpectatorMode.value = false;
            exchangeSpectatorResult.value = null;
            resolvePendingBotExchange(accepted ? "accepted" : "rejected");
          }, 800);
        } else {
          store.respondExchange(accepted);
          showExchange.value = false;
          exchangeIsResponding.value = false;
          resolvePendingBotExchange(accepted ? "accepted" : "rejected");
        }
      }, 1200);
    }
  },
);

watch(
  () => store.isAuctionActive,
  (active) => {
    if (!active || !currentTile.value) {
      if (!active) showAuction.value = false;
      return;
    }
    showTileCard.value = false;
    showAuction.value = true;
  },
);
</script>
