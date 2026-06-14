import { ref, onMounted, watch } from "vue";
import { CanvasTexture, SRGBColorSpace, LinearFilter } from "three";
import { BOARD_TILES, type BoardTile } from "~/config/boardTilesConfig";
import { GAME_CONFIG } from "~/config/gameConfig";
import { useBoardGeometry } from "./useBoardGeometry";
import { useI18n } from "~/composables/useI18n";

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

const FONT_FAMILY = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
const TEXT_COLOR = "#161616";

// Icono para casillas especiales (sin precio)
function specialIcon(tile: BoardTile): string {
  switch (tile.group) {
    case "go":
      return "🏁";
    case "jail":
      return "🚓";
    case "parking":
      return "🅿️";
    case "gotojail":
      return "👮";
    case "chance":
      return "❓";
    case "community":
      return "📦";
    case "tax":
      return "💰";
    default:
      return "";
  }
}

// Icono para estaciones / servicios (tienen precio)
function ownableIcon(tile: BoardTile): string {
  if (tile.group === "railroad") return "🚂";
  if (tile.group === "utility") {
    return /agua/i.test(tile.name) ? "💧" : "⚡";
  }
  return "";
}

// Casillas que en el tablero 3D tienen un rectangulo central (no banda).
// En ellas el nombre va mas arriba para no quedar sobre el rectangulo.
const CENTER_RECT_GROUPS = new Set([
  "tax",
  "chance",
  "community",
  "railroad",
  "utility",
]);
function hasCenterRect(tile: BoardTile): boolean {
  return CENTER_RECT_GROUPS.has(tile.group);
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);

  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1);
    }
    kept[maxLines - 1] = `${last.trimEnd()}…`;
    return kept;
  }
  return lines;
}

// Dibuja el título centrado en una región. Texto negro con halo blanco para
// que sea legible sobre cualquier color de casilla.
function drawTitle(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  regionTop: number,
  regionHeight: number,
  maxWidth: number,
  baseFont: number,
) {
  let fontSize = baseFont;
  let lines: string[] = [text];

  for (; fontSize >= baseFont * 0.5; fontSize -= 2) {
    ctx.font = `700 ${fontSize}px ${FONT_FAMILY}`;
    lines = wrapLines(ctx, text, maxWidth, 2);
    const lineHeight = fontSize * 1.14;
    const totalHeight = lines.length * lineHeight;
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (totalHeight <= regionHeight && widest <= maxWidth) break;
  }

  const lineHeight = fontSize * 1.14;
  const totalHeight = lines.length * lineHeight;
  let y = regionTop + (regionHeight - totalHeight) / 2 + lineHeight / 2;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";

  for (const line of lines) {
    ctx.lineWidth = Math.max(3, fontSize * 0.18);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.strokeText(line, cx, y, maxWidth);
    ctx.fillStyle = TEXT_COLOR;
    ctx.fillText(line, cx, y, maxWidth);
    y += lineHeight;
  }
}

function createLabelCanvas(tile: BoardTile, displayName: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const w = GAME_CONFIG.LABEL_CANVAS_WIDTH;
  const h = GAME_CONFIG.LABEL_CANVAS_HEIGHT;
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d")!;
  // Fondo totalmente transparente: se ve la casilla del tablero debajo
  ctx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const padX = w * 0.08;
  const innerW = w - padX * 2;
  const topPad = h * 0.12;
  const botPad = h * 0.1;
  const hasPrice = typeof tile.price === "number";
  const centerRect = hasCenterRect(tile);
  const font = GAME_CONFIG.LABEL_FONT_SIZE;

  const drawIcon = (icon: string, sizeFactor: number, cy: number) => {
    if (!icon) return;
    ctx.font = `${Math.round(h * sizeFactor)}px ${FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(icon, cx, cy);
  };

  if (hasPrice) {
    const priceH = h * 0.26;
    const regionTop = h - botPad - priceH;

    if (centerRect) {
      // Estaciones / servicios (rectangulo central): nombre arriba,
      // icono al centro (sobre el rectangulo), precio abajo.
      drawTitle(ctx, displayName, cx, topPad, h * 0.3, innerW, font);
      drawIcon(ownableIcon(tile), 0.18, h * 0.52);
    } else {
      // Propiedades con banda: nombre arriba-medio, precio abajo.
      const nameH = h - topPad - botPad - priceH - h * 0.05;
      drawTitle(ctx, displayName, cx, topPad, nameH, innerW, font);
    }

    // Precio: rectangulo centrado en la franja inferior, dentro de la casilla
    const pillH = Math.round(priceH * 0.8);
    const priceFont = Math.round(pillH * 0.58);
    ctx.font = `700 ${priceFont}px ${FONT_FAMILY}`;
    const priceText = `$${tile.price}`;
    const textW = ctx.measureText(priceText).width;
    const pillW = Math.min(textW + pillH, innerW);
    const pillX = cx - pillW / 2;
    const pillY = regionTop + (priceH - pillH) / 2;

    roundRectPath(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.fill();
    ctx.lineWidth = Math.max(2, h * 0.012);
    ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = TEXT_COLOR;
    ctx.fillText(priceText, cx, pillY + pillH / 2 + 1, pillW - pillH * 0.4);
  } else {
    const icon = specialIcon(tile);

    if (centerRect) {
      // Impuesto / Suerte / Arca Comunal (rectangulo central): nombre arriba,
      // icono debajo (sobre el rectangulo).
      drawTitle(ctx, displayName, cx, topPad, h * 0.3, innerW, font);
      drawIcon(icon, 0.28, h * 0.62);
    } else if (icon) {
      // Esquinas: icono arriba + nombre debajo.
      const iconSize = Math.round(h * 0.3);
      const iconTop = topPad;
      drawIcon(icon, 0.3, iconTop + iconSize / 2);
      const nameTop = iconTop + iconSize + h * 0.04;
      drawTitle(ctx, displayName, cx, nameTop, h - botPad - nameTop, innerW, font);
    } else {
      drawTitle(ctx, displayName, cx, topPad, h - topPad - botPad, innerW, font);
    }
  }

  return canvas;
}

export function useTileLabels() {
  const { getTileLabelTransform } = useBoardGeometry();
  const { locale, tileName, tileShortName } = useI18n();
  const tileLabels = ref<TileLabelData[]>([]);
  const isCorner = (idx: number) => [0, 10, 20, 30].includes(idx);

  function rebuildLabels() {
    for (const label of tileLabels.value) {
      label.texture.dispose();
    }

    const labels: TileLabelData[] = BOARD_TILES.map((tile) => {
      const displayName = tile.shortName
        ? tileShortName(tile.index, tile.shortName)
        : tileName(tile.index, tile.name);
      const canvas = createLabelCanvas(tile, displayName);
      const texture = new CanvasTexture(canvas);
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = 8;
      texture.minFilter = LinearFilter;
      texture.magFilter = LinearFilter;
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
        name: displayName,
        type: tile.type,
        texture,
        position: transform.position,
        rotation: transform.rotation,
        width,
        height,
      };
    });

    tileLabels.value = labels;
  }

  onMounted(() => {
    rebuildLabels();
  });

  watch(locale, rebuildLabels);

  return tileLabels;
}
