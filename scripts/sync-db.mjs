/**
 * sync-db.mjs — Upserts canonical board, tiles, and tokens into PostgreSQL.
 *
 * Requires POSTGRES_DSN env var and the `postgres` package:
 *   npm install --save-dev postgres
 *
 * Usage: node scripts/sync-db.mjs
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── Parse boardTilesConfig.ts ──────────────────────────────────────────────

function parseBoardTiles() {
  const tsSource = readFileSync(join(ROOT, 'config', 'boardTilesConfig.ts'), 'utf-8');

  const arrayMatch = tsSource.match(
    /export\s+const\s+BOARD_TILES\s*:\s*BoardTile\[\]\s*=\s*\[([\s\S]*?)\];/
  );
  if (!arrayMatch) throw new Error('Could not find BOARD_TILES array in boardTilesConfig.ts');

  const tiles = [];
  const objRegex = /\{([^}]+)\}/g;
  let match;
  while ((match = objRegex.exec(arrayMatch[1])) !== null) {
    const body = match[1];
    const indexM   = body.match(/index:\s*(\d+)/);
    const typeM    = body.match(/type:\s*"([^"]+)"/);
    const groupM   = body.match(/group:\s*"([^"]+)"/);
    const nameM    = body.match(/name:\s*"([^"]+)"/);
    const shortM   = body.match(/shortName:\s*"([^"]+)"/);
    const priceM   = body.match(/price:\s*(\d+)/);
    const colorM   = body.match(/color:\s*"([^"]+)"/);

    if (!indexM || !groupM) continue;

    tiles.push({
      index:    parseInt(indexM[1]),
      type:     typeM  ? typeM[1]  : 'corner',
      group:    groupM[1],
      name:     nameM  ? nameM[1]  : '',
      shortName: shortM ? shortM[1] : (nameM ? nameM[1] : ''),
      price:    priceM ? parseInt(priceM[1]) : null,
      colorHex: colorM ? colorM[1] : null,
    });
  }

  if (tiles.length !== 40) throw new Error(`Expected 40 tiles, found ${tiles.length}`);
  return tiles;
}

// ── Scan token GLBs ────────────────────────────────────────────────────────

// Tokens that are already exposed to players (from GAME_CONFIG.TOKEN_MODELS)
const VISIBLE_TOKENS = ['sombrero.glb', 'dedal.glb', 'coffee.glb', 'soccer_ball.glb'];

function scanTokens() {
  const dir = join(ROOT, 'public', 'models', 'users');
  const files = readdirSync(dir).filter(f => f.endsWith('.glb')).sort();
  return files.map((file, i) => {
    const slug = basename(file, '.glb');
    const visibleIdx = VISIBLE_TOKENS.indexOf(file);
    return {
      slug,
      glbPath:   `/models/users/${file}`,
      labelKey:  `tokens.${slug}`,
      visible:   visibleIdx !== -1,
      sortOrder: visibleIdx !== -1 ? visibleIdx : 100 + i,
    };
  });
}

// ── DB upsert ──────────────────────────────────────────────────────────────

async function syncDB() {
  let postgres;
  try {
    const mod = await import('postgres');
    postgres = mod.default ?? mod;
  } catch {
    console.error('✗ Missing dependency: run `npm install --save-dev postgres` first');
    process.exit(1);
  }

  const dsn = process.env.POSTGRES_DSN;
  if (!dsn) {
    console.error('✗ POSTGRES_DSN environment variable is not set');
    process.exit(1);
  }

  const sql = postgres(dsn, { max: 1 });

  try {
    const tiles  = parseBoardTiles();
    const tokens = scanTokens();

    const BOARD_SLUG = 'monopoly-es';

    // Upsert canonical Spanish board
    const [{ id: boardId }] = await sql`
      INSERT INTO boards (slug, locale, display_name, glb_path, visible)
      VALUES (${BOARD_SLUG}, 'es', 'Monopoly Clásico', '/models/tablero.glb', true)
      ON CONFLICT (slug) DO UPDATE SET
        locale       = EXCLUDED.locale,
        display_name = EXCLUDED.display_name,
        glb_path     = EXCLUDED.glb_path,
        updated_at   = NOW()
      RETURNING id
    `;

    // Upsert all 40 tiles
    for (const t of tiles) {
      await sql`
        INSERT INTO board_tiles
          (board_id, tile_index, tile_type, tile_group, name, short_name, price, color_hex)
        VALUES (${boardId}, ${t.index}, ${t.type}, ${t.group}, ${t.name}, ${t.shortName}, ${t.price}, ${t.colorHex})
        ON CONFLICT (board_id, tile_index) DO UPDATE SET
          tile_type  = EXCLUDED.tile_type,
          tile_group = EXCLUDED.tile_group,
          name       = EXCLUDED.name,
          short_name = EXCLUDED.short_name,
          price      = EXCLUDED.price,
          color_hex  = EXCLUDED.color_hex
      `;
    }

    // Upsert tokens
    for (const tok of tokens) {
      await sql`
        INSERT INTO tokens (slug, glb_path, label_key, visible, sort_order)
        VALUES (${tok.slug}, ${tok.glbPath}, ${tok.labelKey}, ${tok.visible}, ${tok.sortOrder})
        ON CONFLICT (slug) DO UPDATE SET
          glb_path   = EXCLUDED.glb_path,
          label_key  = EXCLUDED.label_key,
          visible    = EXCLUDED.visible,
          sort_order = EXCLUDED.sort_order
      `;
    }

    const visibleCount = tokens.filter(t => t.visible).length;
    console.log(`✓ Board '${BOARD_SLUG}' synced — ${tiles.length} tiles`);
    console.log(`✓ ${tokens.length} tokens synced (${visibleCount} visible)`);
  } finally {
    await sql.end();
  }
}

await syncDB();
