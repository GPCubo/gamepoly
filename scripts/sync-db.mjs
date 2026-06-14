/**
 * sync-db.mjs — Upserts canonical board, tiles, and tokens into PostgreSQL.
 *
 * Requires POSTGRES_DSN env var and the `pg` package:
 *   npm install --save-dev pg
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
  let pgModule;
  try {
    pgModule = await import('pg');
  } catch {
    console.error('✗ Missing dependency: run `npm install --save-dev pg` first');
    process.exit(1);
  }

  const PgClient = pgModule.default?.Client ?? pgModule.Client;

  const dsn = process.env.POSTGRES_DSN;
  if (!dsn) {
    console.error('✗ POSTGRES_DSN environment variable is not set');
    process.exit(1);
  }

  const client = new PgClient({ connectionString: dsn });
  await client.connect();

  try {
    const tiles  = parseBoardTiles();
    const tokens = scanTokens();

    // Upsert canonical Spanish board
    const BOARD_SLUG = 'monopoly-es';
    const { rows } = await client.query(`
      INSERT INTO boards (slug, locale, display_name, glb_path, visible)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (slug) DO UPDATE SET
        locale       = EXCLUDED.locale,
        display_name = EXCLUDED.display_name,
        glb_path     = EXCLUDED.glb_path,
        updated_at   = NOW()
      RETURNING id
    `, [BOARD_SLUG, 'es', 'Monopoly Clásico', '/models/tablero.glb', true]);

    const boardId = rows[0].id;

    // Upsert all 40 tiles
    for (const t of tiles) {
      await client.query(`
        INSERT INTO board_tiles
          (board_id, tile_index, tile_type, tile_group, name, short_name, price, color_hex)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (board_id, tile_index) DO UPDATE SET
          tile_type  = EXCLUDED.tile_type,
          tile_group = EXCLUDED.tile_group,
          name       = EXCLUDED.name,
          short_name = EXCLUDED.short_name,
          price      = EXCLUDED.price,
          color_hex  = EXCLUDED.color_hex
      `, [boardId, t.index, t.type, t.group, t.name, t.shortName, t.price, t.colorHex]);
    }

    // Upsert tokens
    for (const tok of tokens) {
      await client.query(`
        INSERT INTO tokens (slug, glb_path, label_key, visible, sort_order)
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (slug) DO UPDATE SET
          glb_path   = EXCLUDED.glb_path,
          label_key  = EXCLUDED.label_key,
          visible    = EXCLUDED.visible,
          sort_order = EXCLUDED.sort_order
      `, [tok.slug, tok.glbPath, tok.labelKey, tok.visible, tok.sortOrder]);
    }

    const visibleCount = tokens.filter(t => t.visible).length;
    console.log(`✓ Board '${BOARD_SLUG}' synced — ${tiles.length} tiles`);
    console.log(`✓ ${tokens.length} tokens synced (${visibleCount} visible)`);
  } finally {
    await client.end();
  }
}

await syncDB();
