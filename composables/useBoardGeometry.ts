export const Y_SUELO = 0.82;

import { GAME_CONFIG } from "~/config/gameConfig";

export function useBoardGeometry() {
  const ySuelo = Y_SUELO;
  const inicioX = 0.1;
  const inicioZ = -0.1;
  const pasoCasilla = 0.4;

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

    coords.x += GAME_CONFIG.PIECE_ORIGIN_OFFSET.x;
    coords.z += GAME_CONFIG.PIECE_ORIGIN_OFFSET.z;

    return coords;
  };

  const getTileLabelTransform = (
    casillaIndex: number,
  ): {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
  } => {
    const idx = ((casillaIndex % 40) + 40) % 40;
    const base = getCasillaCoordinates(casillaIndex);
    const labelY = ySuelo + GAME_CONFIG.LABEL_Y_OFFSET;
    const isCorner = [0, 10, 20, 30].includes(idx);

    const localOffX = isCorner
      ? GAME_CONFIG.LABEL_CORNER_PADDING_X
      : GAME_CONFIG.LABEL_PADDING_X;
    const localOffZ = isCorner
      ? GAME_CONFIG.LABEL_CORNER_PADDING_Z
      : GAME_CONFIG.LABEL_PADDING_Z;

    let rotZ: number;

    if (idx === 0) {
      // Esquina GO/Salida (inferior-izquierda): diagonal apuntando hacia afuera
      rotZ = Math.PI / 4;
    } else if (idx < 10) {
      rotZ = 0;
    } else if (idx === 10) {
      // Esquina Carcel/Visita (inferior-derecha): diagonal opuesta a GO
      rotZ = -Math.PI / 4;
    } else if (idx < 20) {
      rotZ = -Math.PI / 2;
    } else if (idx === 20) {
      // Esquina Parking Gratuito (superior-derecha)
      rotZ = (-3 * Math.PI) / 4;
    } else if (idx < 30) {
      rotZ = Math.PI;
    } else if (idx === 30) {
      // Esquina Ve-a-la-Carcel (superior-izquierda)
      rotZ = (3 * Math.PI) / 4;
    } else {
      rotZ = Math.PI / 2;
    }

    const cosZ = Math.cos(rotZ);
    const sinZ = Math.sin(rotZ);
    const worldOffX = localOffX * cosZ - localOffZ * sinZ;
    const worldOffZ = localOffX * sinZ + localOffZ * cosZ;

    const position = {
      x: base.x + worldOffX,
      y: labelY,
      z: base.z + worldOffZ,
    };

    // getCasillaCoordinates tiene un offset sistematico de 0.05 respecto al centro
    // real del tile. La correccion se aplica por eje (no rotada) porque el signo
    // del error es consistente independientemente del sentido de recorrido del lado.
    if (!isCorner) {
      if (idx < 10 || (idx >= 20 && idx < 30)) {
        position.x += 0.05;  // lados inferior y superior: error en eje X
      } else {
        position.z -= 0.05;  // lados derecho e izquierdo: error en eje Z
      }
    }

    const rotation = { x: -Math.PI / 2, y: 0, z: rotZ };

    return { position, rotation };
  };

  return {
    getCasillaCoordinates,
    getTileLabelTransform,
  };
}
