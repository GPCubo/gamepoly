import { ref, onMounted } from "vue";
import { CanvasTexture, SRGBColorSpace, LinearFilter } from "three";
import { BOARD_TILES, type BoardTile } from "~/config/boardTilesConfig";
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

const FONT_FAMILY =
  '"Segoe UI", "Helvetica Neue", Arial, sans-serif';

// Colores de la banda superior por grupo de propiedad
const COLOR_MAP: Record<string, string> = {
  brown: "#955436",
  lightBlue: "#AAE0FA",
  pink: "#D93A96",
  orange: "#F7941D",
  red: "#ED1B24",
  yellow: "#FEF200",
  green: "#1FB25A",
  darkBlue: "#0072BB",
  railroad: "#2B2B2B",
  utility: "#9ED1A6",
  tax: "#5A5A5A",
  chance: "#F7941D",
  community: "#3AA6E0",
  go: "#28B463",
  jail: "#E67E22",
  parking: "#C0392B",
  gotojail: "#922B21",
};

// Grupos "poseibles" que llevan banda de color + precio
const OWNABLE_GROUPS = new Set([
  "brown",
  "lightBlue",
  "pink",
  "orange",
  "red",
  "yellow",
  "green",
  "darkBlue",
  "railroad",
  "utility",
]);

// Icono para casillas especiales (no propiedades)
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

// Icono pequeño que se pinta sobre la banda de color de ownables
function ownableIcon(tile: BoardTile): string {
  if (tile.group === "railroad") return "🚂";
  if (tile.group === "utility") {
    return /agua/i.test(tile.name) ? "💧" : "⚡";
  }
  return "";
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: { tl: number; tr: number; br: number; bl: number },
) {
  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + w - r.tr, y);
  ctx.arcTo(x + w, y, x + w, y + r.tr, r.tr);
  ctx.lineTo(x + w, y + h - r.br);
  ctx.arcTo(x + w, y + h, x + w - r.br, y + h, r.br);
  ctx.lineTo(x + r.bl, y + h);
  ctx.arcTo(x, y + h, x, y + h - r.bl, r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.arcTo(x, y, x + r.tl, y, r.tl);
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
    while (
      last.length > 1 &&
      ctx.measureText(`${last}…`).width > maxWidth
    ) {
      last = last.slice(0, -1);
    }
    kept[maxLines - 1] = `${last.trimEnd()}…`;
    return kept;
  }
  return lines;
}

// Dibuja el título centrado en una región, reduciendo la fuente si hace falta
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

  for (; fontSize >= baseFont * 0.55; fontSize -= 2) {
    ctx.font = `700 ${fontSize}px ${FONT_FAMILY}`;
    lines = wrapLines(ctx, text, maxWidth, 2);
    const lineHeight = fontSize * 1.12;
    const totalHeight = lines.length * lineHeight;
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (totalHeight <= regionHeight && widest <= maxWidth) break;
  }

  const lineHeight = fontSize * 1.12;
  const totalHeight = lines.length * lineHeight;
  let y = regionTop + (regionHeight - totalHeight) / 2 + lineHeight / 2;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = GAME_CONFIG.LABEL_COLOR;

  for (const line of lines) {
    ctx.fillText(line, cx, y, maxWidth);
    y += lineHeight;
  }

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

