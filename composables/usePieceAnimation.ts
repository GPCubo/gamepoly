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
  const hops: Record<number, HopAnimation> = {};
  const grows: Record<number, GrowAnimation> = {};
  const positions: Record<number, { x: number; y: number; z: number }> = {};
  const scales: Record<number, number> = {};
  let playerCount = 0;

  function init(count: number) {
    playerCount = count;
    for (let i = 0; i < count; i++) {
      hops[i] = createDefaultHop();
      grows[i] = createDefaultGrow();
      positions[i] = { x: 0, y: Y_SUELO, z: 0 };
      scales[i] = GAME_CONFIG.DEFAULT_SCALE;
    }
  }

  function startHop(
    playerIndex: number,
    from: { x: number; y: number; z: number },
    to: { x: number; y: number; z: number },
  ) {
    const hop = hops[playerIndex];
    if (!hop) return;

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

  function startGrow(playerIndex: number) {
    const grow = grows[playerIndex];
    if (!grow) return;
    grow.active = true;
    grow.fromScale = GAME_CONFIG.SHARED_TILE_SCALE;
    grow.toScale = GAME_CONFIG.DEFAULT_SCALE;
    grow.progress = 0;
  }

  function cancelGrow(playerIndex: number) {
    const grow = grows[playerIndex];
    if (!grow) return;
    grow.active = false;
    scales[playerIndex] = GAME_CONFIG.SHARED_TILE_SCALE;
  }

  function tick(deltaMs: number) {
    for (let idx = 0; idx < playerCount; idx++) {
      const hop = hops[idx];
      if (hop.active) {
        hop.progress += deltaMs / HOP_DURATION_MS;

        if (hop.progress >= 1) {
          hop.progress = 1;
          hop.active = false;
        }

        const t = hop.progress;
        const arcY = Math.sin(Math.PI * t) * HOP_HEIGHT;

        positions[idx].x = hop.fromX + (hop.toX - hop.fromX) * t;
        positions[idx].y = hop.fromY + (hop.toY - hop.fromY) * t + arcY;
        positions[idx].z = hop.fromZ + (hop.toZ - hop.fromZ) * t;
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

  function getCurrentPosition(playerIndex: number) {
    return positions[playerIndex];
  }

  function getCurrentScale(playerIndex: number) {
    return scales[playerIndex];
  }

  function isAnimating(playerIndex: number) {
    const hop = hops[playerIndex];
    return hop ? hop.active : false;
  }

  function setScale(playerIndex: number, scale: number) {
    scales[playerIndex] = scale;
  }

  function setPosition(
    playerIndex: number,
    pos: { x: number; y: number; z: number },
  ) {
    positions[playerIndex].x = pos.x;
    positions[playerIndex].y = pos.y;
    positions[playerIndex].z = pos.z;
  }

  return {
    init,
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
