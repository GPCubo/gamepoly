import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const TS_PATH = join(ROOT, "config", "boardTilesConfig.ts");
const PY_PATH = join(ROOT, "scripts_blenders", "create_monopoly_table.py");

// ── 1. Parse boardTilesConfig.ts ──────────────────────────────────────

const tsSource = readFileSync(TS_PATH, "utf-8");

// Extract each tile block between { and }
const arrayMatch = tsSource.match(
  /export\s+const\s+BOARD_TILES\s*:\s*BoardTile\[\]\s*=\s*\[([\s\S]*?)\];/
);
if (!arrayMatch) {
  console.error("Could not find BOARD_TILES array in boardTilesConfig.ts");
  process.exit(1);
}

const arrayBody = arrayMatch[1];

// Parse each individual tile object
const tiles = [];
const objRegex = /\{([^}]+)\}/g;
let match;
while ((match = objRegex.exec(arrayBody)) !== null) {
  const body = match[1];

  const indexM = body.match(/index:\s*(\d+)/);
  const typeM = body.match(/type:\s*"([^"]+)"/);
  const groupM = body.match(/group:\s*"([^"]+)"/);
  const nameM = body.match(/name:\s*"([^"]+)"/);
  const shortNameM = body.match(/shortName:\s*"([^"]+)"/);
  const priceM = body.match(/price:\s*(\d+)/);
  const colorM = body.match(/color:\s*"([^"]+)"/);

  if (!indexM || !groupM) continue;

  tiles.push({
    index: parseInt(indexM[1]),
    group: groupM[1],
    short: shortNameM ? shortNameM[1] : (nameM ? nameM[1] : ""),
    price: priceM ? parseInt(priceM[1]) : null,
    color: colorM ? colorM[1] : null,
  });
}

if (tiles.length !== 40) {
  console.error(`Expected 40 tiles, found ${tiles.length}`);
  process.exit(1);
}

// ── 2. Generate TILE_GROUPS ───────────────────────────────────────────

const groupsPerRow = 10;
let groupsStr = "TILE_GROUPS = [\n";
for (let i = 0; i < tiles.length; i += groupsPerRow) {
  const chunk = tiles.slice(i, i + groupsPerRow).map((t) => `"${t.group}"`).join(", ");
  groupsStr += `    ${chunk}`;
  if (i + groupsPerRow < tiles.length) groupsStr += ",";
  groupsStr += "\n";
}
groupsStr += "]";

// ── 3. Generate TILE_INFO ─────────────────────────────────────────────

let infoStr = "TILE_INFO = [\n";
for (const t of tiles) {
  const short = t.short;
  const comment = `# ${t.index}  ${t.group}`;
  if (t.price !== null) {
    infoStr += `    {"short": "${short}", "price": ${t.price}},`.padEnd(55) + comment + "\n";
  } else {
    infoStr += `    {"short": "${short}"},`.padEnd(55) + comment + "\n";
  }
}
infoStr += "]";

// ── 4. Generate TILE_COLORS from TS colors ─────────────────────────────

function hexToNorm(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `(${(r / 255).toFixed(3)}, ${(g / 255).toFixed(3)}, ${(b / 255).toFixed(3)}, 1)`;
}

const groupColors = {};
for (const t of tiles) {
  if (t.color && !groupColors[t.group]) {
    groupColors[t.group] = t.color;
  }
}

const colorOrder = [
  "brown", "lightBlue", "pink", "orange", "red", "yellow", "green", "darkBlue",
  "railroad", "utility", "tax", "chance", "community",
];

const cornerOrder = ["go", "jail", "parking", "gotojail"];

const colorLines = [];

colorLines.push("    # Grupos de propiedad");
for (const g of colorOrder) {
  if (!groupColors[g]) continue;
  const norm = hexToNorm(groupColors[g]);
  const pad = " ".repeat(Math.max(1, 18 - g.length));
  colorLines.push(`    "${g}":${pad}${norm},`);
}

colorLines.push("    # Esquinas");
for (const g of cornerOrder) {
  if (!groupColors[g]) continue;
  const norm = hexToNorm(groupColors[g]);
  const pad = " ".repeat(Math.max(1, 18 - g.length));
  colorLines.push(`    "${g}":${pad}${norm},`);
}

colorLines.push("    # Superficies");
colorLines.push('    "white":        (0.965, 0.965, 0.945, 1),   # Base de casillas');
colorLines.push('    "wood":         (0.180, 0.100, 0.050, 1),    # Mesa contenedora');
colorLines.push('    "frame":        (0.280, 0.150, 0.070, 1),    # Marco de madera');
colorLines.push('    "board_center": (0.918, 0.933, 0.890, 1),    # Fondo claro del tablero');
colorLines.push('    "center_panel": (0.870, 0.895, 0.850, 1),    # Area central de dados');

const tileColorsBlock = "TILE_COLORS = {\n" + colorLines.join("\n") + "\n}";

// ── 5. Patch the Python file ──────────────────────────────────────────

let pySource = readFileSync(PY_PATH, "utf-8");

pySource = pySource.replace(
  /TILE_GROUPS\s*=\s*\[[\s\S]*?\]/,
  groupsStr
);

pySource = pySource.replace(
  /TILE_INFO\s*=\s*\[[\s\S]*?\]/,
  infoStr
);

pySource = pySource.replace(
  /TILE_COLORS\s*=\s*\{[\s\S]*?\}/,
  tileColorsBlock
);

writeFileSync(PY_PATH, pySource, "utf-8");

console.log("✓ Synced TILE_GROUPS, TILE_INFO, and TILE_COLORS");
console.log(`  ${tiles.length} tiles, ${Object.keys(groupColors).length} group colors`);