/**
 * sync-all.mjs — Master sync entry point.
 *
 * 1. Syncs boardTilesConfig.ts → Blender Python script
 * 2. Syncs boardTilesConfig.ts + token GLBs → PostgreSQL
 *
 * Usage: node scripts/sync-all.mjs
 * Requires POSTGRES_DSN env var for the DB step.
 */

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function run(script) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [join(__dirname, script)], {
      stdio: 'inherit',
      env: process.env,
    });
    proc.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`${script} exited with code ${code}`));
    });
  });
}

console.log('\n── Syncing Blender config ──────────────────────────────────');
await run('sync-board-config.mjs');

console.log('\n── Syncing database ────────────────────────────────────────');
await run('sync-db.mjs');

console.log('\n✔ All sync steps complete\n');
