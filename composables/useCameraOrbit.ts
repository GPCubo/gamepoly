export const BOARD_CENTER_X = 2.1;
export const BOARD_CENTER_Z = -2.1;
export const CAM_DISTANCE = 6.0;
export const CAM_HEIGHT = 4.5;
export const CAM_LERP = 0.04;

export function useCameraOrbit() {
  function getSideIndex(casillaIndex: number): 0 | 1 | 2 | 3 {
    const normalized = ((casillaIndex % 40) + 40) % 40;

    if (normalized < 10) return 0;
    if (normalized < 20) return 1;
    if (normalized < 30) return 2;
    return 3;
  }

  function getCameraPosition(
    casillaIndex: number,
    playerPos: { x: number; z: number },
  ): { x: number; y: number; z: number } {
    const side = getSideIndex(casillaIndex);

    switch (side) {
      case 0:
        return {
          x: playerPos.x,
          y: CAM_HEIGHT,
          z: BOARD_CENTER_Z + CAM_DISTANCE,
        };
      case 1:
        return {
          x: BOARD_CENTER_X + CAM_DISTANCE,
          y: CAM_HEIGHT,
          z: playerPos.z,
        };
      case 2:
        return {
          x: playerPos.x,
          y: CAM_HEIGHT,
          z: BOARD_CENTER_Z - CAM_DISTANCE,
        };
      case 3:
        return {
          x: BOARD_CENTER_X - CAM_DISTANCE,
          y: CAM_HEIGHT,
          z: playerPos.z,
        };
    }
  }

  return {
    getSideIndex,
    getCameraPosition,
  };
}