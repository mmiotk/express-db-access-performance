// Per-pattern concurrency/capacity sweep (review 6.5). The primary matrix fixes 50
// connections; the deep-fetch concurrency sweep (bench/scaling.mjs, Supplement Fig S2)
// characterizes capacity for that pattern only. This extends the sweep to ALL FIVE access
// patterns on both engines, so we can locate each pattern's throughput knee and report the
// UTILIZATION at the 50-connection operating point (achieved@50 / saturating), turning the
// reviewer's "unknown relative utilization" for the four non-deep-fetch patterns into a
// measured quantity. Writes results/scaling_patterns.json.
//
// Env: CONNS (default 1,4,8,16,32,50,100,200), PATTERNS (all five), ENGINES, ADAPTERS,
//      DURATION (5), REPEATS (2), WARMUP (1), PORT (3300), RESET_FLOOR (300000).
import { spawn, execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import autocannon from 'autocannon';
import pg from 'pg';
import mysql from 'mysql2/promise';
import { ADAPTERS, config as cfg } from '../src/config.mjs';
import { median } from './stats.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const env = (k, d) => (process.env[k] ?? d);
const CONNS = env('CONNS', '1,4,8,16,32,50,100,200').split(',').map((s) => Number(s.trim()));
// reads first, write last (write is the only pattern that touches disk/binlog)
const PATTERNS = env('PATTERNS', 'point_read,range_scan,deep_fetch,aggregation,write').split(',').map((s) => s.trim());
const DURATION = Number(env('DURATION', 5));
const REPEATS = Number(env('REPEATS', 2));
const WARMUP = Number(env('WARMUP', 1));
// never hand a server a port the databases listen on — a naive port++ that walks into
// MySQL's 3306 (or 5432/33060) fails the cell with a health timeout (same guard as runner.mjs)
const RESERVED_PORTS = new Set([3306, 5432, 33060]);
let portCursor = Number(env('PORT', 3300)) - 1;
const nextPort = () => { do { portCursor++; } while (RESERVED_PORTS.has(portCursor)); return portCursor; };
const wantEngines = env('ENGINES', 'postgres,mysql').split(',').map((s) => s.trim());
const wantAdapters = env('ADAPTERS', Object.keys(ADAPTERS).join(',')).split(',').map((s) => s.trim());

const SEED_POSTS = cfg.seed.posts;
const SEED_AUTHORS = cfg.seed.authors;
// fan-out seed posts (ids 250001..) own comments and must survive resets: keep the runner's contract
const RESET_FLOOR = Number(env('RESET_FLOOR', 300000));
const rnd = (n) => 1 + Math.floor(Math.random() * n);

// autocannon request shape per pattern (mirrors bench/runner.mjs endpoints())
const requestsFor = {
  point_read: () => [{ setupRequest: (r) => ({ ...r, method: 'GET', path: `/posts/${rnd(SEED_POSTS)}` }) }],
  range_scan: () => [{ setupRequest: (r) => ({ ...r, method: 'GET', path: `/posts?limit=20&before=${20 + rnd(SEED_POSTS)}` }) }],
  deep_fetch: () => [{ setupRequest: (r) => ({ ...r, method: 'GET', path: `/posts/${rnd(SEED_POSTS)}/thread` }) }],
  aggregation: () => [{ setupRequest: (r) => ({ ...r, method: 'GET', path: `/authors/${rnd(SEED_AUTHORS)}/summary` }) }],
  write: () => [{ method: 'POST', path: '/posts', headers: { 'content-type': 'application/json' }, setupRequest: (r) => ({ ...r, body: JSON.stringify({ authorId: rnd(SEED_AUTHORS), title: 'bench', body: 'x' }) }) }],
};

function waitForHealth(base, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try { if ((await fetch(`${base}/health`)).ok) return resolve(true); } catch { /* wait */ }
      if (Date.now() > deadline) return reject(new Error('health timeout'));
      setTimeout(tick, 250);
    };
    tick();
  });
}
const run = (base, connections, pattern) => new Promise((resolve, reject) => {
  autocannon({ url: base, connections, duration: DURATION, requests: requestsFor[pattern]() },
    (e, r) => (e ? reject(e) : resolve(r)));
});
async function resetWrites(engine) {
  if (engine === 'postgres') { const c = new pg.Client(cfg.postgres); await c.connect(); await c.query('DELETE FROM posts WHERE id > $1', [RESET_FLOOR]); await c.end(); }
  else { const c = await mysql.createConnection(cfg.mysql); await c.query('DELETE FROM posts WHERE id > ?', [RESET_FLOOR]); await c.end(); }
}
function ensurePrisma(engine) {
  execFileSync('npx', ['prisma', 'generate', `--schema=${join(here, '..', 'prisma', `schema.${engine}.prisma`)}`], { stdio: 'ignore' });
}

