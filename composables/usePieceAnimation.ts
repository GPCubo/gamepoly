import { Y_SUELO } from "./useBoardGeometry";

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

export function usePieceAnimation() {
  const hops: Record<1 | 2, HopAnimation> = {
    1: createDefaultHop(),
    2: createDefaultHop(),
  };

  const positions: Record<
    1 | 2,
    { x: number; y: number; z: number }
  > = {
    1: { x: 0, y: Y_SUELO, z: 0 },
    2: { x: 0, y: Y_SUELO, z: 0 },
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

  function tick(deltaMs: number) {
    for (const idx of [1, 2] as const) {
      const hop = hops[idx];
      if (!hop.active) continue;

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
  }

  function getCurrentPosition(playerIndex: 1 | 2) {
    return positions[playerIndex];
  }

  function isAnimating(playerIndex: 1 | 2) {
    return hops[playerIndex].active;
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
    tick,
    getCurrentPosition,
    isAnimating,
    setPosition,
  };
}