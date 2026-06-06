export const Y_SUELO = 0.82;

import { BOARD_TILES } from "~/config/boardTilesConfig";
import { GAME_CONFIG } from "~/config/gameConfig";
import type { BoardTile, TileGroup } from "~/config/boardTilesConfig";

export type PropertyColorGroup = Extract<
  TileGroup,
  | "brown"
  | "lightBlue"
  | "pink"
  | "orange"
  | "red"
  | "yellow"
  | "green"
  | "darkBlue"
>;

export interface BoardBuildArea {
  group: PropertyColorGroup;
  tileIndexes: number[];
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  width: number;
  depth: number;
}

export interface BoardBuildSlot {
  group: PropertyColorGroup;
  tileIndex: number;
  slotIndex: number;
  slotCount: number;
  area: BoardBuildArea;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
}

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
  const BAND_DEPTH = 0.10;
  const WHITE_RELIEF_DEPTH = TILE_DEPTH - BAND_DEPTH;
  const BUILD_Y_OFFSET = GAME_CONFIG.LABEL_Y_OFFSET + 0.015;

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

  const PROPERTY_COLOR_GROUPS = new Set<PropertyColorGroup>([
    "brown",
    "lightBlue",
    "pink",
    "orange",
    "red",
    "yellow",
    "green",
    "darkBlue",
  ]);

  const isPropertyColorGroup = (group: TileGroup): group is PropertyColorGroup =>
    PROPERTY_COLOR_GROUPS.has(group as PropertyColorGroup);

  const getTileSide = (idx: number): 0 | 1 | 2 | 3 =>
    Math.floor((((idx % 40) + 40) % 40) / 10) as 0 | 1 | 2 | 3;

  const getBuildYaw = (side: 0 | 1 | 2 | 3): number => {
    if (side === 0) return 0;
    if (side === 1) return -Math.PI / 2;
    if (side === 2) return Math.PI;
    return Math.PI / 2;
  };

  const applyTileDepthOffset = (
    center: { x: number; z: number },
    side: 0 | 1 | 2 | 3,
    localY: number,
  ): { x: number; z: number } => {
    if (side === 0) return { x: center.x, z: center.z - localY };
    if (side === 1) return { x: center.x - localY, z: center.z };
    if (side === 2) return { x: center.x, z: center.z + localY };
    return { x: center.x + localY, z: center.z };
  };

  const applySideLengthOffset = (
    center: { x: number; z: number },
    side: 0 | 1 | 2 | 3,
    localX: number,
  ): { x: number; z: number } => {
    if (side === 0) return { x: center.x + localX, z: center.z };
    if (side === 1) return { x: center.x, z: center.z - localX };
    if (side === 2) return { x: center.x - localX, z: center.z };
    return { x: center.x, z: center.z + localX };
  };

  const getPropertyTilesByGroup = (
    group: PropertyColorGroup,
    tiles: BoardTile[] = BOARD_TILES,
  ): BoardTile[] =>
    tiles
      .filter((tile) => tile.type === "property" && tile.group === group)
      .sort((a, b) => a.index - b.index);

  const getPropertyGroupBuildArea = (
    group: PropertyColorGroup,
    tiles: BoardTile[] = BOARD_TILES,
  ): BoardBuildArea | null => {
    const groupTiles = getPropertyTilesByGroup(group, tiles);
    if (groupTiles.length === 0) return null;

    const first = groupTiles[0].index;
    const last = groupTiles[groupTiles.length - 1].index;
    const side = getTileSide(first);
    const firstRem = first % 10;
    const lastRem = last % 10;
    const spanSlots = lastRem - firstRem + 1;

    const firstCenter = getTileCenter(first);
    const lastCenter = getTileCenter(last);
    const baseCenter = {
      x: (firstCenter.x + lastCenter.x) / 2,
      z: (firstCenter.z + lastCenter.z) / 2,
    };

    // En create_monopoly_table.py, la franja blanca de cada propiedad queda
    // entre el borde exterior y la banda de color. Este centro local apunta a
    // esa franja completa, no al centro de una casilla individual.
    const whiteReliefCenterLocalY = -BAND_DEPTH / 2;
    const areaCenter = applyTileDepthOffset(baseCenter, side, whiteReliefCenterLocalY);

    return {
      group,
      tileIndexes: groupTiles.map((tile) => tile.index),
      position: {
        x: areaCenter.x,
        y: ySuelo + BUILD_Y_OFFSET,
        z: areaCenter.z,
      },
      rotation: { x: 0, y: getBuildYaw(side), z: 0 },
      width: spanSlots * TILE_WIDTH,
      depth: WHITE_RELIEF_DEPTH,
    };
  };

  const getPropertyGroupBuildSlots = (
    group: PropertyColorGroup,
    slotCount: number,
    tiles: BoardTile[] = BOARD_TILES,
  ): BoardBuildSlot[] => {
    const area = getPropertyGroupBuildArea(group, tiles);
    if (!area || slotCount <= 0) return [];

    const groupTiles = getPropertyTilesByGroup(group, tiles);
    const side = getTileSide(groupTiles[0].index);
    const slotSpacing = area.width / slotCount;
    const start = -area.width / 2 + slotSpacing / 2;

    return Array.from({ length: slotCount }, (_, slotIndex) => {
      const localX = start + slotIndex * slotSpacing;
      const slotXZ = applySideLengthOffset(area.position, side, localX);

      return {
        group,
        tileIndex: groupTiles[slotIndex]?.index ?? groupTiles[0].index,
        slotIndex,
        slotCount,
        area,
        position: {
          x: slotXZ.x,
          y: area.position.y,
          z: slotXZ.z,
        },
        rotation: area.rotation,
      };
    });
  };

  const getPropertyBuildSlot = (
    tileIndex: number,
    tiles: BoardTile[] = BOARD_TILES,
  ): BoardBuildSlot | null => {
    const tile = tiles.find((candidate) => candidate.index === tileIndex);
    if (!tile || tile.type !== "property" || !isPropertyColorGroup(tile.group)) return null;

    const groupTiles = getPropertyTilesByGroup(tile.group, tiles);
    const slotIndex = groupTiles.findIndex((candidate) => candidate.index === tileIndex);
    const slots = getPropertyGroupBuildSlots(tile.group, groupTiles.length, tiles);

    return slots[slotIndex] ?? null;
  };

  const getPropertyBuildingSlots = (
    tileIndex: number,
    slotCount: number,
    tiles: BoardTile[] = BOARD_TILES,
  ): BoardBuildSlot[] => {
    const baseSlot = getPropertyBuildSlot(tileIndex, tiles);
    if (!baseSlot || slotCount <= 0) return [];

    const side = getTileSide(tileIndex);
    const spacing = Math.min(TILE_WIDTH * 0.24, 0.08);
    const start = -((slotCount - 1) * spacing) / 2;

    return Array.from({ length: slotCount }, (_, slotIndex) => {
      const localX = start + slotIndex * spacing;
      const slotXZ = applySideLengthOffset(baseSlot.position, side, localX);

      return {
        ...baseSlot,
        slotIndex,
        slotCount,
        position: {
          x: slotXZ.x,
          y: baseSlot.position.y,
          z: slotXZ.z,
        },
      };
    });
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
    getPropertyBuildSlot,
    getPropertyBuildingSlots,
    getPropertyGroupBuildArea,
    getPropertyGroupBuildSlots,
    getTileLabelTransform,
  };
}
