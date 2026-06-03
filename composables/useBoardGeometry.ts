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

  // Centro geometrico REAL de cada casilla, derivado del modelo de Blender
  // (scripts_blenders/create_monopoly_table.py). El tablero esta centrado en
  // (0,0) y mide BOARD_SIZE. Se calcula en coordenadas de Blender (Z-up) y se
  // convierte a three.js (Y-up) con: x = bx, z = -by.
  const BOARD_SIZE = 4.5;
  const BOARD_HALF = BOARD_SIZE / 2;
  const CORNER_SIZE = 0.45;
  const TILE_WIDTH = (BOARD_SIZE - CORNER_SIZE * 2) / 9;
  const TILE_DEPTH = 0.45;

  const getTileCenter = (idx: number): { x: number; z: number } => {
    const H = BOARD_HALF;
    const rem = idx % 10;
    const step = CORNER_SIZE + (rem - 0.5) * TILE_WIDTH;

    let bx: number;
    let by: number;

    if (idx === 0) {
      bx = -H + CORNER_SIZE / 2;
      by = -H + CORNER_SIZE / 2;
    } else if (idx === 10) {
      bx = H - CORNER_SIZE / 2;
      by = -H + CORNER_SIZE / 2;
    } else if (idx === 20) {
      bx = H - CORNER_SIZE / 2;
      by = H - CORNER_SIZE / 2;
    } else if (idx === 30) {
      bx = -H + CORNER_SIZE / 2;
      by = H - CORNER_SIZE / 2;
    } else {
      const side = Math.floor(idx / 10);
      if (side === 0) {
        // Lado inferior (izquierda -> derecha)
        bx = -H + step;
        by = -H + TILE_DEPTH / 2;
      } else if (side === 1) {
        // Lado derecho (abajo -> arriba)
        bx = H - TILE_DEPTH / 2;
        by = -H + step;
      } else if (side === 2) {
        // Lado superior (derecha -> izquierda)
        bx = H - step;
        by = H - TILE_DEPTH / 2;
      } else {
        // Lado izquierdo (arriba -> abajo)
        bx = -H + TILE_DEPTH / 2;
        by = H - step;
      }
    }

    return { x: bx, z: -by };
  };

  const getTileLabelTransform = (
    casillaIndex: number,
  ): {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
  } => {
    const idx = ((casillaIndex % 40) + 40) % 40;
    const base = getTileCenter(idx);
    const labelY = ySuelo + GAME_CONFIG.LABEL_Y_OFFSET;

    const inward = GAME_CONFIG.LABEL_INWARD_OFFSET;
    const along = GAME_CONFIG.LABEL_ALONG_OFFSET;
    const cornerInward = GAME_CONFIG.LABEL_CORNER_INWARD_OFFSET;

    // El tablero esta centrado en (0,0). Para cada lado calculamos por separado:
    //  - offX/offZ: desplazamiento de la etiqueta (hacia el interior + ajuste a lo
    //    largo del lado), independiente de la rotacion del texto.
    //  - rotZ: orientacion del texto para que se lea desde fuera hacia el centro,
    //    igual que el lado inferior (la referencia que se lee bien).
    let rotZ: number;
    let offX = 0;
    let offZ = 0;

    if (idx === 0) {
      // Esquina GO/Salida (inferior-izquierda)
      rotZ = Math.PI / 4;
      offX = cornerInward;
      offZ = -cornerInward;
    } else if (idx < 10) {
      // Lado 1 (inferior): interior = -Z, recorrido en +X
      rotZ = 0;
      offZ = -inward;
      offX = along;
    } else if (idx === 10) {
      // Esquina Carcel/Visita (inferior-derecha)
      rotZ = -Math.PI / 4;
      offX = -cornerInward;
      offZ = -cornerInward;
    } else if (idx < 20) {
      // Lado 2 (derecho): interior = -X, recorrido en -Z
      rotZ = Math.PI / 2;
      offX = -inward;
      offZ = along;
    } else if (idx === 20) {
      // Esquina Parking Gratuito (superior-derecha)
      rotZ = (-3 * Math.PI) / 4;
      offX = -cornerInward;
      offZ = cornerInward;
    } else if (idx < 30) {
      // Lado 3 (superior): interior = +Z, recorrido en -X
      rotZ = Math.PI;
      offZ = inward;
      offX = -along;
    } else if (idx === 30) {
      // Esquina Ve-a-la-Carcel (superior-izquierda)
      rotZ = (3 * Math.PI) / 4;
      offX = cornerInward;
      offZ = cornerInward;
    } else {
      // Lado 4 (izquierdo): interior = +X, recorrido en +Z
      rotZ = -Math.PI / 2;
      offX = inward;
      offZ = -along;
    }

    const position = {
      x: base.x + offX,
      y: labelY,
      z: base.z + offZ,
    };

    const rotation = { x: -Math.PI / 2, y: 0, z: rotZ };

    return { position, rotation };
  };

  return {
    getCasillaCoordinates,
    getTileLabelTransform,
  };
}
