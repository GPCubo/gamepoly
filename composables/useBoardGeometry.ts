export function useBoardGeometry() {
  const ySuelo = 0.82;
  const inicioX = 0.1;
  const inicioZ = -0.1;
  const pasoCasilla = 0.4;

  const PLAYER_OFFSETS: Record<1 | 2, { x: number; z: number }> = {
    1: { x: -2.15, z: 2.15 },
    2: { x: -2.15, z: 2.15 },
  };

  const getCasillaCoordinates = (casillaIndex: number, playerIndex?: 1 | 2) => {
    const indexNormalizado = casillaIndex % 40;

    let coords: { x: number; y: number; z: number };

    if (indexNormalizado === 0) {
      coords = { x: inicioX, y: ySuelo, z: inicioZ };
    } else if (indexNormalizado < 10) {
      coords = {
        x: inicioX + indexNormalizado * pasoCasilla,
        y: ySuelo,
        z: inicioZ + 0.05,
      };
    } else if (indexNormalizado < 20) {
      const esquina1X = inicioX + 10 * pasoCasilla;
      coords = {
        x: esquina1X + 0.1,
        y: ySuelo,
        z: inicioZ - (indexNormalizado - 10) * pasoCasilla,
      };
    } else if (indexNormalizado < 30) {
      const esquina1X = inicioX + 10 * pasoCasilla;
      const esquina2Z = inicioZ - 10 * pasoCasilla;
      coords = {
        x: esquina1X - (indexNormalizado - 20) * pasoCasilla,
        y: ySuelo,
        z: esquina2Z - 0.1,
      };
    } else {
      const esquina2Z = inicioZ - 10 * pasoCasilla;
      coords = {
        x: inicioX - 0.05,
        y: ySuelo,
        z: esquina2Z + (indexNormalizado - 30) * pasoCasilla,
      };
    }

    if (playerIndex !== undefined) {
      coords.x += PLAYER_OFFSETS[playerIndex].x;
      coords.z += PLAYER_OFFSETS[playerIndex].z;
    }

    return coords;
  };

  return {
    getCasillaCoordinates,
  };
}
