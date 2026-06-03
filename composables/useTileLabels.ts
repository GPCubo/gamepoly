import { ref, onMounted } from "vue";
import { CanvasTexture } from "three";
import { BOARD_TILES } from "~/config/boardTilesConfig";
import { GAME_CONFIG } from "~/config/gameConfig";
import { useBoardGeometry } from "./useBoardGeometry";

export interface TileLabelData {
  index: number;
  name: string;
  type: string;
  texture: CanvasTexture;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  width: number;
  height: number;
}

function createLabelCanvas(
  name: string,
  type: string,
  group: string,
  shortName?: string,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const w = GAME_CONFIG.LABEL_CANVAS_WIDTH;
  const h = GAME_CONFIG.LABEL_CANVAS_HEIGHT;
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = GAME_CONFIG.LABEL_BG_COLOR;
  ctx.fillRect(0, 0, w, h);

  const colorMap: Record<string, string> = {
    brown: "#8B4513",
    lightBlue: "#00BFFF",
    pink: "#FF1493",
    orange: "#FF8C00",
    red: "#FF0000",
    yellow: "#FFD700",
    green: "#00CC44",
    darkBlue: "#0026CC",
    railroad: "#333333",
    utility: "#8FBC8F",
    tax: "#444444",
    chance: "#FF4500",
    community: "#0099E6",
    go: "#00CC00",
    jail: "#FF8800",
    parking: "#CC0000",
    gotojail: "#990000",
  };

  const bandColor = colorMap[group] || "#666666";
  const bandH = Math.round(h * 0.15);
  ctx.fillStyle = bandColor;
  ctx.fillRect(0, 0, w, bandH);

  const isCorner = type === "corner";
  const fontSize = isCorner
    ? Math.round(GAME_CONFIG.LABEL_FONT_SIZE * 0.9)
    : GAME_CONFIG.LABEL_FONT_SIZE;

  ctx.fillStyle = GAME_CONFIG.LABEL_COLOR;
  ctx.font = `bold ${fontSize}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const displayName = shortName || name;

  const textAreaY = bandH + (h - bandH) / 2;

  const maxWidth = w - 16;
  const measured = ctx.measureText(displayName);
  if (measured.width > maxWidth) {
    ctx.font = `bold ${Math.round(fontSize * 0.75)}px monospace`;
  }

  ctx.fillText(displayName, w / 2, textAreaY, maxWidth);

  return canvas;
}

export function useTileLabels() {
  const { getTileLabelTransform } = useBoardGeometry();
  const tileLabels = ref<TileLabelData[]>([]);
  const isCorner = (idx: number) => [0, 10, 20, 30].includes(idx);

  onMounted(() => {
    const labels: TileLabelData[] = BOARD_TILES.map((tile) => {
      const canvas = createLabelCanvas(
        tile.name,
        tile.type,
        tile.group,
        tile.shortName,
      );
      const texture = new CanvasTexture(canvas);
      texture.needsUpdate = true;

      const corner = isCorner(tile.index);
      const width = corner
        ? GAME_CONFIG.LABEL_CORNER_PLANE_WIDTH
        : GAME_CONFIG.LABEL_PLANE_WIDTH;
      const height = corner
        ? GAME_CONFIG.LABEL_CORNER_PLANE_HEIGHT
        : GAME_CONFIG.LABEL_PLANE_HEIGHT;

      const transform = getTileLabelTransform(tile.index);

      return {
        index: tile.index,
        name: tile.name,
        type: tile.type,
        texture,
        position: transform.position,
        rotation: transform.rotation,
        width,
        height,
      };
    });

    tileLabels.value = labels;
  });

  return tileLabels;
}