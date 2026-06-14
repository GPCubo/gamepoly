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
colorLines.push("    # Superficies del tablero");
colorLines.push('    "white":        (0.965, 0.965, 0.945, 1),   # Base de casillas');
colorLines.push('    "wood":         (0.180, 0.100, 0.050, 1),    # Mesa contenedora');
colorLines.push('    "frame":        (0.280, 0.150, 0.070, 1),    # Marco de madera');
colorLines.push('    "board_center": (0.918, 0.933, 0.890, 1),    # Fondo claro del tablero');
colorLines.push("    # Parque central — base");
colorLines.push('    "plaza_grass":  (0.650, 0.820, 0.690, 1),    # Cesped');
colorLines.push('    "plaza_path":   (0.760, 0.720, 0.640, 1),    # Caminos de piedra');
colorLines.push('    "plaza_tile":   (0.820, 0.790, 0.700, 1),    # Suelo de la plaza');
colorLines.push('    "plaza_edge":   (0.560, 0.500, 0.430, 1),    # Bordillos');
colorLines.push('    "plaza_water":  (0.340, 0.680, 0.940, 1),    # Fuente / agua');
colorLines.push("    # Arboles");
colorLines.push('    "tree_trunk":   (0.420, 0.240, 0.110, 1),');
colorLines.push('    "tree_leaf":    (0.130, 0.480, 0.220, 1),');
colorLines.push('    "tree_leaf2":   (0.110, 0.440, 0.180, 1),');
colorLines.push('    "tree_leaf3":   (0.160, 0.520, 0.260, 1),');
colorLines.push('    "tree_leaf4":   (0.090, 0.380, 0.150, 1),');
colorLines.push('    "tree_leaf5":   (0.200, 0.560, 0.300, 1),');
colorLines.push("    # Mobiliario de plaza");
colorLines.push('    "rock":         (0.520, 0.500, 0.480, 1),    # Rocas grises');
colorLines.push('    "hedge":        (0.100, 0.400, 0.150, 1),    # Seto');
colorLines.push('    "flower_red":   (0.860, 0.140, 0.140, 1),');
colorLines.push('    "flower_yellow":(0.960, 0.820, 0.080, 1),');
colorLines.push('    "flower_white": (0.950, 0.950, 0.940, 1),');
colorLines.push('    "bench_wood":   (0.540, 0.320, 0.140, 1),    # Madera de bancos');
colorLines.push('    "lamp_metal":   (0.220, 0.220, 0.240, 1),    # Postes de farola');
colorLines.push('    "lamp_light":   (1.000, 0.920, 0.700, 1),    # Globo de farola');
colorLines.push('    "monument":     (0.870, 0.860, 0.840, 1),    # Piedra blanca de fuente');
const tileColorsBlock = "TILE_COLORS = {\n" + colorLines.join("\n") + "\n}";

// ── Patch the Python file ─────────────────────────────────────────────────

let pySource = readFileSync(PY_PATH, "utf-8");
pySource = pySource.replace(/TILE_GROUPS\s*=\s*\[[\s\S]*?\]/, groupsStr);
pySource = pySource.replace(/TILE_INFO\s*=\s*\[[\s\S]*?\]/, infoStr);
pySource = pySource.replace(/TILE_COLORS\s*=\s*\{[\s\S]*?\}/, tileColorsBlock);
writeFileSync(PY_PATH, pySource, "utf-8");

console.log(`✓ Synced TILE_GROUPS, TILE_INFO, TILE_COLORS (board: ${boardArg.toUpperCase()})`);
console.log(`  ${tiles.length} tiles, ${Object.keys(groupColors).length} group colors`);
