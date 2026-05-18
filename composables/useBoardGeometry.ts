export function useBoardGeometry(playerIndex: number = 0) {
  const ySuelo = 0;
  const inicioX = 0.1;
  const inicioZ = -0.1;
  const pasoCasilla = 0.4;

  const PLAYER_OFFSET = 0.12;

  const applyOffset = (coords: { x: number; y: number; z: number }) => {
    if (playerIndex === 0) return coords;
    return {
      x: coords.x + PLAYER_OFFSET,
      y: coords.y,
      z: coords.z + PLAYER_OFFSET,
    };
  };

  const getCasillaCoordinates = (casillaIndex: number) => {
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

    return applyOffset(coords);
  };

  return {
    getCasillaCoordinates,
  };
}
