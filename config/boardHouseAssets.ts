import type { BoardTile } from "~/config/boardTilesConfig";

export type BoardHouseAssetType = "casa" | "hotel";

export interface BoardHouseAssetPlacement {
  tileIndex: number;
  type: BoardHouseAssetType;
  buildIndex?: number;
  buildCount?: number;
  scale?: number;
  xOffset?: number;
  yOffset?: number;
  zOffset?: number;
  inwardOffset?: number;
  alongOffset?: number;
  rotationYOffset?: number;
}

export interface BoardHouseAssetDefinition {
  type: BoardHouseAssetType;
  modelPath: string;
  defaultScale: number;
  defaultXOffset: number;
  defaultYOffset: number;
  defaultZOffset: number;
  defaultInwardOffset: number;
  defaultAlongOffset: number;
}

export const BOARD_HOUSE_ASSET_DEFINITIONS: Record<
  BoardHouseAssetType,
  BoardHouseAssetDefinition
> = {
  casa: {
    type: "casa",
    modelPath: "/models/casa_detallada.glb",
    defaultScale: 0.1,
    defaultXOffset: 0,
    defaultYOffset: -0.005,
    defaultZOffset: -0,
    defaultInwardOffset: 0.4,
    defaultAlongOffset: 0,
  },
  hotel: {
    type: "hotel",
    modelPath: "/models/hotel_detallado.glb",
    defaultScale: 0.1,
    defaultXOffset: 0,
    defaultYOffset: -0.005,
    defaultZOffset: -0,
    defaultInwardOffset: 0.4,
    defaultAlongOffset: 0,
  },
};

export const BOARD_HOUSE_ASSET_PLACEMENTS: BoardHouseAssetPlacement[] = [
  { tileIndex: 1, type: "casa" },
  { tileIndex: 3, type: "casa" },
];

export function getAllPropertyHousePlacements(
  tiles: BoardTile[],
): BoardHouseAssetPlacement[] {
  return tiles
    .filter((tile) => tile.type === "property")
    .map<BoardHouseAssetPlacement>((tile) => ({
      tileIndex: tile.index,
      type: "casa",
    }));
}

export interface BoardPropertyDevelopment {
  houses?: number;
  hotel?: boolean;
}

export function getPropertyDevelopmentPlacements(
  developments: Record<number, BoardPropertyDevelopment | undefined>,
): BoardHouseAssetPlacement[] {
  return Object.entries(developments).flatMap<BoardHouseAssetPlacement>(
    ([tileIndexRaw, development]) => {
      const tileIndex = Number(tileIndexRaw);
      if (!development) return [];

      if (development.hotel) {
        return [{ tileIndex, type: "hotel" }];
      }

      const houses = Math.max(0, Math.min(4, development.houses ?? 0));
      return Array.from({ length: houses }, (_, buildIndex) => ({
        tileIndex,
        type: "casa",
        buildIndex,
        buildCount: houses,
        scale: 0.095,
      }));
    },
  );
}
