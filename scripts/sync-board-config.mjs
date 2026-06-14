/**
 * sync-board-config.mjs — Syncs board tile config to the Blender Python script.
 *
 * Usage:
 *   node scripts/sync-board-config.mjs            # default: Spanish board
 *   node scripts/sync-board-config.mjs --board es
 *   node scripts/sync-board-config.mjs --board en
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const boardArg = process.argv.includes("--board")
  ? process.argv[process.argv.indexOf("--board") + 1]
  : "es";

if (!["es", "en"].includes(boardArg)) {
  console.error(`Unknown board: ${boardArg}. Use --board es or --board en`);
  process.exit(1);
}

const isEn = boardArg === "en";
const TS_FILE = isEn ? "boardTilesConfigEn.ts" : "boardTilesConfigEs.ts";
const ARRAY_VAR = isEn ? "BOARD_TILES_EN" : "BOARD_TILES_ES";
const TS_PATH = join(ROOT, "config", TS_FILE);
const PY_PATH = join(ROOT, "scripts_blenders", "create_monopoly_table.py");

console.log(`Syncing board: ${boardArg.toUpperCase()} (${TS_FILE})`);

const tsSource = readFileSync(TS_PATH, "utf-8");

// Build regex dynamically to avoid backslash escaping issues in template literals
const arrayPattern = new RegExp(
  "export\\s+const\\s+" + ARRAY_VAR + "[^=]*=\\s*\\[([\\s\\S]*?)\\];"
);
const arrayMatch = tsSource.match(arrayPattern);
if (!arrayMatch) {
  console.error(`Could not find ${ARRAY_VAR} array in ${TS_FILE}`);
  process.exit(1);
}

const arrayBody = arrayMatch[1];
const tiles = [];
const objRegex = /\{([^}]+)\}/g;
let match;
while ((match = objRegex.exec(arrayBody)) !== null) {
  const body = match[1];
  const indexM   = body.match(/index:\s*(\d+)/);
  const groupM   = body.match(/group:\s*"([^"]+)"/);
  const nameM    = body.match(/name:\s*"([^"]+)"/);
  const shortM   = body.match(/shortName:\s*"([^"]+)"/);
  const priceM   = body.match(/price:\s*(\d+)/);
  const colorM   = body.match(/color:\s*"([^"]+)"/);
  if (!indexM || !groupM) continue;
  tiles.push({
    index: parseInt(indexM[1]),
    group: groupM[1],
    short: shortM ? shortM[1] : (nameM ? nameM[1] : ""),
    price: priceM ? parseInt(priceM[1]) : null,
    color: colorM ? colorM[1] : null,
  });
}

if (tiles.length !== 40) {
  console.error(`Expected 40 tiles, found ${tiles.length}`);
  process.exit(1);
}

// ── Generate TILE_GROUPS ──────────────────────────────────────────────────

const groupsPerRow = 10;
let groupsStr = "TILE_GROUPS = [\n";
for (let i = 0; i < tiles.length; i += groupsPerRow) {
  const chunk = tiles.slice(i, i + groupsPerRow).map((t) => `"${t.group}"`).join(", ");
  groupsStr += `    ${chunk}`;
  if (i + groupsPerRow < tiles.length) groupsStr += ",";
  groupsStr += "\n";
}
groupsStr += "]";

// ── Generate TILE_INFO ────────────────────────────────────────────────────

let infoStr = "TILE_INFO = [\n";
for (const t of tiles) {
  const comment = `# ${t.index}  ${t.group}`;
  if (t.price !== null) {
    infoStr += `    {"short": "${t.short}", "price": ${t.price}},`.padEnd(55) + comment + "\n";
  } else {
    infoStr += `    {"short": "${t.short}"},`.padEnd(55) + comment + "\n";
  }
}
infoStr += "]";

// ── Generate TILE_COLORS ──────────────────────────────────────────────────

function hexToNorm(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `(${(r / 255).toFixed(3)}, ${(g / 255).toFixed(3)}, ${(b / 255).toFixed(3)}, 1)`;
}

const groupColors = {};
for (const t of tiles) {
  if (t.color && !groupColors[t.group]) groupColors[t.group] = t.color;
}

const colorOrder = ["brown","lightBlue","pink","orange","red","yellow","green","darkBlue","railroad","utility","tax","chance","community"];
const cornerOrder = ["go","jail","parking","gotojail"];
const colorLines = [];
colorLines.push("    # Grupos de propiedad");
for (const g of colorOrder) {
  if (!groupColors[g]) continue;
  const pad = " ".repeat(Math.max(1, 18 - g.length));
  colorLines.push(`    "${g}":${pad}${hexToNorm(groupColors[g])},`);
}
colorLines.push("    # Esquinas");
for (const g of cornerOrder) {
  if (!groupColors[g]) continue;
  const pad = " ".repeat(Math.max(1, 18 - g.length));
  colorLines.push(`    "${g}":${pad}${hexToNorm(groupColors[g])},`);
}
colorLines.push("    # Superficies");
colorLines.push('    "white":        (0.965, 0.965, 0.945, 1),   # Base de casillas');
colorLines.push('    "wood":         (0.180, 0.100, 0.050, 1),    # Mesa contenedora');
colorLines.push('    "frame":        (0.280, 0.150, 0.070, 1),    # Marco de madera');
colorLines.push('    "board_center": (0.918, 0.933, 0.890, 1),    # Fondo claro del tablero');
colorLines.push('    "plaza_grass":  (0.650, 0.820, 0.690, 1),    # Jardin central');
colorLines.push('    "plaza_path":   (0.760, 0.720, 0.640, 1),    # Caminos de piedra');
colorLines.push('    "plaza_tile":   (0.820, 0.790, 0.700, 1),    # Plaza principal');
colorLines.push('    "plaza_edge":   (0.560, 0.500, 0.430, 1),    # Bordes de plaza/caminos');
colorLines.push('    "tree_trunk":   (0.420, 0.240, 0.110, 1),');
colorLines.push('    "tree_leaf":    (0.130, 0.480, 0.220, 1),');
const tileColorsBlock = "TILE_COLORS = {\n" + colorLines.join("\n") + "\n}";

// ── Patch the Python file ─────────────────────────────────────────────────

let pySource = readFileSync(PY_PATH, "utf-8");
pySource = pySource.replace(/TILE_GROUPS\s*=\s*\[[\s\S]*?\]/, groupsStr);
pySource = pySource.replace(/TILE_INFO\s*=\s*\[[\s\S]*?\]/, infoStr);
pySource = pySource.replace(/TILE_COLORS\s*=\s*\{[\s\S]*?\}/, tileColorsBlock);
writeFileSync(PY_PATH, pySource, "utf-8");

console.log(`✓ Synced TILE_GROUPS, TILE_INFO, TILE_COLORS (board: ${boardArg.toUpperCase()})`);
console.log(`  ${tiles.length} tiles, ${Object.keys(groupColors).length} group colors`);
