// Mixed read/write workload (review 4, §S5). The primary matrix drives one endpoint
// per run; the reviewer asks for a mixed workload. This interleaves the deep/nested
// read (GET /posts/:id/thread) with single-row inserts (POST /posts) at documented
// mixes (default 90/10 and 70/30) via autocannon weighted requests, on representative
// layers and both engines, with a physical write reset before each run. Exploratory /
// sensitivity, not part of the primary matrix. Writes results/mixed.json.
import { spawn, execSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import autocannon from 'autocannon';
import pg from 'pg';
import mysql from 'mysql2/promise';
import { config as cfg } from '../src/config.mjs';
import { median } from '../bench/stats.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const env = (k, d) => process.env[k] ?? d;
const ENGINES = env('MX_ENGINES', 'postgres,mysql').split(',');
const MIXES = env('MX_MIXES', '90:10,70:30').split(',');       // read:write percentages
const CONNECTIONS = Number(env('MX_CONN', 50));
const DURATION = Number(env('MX_DURATION', 10));
const REPS = Number(env('MX_REPS', 5));
const FLOOR = cfg.seed.posts;
const layersFor = (e) => env('MX_LAYERS', `${e === 'mysql' ? 'mysql2' : 'pg'},knex,prisma,mikroorm`).split(',');

const drain = () => new Promise((r) => setTimeout(r, 800));
async function resetDb(engine) {
  if (engine === 'postgres') {
    const c = new pg.Client(cfg.postgres); await c.connect();
    await c.query('DELETE FROM comments WHERE post_id > $1', [FLOOR]);
    await c.query('DELETE FROM posts WHERE id > $1', [FLOOR]);
    await c.end();
  } else {
    const c = await mysql.createConnection({ host: cfg.mysql.host, port: cfg.mysql.port, user: cfg.mysql.user, password: cfg.mysql.password, database: cfg.mysql.database });
    await c.query('DELETE FROM comments WHERE post_id > ?', [FLOOR]);
    await c.query('DELETE FROM posts WHERE id > ?', [FLOOR]);
    await c.end();
  }
}

function health(base, tries = 150) { return new Promise((res, rej) => { const t = async () => { try { const r = await fetch(`${base}/health`); if (r.ok) return res(); } catch {} if (--tries <= 0) return rej(new Error('health timeout')); setTimeout(t, 100); }; t(); }); }
function run(base, readW, writeW) {
  return new Promise((resolve, reject) => autocannon({
    url: base, connections: CONNECTIONS, duration: DURATION,
    requests: [
      { method: 'GET', path: '/posts/1/thread', weight: readW },
      { method: 'POST', path: '/posts', headers: { 'content-type': 'application/json' }, body: '{}', weight: writeW },
    ],
  }, (e, r) => e ? reject(e) : resolve({ rps: Math.round(r.requests.average), p99: r.latency.p99, non2xx: r.non2xx })));
}

const out = [];
let port = 4800;
for (const engine of ENGINES) {
  for (const adapter of layersFor(engine)) {
    if (adapter === 'prisma') execSync(`npx prisma generate --schema=prisma/schema.${engine}.prisma`, { stdio: 'ignore' });
    const base = `http://127.0.0.1:${port++}`;
    const child = spawn(process.execPath, [join(here, '..', 'src', 'server.mjs')], {
      env: { ...process.env, TZ: 'UTC', ADAPTER: adapter, ENGINE: engine, PORT: String(base.split(':')[2]) },
      stdio: ['ignore', 'ignore', 'inherit'],
    });
    try {
      await health(base);
      for (const mix of MIXES) {
        const [readW, writeW] = mix.split(':').map(Number);
        await resetDb(engine); await run(base, readW, writeW); await drain();  // warm-up
        const rps = [], p99 = [];
        for (let i = 0; i < REPS; i++) { await resetDb(engine); const r = await run(base, readW, writeW); rps.push(r.rps); p99.push(r.p99); await drain(); }
        const rec = { engine, adapter, mix, rps_med: median(rps), p99_med: median(p99), rps_samples: rps };
        out.push(rec);
        console.log(`  ${engine}/${adapter} ${mix} r:w: rps ${rec.rps_med}  p99 ${rec.p99_med}ms`);
      }
    } catch (e) { console.error(`  FAILED ${engine}/${adapter}: ${e.message}`); }
    finally { child.kill('SIGTERM'); await new Promise((r) => setTimeout(r, 400)); await resetDb(engine).catch(() => {}); }
  }
}
await writeFile(join(here, '..', 'results', 'mixed.json'), JSON.stringify(out, null, 2));
console.log(`\nwrote results/mixed.json (${out.length} cells)`);
