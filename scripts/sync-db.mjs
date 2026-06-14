/**
 * sync-db.mjs — Upserts board tiles, cards, and tokens into PostgreSQL.
 *
 * Syncs both boards:
 *   board-es  ← config/boardTilesConfigEs.ts + config/boardCardsConfigEs.ts
 *   board-en  ← config/boardTilesConfigEn.ts + config/boardCardsConfigEn.ts
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

// ── Generic tile parser ────────────────────────────────────────────────────

function parseTiles(tsFile, varName) {
  const tsSource = readFileSync(join(ROOT, 'config', tsFile), 'utf-8');
  const pattern = new RegExp(
    'export\\s+const\\s+' + varName + '[^=]*=\\s*\\[([\\s\\S]*?)\\];'
  );
  const arrayMatch = tsSource.match(pattern);
  if (!arrayMatch) throw new Error(`Could not find ${varName} in ${tsFile}`);

  const tiles = [];
  const objRegex = /\{([^}]+)\}/g;
  let match;
  while ((match = objRegex.exec(arrayMatch[1])) !== null) {
    const body = match[1];
    const indexM  = body.match(/index:\s*(\d+)/);
    const typeM   = body.match(/type:\s*"([^"]+)"/);
    const groupM  = body.match(/group:\s*"([^"]+)"/);
    const nameM   = body.match(/name:\s*"([^"]+)"/);
    const shortM  = body.match(/shortName:\s*"([^"]+)"/);
    const priceM  = body.match(/price:\s*(\d+)/);
    const colorM  = body.match(/color:\s*"([^"]+)"/);
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

  if (tiles.length !== 40) throw new Error(`Expected 40 tiles, found ${tiles.length} in ${tsFile}`);
  return tiles;
}

// ── Generic card parser (brace-counting to handle {tileName} in strings) ──

function extractObjectBodies(src) {
  const bodies = [];
  let depth = 0, start = -1;
  for (let i = 0; i < src.length; i++) {
    if (src[i] === '"') {
      i++;
      while (i < src.length && src[i] !== '"') {
        if (src[i] === '\\') i++;
        i++;
      }
    } else if (src[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (src[i] === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        bodies.push(src.slice(start + 1, i));
        start = -1;
      }
    }
  }
  return bodies;
}

function parseCardArray(tsSource, varName) {
  const pattern = new RegExp(
    'export\\s+const\\s+' + varName + '[^=]*=\\s*\\[([\\s\\S]*?)\\];'
  );
  const arrayMatch = tsSource.match(pattern);
  if (!arrayMatch) throw new Error(`Could not find ${varName}`);

  const bodies = extractObjectBodies(arrayMatch[1]);
  return bodies.map((body, i) => {
    const idM        = body.match(/id:\s*"([^"]+)"/);
    const groupM     = body.match(/group:\s*"([^"]+)"/);
    const textM      = body.match(/text:\s*"([^"]+)"/);
    const actionM    = body.match(/action:\s*"([^"]+)"/);
    const amountM    = body.match(/amount:\s*(-?\d+)/);
    const tileIndexM = body.match(/tileIndex:\s*(\d+)/);
    if (!idM || !groupM || !textM || !actionM) return null;
    return {
      cardIndex:  i,
      cardId:     idM[1],
      group:      groupM[1],
      text:       textM[1],
      action:     actionM[1],
      amount:     amountM    ? parseInt(amountM[1])    : null,
      tileIndex:  tileIndexM ? parseInt(tileIndexM[1]) : null,
    };
  }).filter(Boolean);
}

function parseCards(tsFile, chanceVar, communityVar) {
  const tsSource = readFileSync(join(ROOT, 'config', tsFile), 'utf-8');
  const chance    = parseCardArray(tsSource, chanceVar);
  const community = parseCardArray(tsSource, communityVar);
  if (chance.length !== 16)    throw new Error(`Expected 16 chance cards in ${tsFile}, found ${chance.length}`);
  if (community.length !== 16) throw new Error(`Expected 16 community cards in ${tsFile}, found ${community.length}`);
  return [...chance, ...community];
}

// ── Scan token GLBs ────────────────────────────────────────────────────────

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

// ── Board definitions ──────────────────────────────────────────────────────

const BOARDS = [
  {
    slug:        'board-es',
    locale:      'es',
    displayName: 'Monopoly Clásico',
    glbPath:     '/models/tablero.glb',
    visible:     true,
    tilesFile:   'boardTilesConfigEs.ts',
    tilesVar:    'BOARD_TILES_ES',
    cardsFile:   'boardCardsConfigEs.ts',
    chanceVar:   'CHANCE_CARDS_ES',
    communityVar: 'COMMUNITY_CARDS_ES',
  },
  {
    slug:        'board-en',
    locale:      'en',
    displayName: 'Crestwood City',
    glbPath:     '/models/tablero.glb',
    visible:     true,
    tilesFile:   'boardTilesConfigEn.ts',
    tilesVar:    'BOARD_TILES_EN',
    cardsFile:   'boardCardsConfigEn.ts',
    chanceVar:   'CHANCE_CARDS_EN',
    communityVar: 'COMMUNITY_CARDS_EN',
  },
];

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
    const tokens = scanTokens();

    for (const board of BOARDS) {
      const tiles = parseTiles(board.tilesFile, board.tilesVar);
      const cards = parseCards(board.cardsFile, board.chanceVar, board.communityVar);

      // Upsert board
      const [{ id: boardId }] = await sql`
        INSERT INTO boards (slug, locale, display_name, glb_path, visible)
        VALUES (${board.slug}, ${board.locale}, ${board.displayName}, ${board.glbPath}, ${board.visible})
        ON CONFLICT (slug) DO UPDATE SET
          locale       = EXCLUDED.locale,
          display_name = EXCLUDED.display_name,
          glb_path     = EXCLUDED.glb_path,
          updated_at   = NOW()
        RETURNING id
      `;

      // Upsert tiles
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

      // Upsert cards
      for (const c of cards) {
        await sql`
          INSERT INTO board_cards
            (board_id, card_group, card_index, card_id, text, action, amount, tile_index)
          VALUES (${boardId}, ${c.group}, ${c.cardIndex}, ${c.cardId}, ${c.text}, ${c.action}, ${c.amount}, ${c.tileIndex})
          ON CONFLICT (board_id, card_group, card_index) DO UPDATE SET
            card_id    = EXCLUDED.card_id,
            text       = EXCLUDED.text,
            action     = EXCLUDED.action,
            amount     = EXCLUDED.amount,
            tile_index = EXCLUDED.tile_index
        `;
      }

      console.log(`✓ Board '${board.slug}' synced — ${tiles.length} tiles, ${cards.length} cards`);
    }

    // Upsert tokens (shared across boards)
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
    console.log(`✓ ${tokens.length} tokens synced (${visibleCount} visible)`);
  } finally {
    await sql.end();
  }
}

await syncDB();
