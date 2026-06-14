/**
 * sync-all.mjs — Master sync entry point.
 *
 * 1. Syncs Spanish board → Blender Python script
 * 2. Syncs English board → Blender Python script
 * 3. Syncs both boards + tokens → PostgreSQL
 *
 * Usage: node scripts/sync-all.mjs
 * Requires POSTGRES_DSN env var for the DB step.
 */

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function run(script, args = []) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [join(__dirname, script), ...args], {
      stdio: 'inherit',
      env: process.env,
    });
    proc.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`${script} exited with code ${code}`));
    });
  });
}

console.log('\n── Syncing Blender config (ES) ─────────────────────────────');
await run('sync-board-config.mjs', ['--board', 'es']);

console.log('\n── Syncing Blender config (EN) ─────────────────────────────');
await run('sync-board-config.mjs', ['--board', 'en']);

console.log('\n── Syncing database (ES + EN + tokens) ─────────────────────');
await run('sync-db.mjs');

console.log('\n✔ All sync steps complete\n');
