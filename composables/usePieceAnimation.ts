import { Y_SUELO } from "./useBoardGeometry";
import { GAME_CONFIG } from "~/config/gameConfig";

const HOP_DURATION_MS = 250;
const HOP_HEIGHT = 0.15;

interface HopAnimation {
  active: boolean;
  fromX: number;
  fromY: number;
  fromZ: number;
  toX: number;
  toY: number;
  toZ: number;
  progress: number;
}

interface GrowAnimation {
  active: boolean;
  fromScale: number;
  toScale: number;
  progress: number;
}

function createDefaultHop(): HopAnimation {
  return {
    active: false,
    fromX: 0,
    fromY: Y_SUELO,
    fromZ: 0,
    toX: 0,
    toY: Y_SUELO,
    toZ: 0,
    progress: 0,
  };
}

function createDefaultGrow(): GrowAnimation {
  return {
    active: false,
    fromScale: GAME_CONFIG.DEFAULT_SCALE,
    toScale: GAME_CONFIG.DEFAULT_SCALE,
    progress: 0,
  };
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function usePieceAnimation() {
  const hops: Record<1 | 2, HopAnimation> = {
    1: createDefaultHop(),
    2: createDefaultHop(),
  };

  const grows: Record<1 | 2, GrowAnimation> = {
    1: createDefaultGrow(),
    2: createDefaultGrow(),
  };

  const positions: Record<
    1 | 2,
    { x: number; y: number; z: number }
  > = {
    1: { x: 0, y: Y_SUELO, z: 0 },
    2: { x: 0, y: Y_SUELO, z: 0 },
  };

  const scales: Record<1 | 2, number> = {
    1: GAME_CONFIG.DEFAULT_SCALE,
    2: GAME_CONFIG.DEFAULT_SCALE,
  };

  function startHop(
    playerIndex: 1 | 2,
    from: { x: number; y: number; z: number },
    to: { x: number; y: number; z: number },
  ) {
    const hop = hops[playerIndex];

    if (hop.active) {
      positions[playerIndex].x = hop.toX;
      positions[playerIndex].y = hop.toY;
      positions[playerIndex].z = hop.toZ;
    }

    hop.active = true;
    hop.fromX = from.x;
    hop.fromY = from.y;
    hop.fromZ = from.z;
    hop.toX = to.x;
    hop.toY = to.y;
    hop.toZ = to.z;
    hop.progress = 0;
  }

  function startGrow(playerIndex: 1 | 2) {
    const grow = grows[playerIndex];
    grow.active = true;
    grow.fromScale = GAME_CONFIG.SHARED_TILE_SCALE;
    grow.toScale = GAME_CONFIG.DEFAULT_SCALE;
    grow.progress = 0;
  }

  function cancelGrow(playerIndex: 1 | 2) {
    grows[playerIndex].active = false;
    scales[playerIndex] = GAME_CONFIG.SHARED_TILE_SCALE;
  }

  function tick(deltaMs: number) {
    for (const idx of [1, 2] as const) {
      const hop = hops[idx];
      if (hop.active) {
        hop.progress += deltaMs / HOP_DURATION_MS;

        if (hop.progress >= 1) {
          hop.progress = 1;
          hop.active = false;
        }

        const t = hop.progress;
        const arcY = Math.sin(Math.PI * t) * HOP_HEIGHT;

        positions[idx].x =
          hop.fromX + (hop.toX - hop.fromX) * t;
        positions[idx].y =
          hop.fromY + (hop.toY - hop.fromY) * t + arcY;
        positions[idx].z =
          hop.fromZ + (hop.toZ - hop.fromZ) * t;
      }

      const grow = grows[idx];
      if (grow.active) {
        grow.progress += deltaMs / GAME_CONFIG.GROW_DURATION_MS;

        if (grow.progress >= 1) {
          grow.progress = 1;
          grow.active = false;
        }

        const t = grow.progress;
        const easedT = easeOutBack(t);
        scales[idx] =
          grow.fromScale + (grow.toScale - grow.fromScale) * easedT;
      }
    }
  }

  function getCurrentPosition(playerIndex: 1 | 2) {
    return positions[playerIndex];
  }

  function getCurrentScale(playerIndex: 1 | 2) {
    return scales[playerIndex];
  }

  function isAnimating(playerIndex: 1 | 2) {
    return hops[playerIndex].active;
  }

  function setScale(playerIndex: 1 | 2, scale: number) {
    scales[playerIndex] = scale;
  }

  function setPosition(
    playerIndex: 1 | 2,
    pos: { x: number; y: number; z: number },
  ) {
    positions[playerIndex].x = pos.x;
    positions[playerIndex].y = pos.y;
    positions[playerIndex].z = pos.z;
  }

  return {
    startHop,
    startGrow,
    cancelGrow,
    tick,
    getCurrentPosition,
    getCurrentScale,
    isAnimating,
    setPosition,
    setScale,
  };
}