async function sweepCell(adapter, engine, pattern, p) {
  if (adapter === 'prisma') ensurePrisma(engine);
  const base = `http://127.0.0.1:${p}`;
  const child = spawn(process.execPath, [join(here, '..', 'src', 'server.mjs')],
    { env: { ...process.env, ADAPTER: adapter, ENGINE: engine, PORT: String(p) }, stdio: ['ignore', 'inherit', 'inherit'] });
  const out = [];
  try {
    await waitForHealth(base);
    if (pattern === 'write') await resetWrites(engine);
    if (WARMUP > 0) await run(base, CONNS[Math.floor(CONNS.length / 2)], pattern); // mid-load warm-up
    for (const c of CONNS) {
      const rpsRuns = []; let non2xx = 0;
      for (let i = 0; i < REPEATS; i++) {
        if (pattern === 'write') await resetWrites(engine); // keep the table size stable across runs
        const r = await run(base, c, pattern);
        rpsRuns.push(r.requests.average);
        non2xx += (r.non2xx || 0) + (r['4xx'] || 0) + (r['5xx'] || 0);
      }
      const rps = Math.round(median(rpsRuns));
      out.push({ adapter, engine, pattern, connections: c, rps, non2xx });
      console.log(`  ${pattern} ${adapter}/${engine} c=${c}: ${rps} req/s${non2xx ? ` (non2xx=${non2xx}!)` : ''}`);
    }
  } finally { child.kill('SIGTERM'); await new Promise((r) => setTimeout(r, 500)); }
  return out;
}

const all = [];
for (const pattern of PATTERNS) {
  for (const engine of wantEngines) {
    for (const adapter of wantAdapters) {
      const meta = ADAPTERS[adapter];
      if (!meta || !meta.engines.includes(engine)) continue;
      console.log(`\n== ${pattern} :: ${adapter} on ${engine === 'postgres' ? 'PostgreSQL' : 'MySQL'} ==`);
      try { all.push(...await sweepCell(adapter, engine, pattern, nextPort())); }
      catch (e) { console.error(`  FAILED ${pattern}/${adapter}/${engine}: ${e.message}`); }
    }
  }
}

let merged = all;
if (process.env.MERGE === '1') {
  try {
    const prev = JSON.parse(readFileSync(join(here, '..', 'results', 'scaling_patterns.json'), 'utf8'));
    const key = (r) => `${r.pattern}|${r.adapter}|${r.engine}|${r.connections}`;
    const fresh = new Set(all.map(key));
    merged = prev.filter((r) => !fresh.has(key(r))).concat(all);
    console.log(`[merge] replaced ${all.length} points, kept ${merged.length - all.length} existing`);
  } catch { console.warn('[merge] no existing scaling_patterns.json; writing fresh'); }
}
await writeFile(join(here, '..', 'results', 'scaling_patterns.json'), JSON.stringify(merged, null, 2));
console.log(`\nWrote ${merged.length} points (${PATTERNS.length} patterns) → results/scaling_patterns.json`);