function createLabelCanvas(tile: BoardTile): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const w = GAME_CONFIG.LABEL_CANVAS_WIDTH;
  const h = GAME_CONFIG.LABEL_CANVAS_HEIGHT;
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);

  const radius = Math.round(h * 0.16);
  const inset = Math.max(2, Math.round(h * 0.015));
  const cardX = inset;
  const cardY = inset;
  const cardW = w - inset * 2;
  const cardH = h - inset * 2;
  const cx = w / 2;
  const accent = COLOR_MAP[tile.group] || "#666666";
  const isOwnable = OWNABLE_GROUPS.has(tile.group);

  // Sombra del recuadro
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
  ctx.shadowBlur = h * 0.07;
  ctx.shadowOffsetY = h * 0.03;

  // Fondo con gradiente
  const grad = ctx.createLinearGradient(0, cardY, 0, cardY + cardH);
  grad.addColorStop(0, "rgba(32, 33, 46, 0.94)");
  grad.addColorStop(1, "rgba(15, 16, 26, 0.94)");
  roundRectPath(ctx, cardX, cardY, cardW, cardH, {
    tl: radius,
    tr: radius,
    br: radius,
    bl: radius,
  });
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();

  if (isOwnable) {
    // ---- Layout de propiedad: banda de color + nombre + precio ----
    const bandH = Math.round(cardH * 0.3);

    // Banda de color con esquinas superiores redondeadas
    ctx.save();
    roundRectPath(ctx, cardX, cardY, cardW, cardH, {
      tl: radius,
      tr: radius,
      br: radius,
      bl: radius,
    });
    ctx.clip();
    ctx.fillStyle = accent;
    ctx.fillRect(cardX, cardY, cardW, bandH);
    // Brillo sutil sobre la banda
    const bandGrad = ctx.createLinearGradient(0, cardY, 0, cardY + bandH);
    bandGrad.addColorStop(0, "rgba(255, 255, 255, 0.28)");
    bandGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = bandGrad;
    ctx.fillRect(cardX, cardY, cardW, bandH);
    ctx.restore();

    // Icono del medio de transporte / servicio sobre la banda
    const icon = ownableIcon(tile);
    if (icon) {
      ctx.font = `${Math.round(bandH * 0.7)}px ${FONT_FAMILY}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(icon, cx, cardY + bandH / 2 + 1);
    }

    const hasPrice = typeof tile.price === "number";
    const titleTop = cardY + bandH;
    const priceH = hasPrice ? Math.round(cardH * 0.26) : 0;
    const titleH = cardH - bandH - priceH;

    drawTitle(
      ctx,
      tile.name,
      cx,
      titleTop,
      titleH,
      cardW * 0.9,
      GAME_CONFIG.LABEL_FONT_SIZE,
    );

    if (hasPrice) {
      const pillH = Math.round(priceH * 0.74);
      const priceFont = Math.round(pillH * 0.62);
      ctx.font = `700 ${priceFont}px ${FONT_FAMILY}`;
      const priceText = `$${tile.price}`;
      const textW = ctx.measureText(priceText).width;
      const pillW = textW + pillH;
      const pillX = cx - pillW / 2;
      const pillY = cardY + cardH - priceH + (priceH - pillH) / 2;

      roundRectPath(ctx, pillX, pillY, pillW, pillH, {
        tl: pillH / 2,
        tr: pillH / 2,
        br: pillH / 2,
        bl: pillH / 2,
      });
      ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
      ctx.fill();

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#FFE082";
      ctx.fillText(priceText, cx, pillY + pillH / 2 + 1);
    }
  } else {
    // ---- Layout especial: icono grande + nombre ----
    const icon = specialIcon(tile);
    const topRegion = cardY + cardH * 0.08;

    if (icon) {
      const iconSize = Math.round(cardH * 0.34);
      ctx.font = `${iconSize}px ${FONT_FAMILY}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(icon, cx, topRegion + iconSize / 2);

      drawTitle(
        ctx,
        tile.shortName || tile.name,
        cx,
        topRegion + iconSize,
        cardH - (topRegion - cardY) - iconSize,
        cardW * 0.9,
        GAME_CONFIG.LABEL_FONT_SIZE,
      );
    } else {
      drawTitle(
        ctx,
        tile.shortName || tile.name,
        cx,
        cardY,
        cardH,
        cardW * 0.9,
        GAME_CONFIG.LABEL_FONT_SIZE,
      );
    }
  }

  // Borde fino para definir el recuadro
  roundRectPath(ctx, cardX, cardY, cardW, cardH, {
    tl: radius,
    tr: radius,
    br: radius,
    bl: radius,
  });
  ctx.lineWidth = Math.max(1.5, h * 0.012);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
  ctx.stroke();

  return canvas;
}

export function useTileLabels() {
  const { getTileLabelTransform } = useBoardGeometry();
  const tileLabels = ref<TileLabelData[]>([]);
  const isCorner = (idx: number) => [0, 10, 20, 30].includes(idx);

  onMounted(() => {
    const labels: TileLabelData[] = BOARD_TILES.map((tile) => {
      const canvas = createLabelCanvas(tile);
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
