// Utilization-controlled open-loop tail latency (review 4, §6.1). The primary p99
// is a SATURATED closed-loop response time and tracks throughput; it is not
// intrinsic tail latency. This measures the coordinated-omission-corrected tail at
// MATCHED UTILIZATION: each layer is offered 50/70/85/95% of ITS OWN saturating
// throughput (taken from the primary deep-fetch closed-loop rps in results/raw.json),
// replicated OL_REPS times, on both engines. Comparing layers at equal utilization
// (not equal concurrency) decouples latency from capacity — the reviewer's ask.
// Writes results/utilization.<engine>.json.
import { spawn, execSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'undici';
import { config as cfg } from '../src/config.mjs';
import { median } from '../bench/stats.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const SEED_POSTS = cfg.seed.posts;
const env = (k, d) => process.env[k] ?? d;
const UL_ENGINE = env('UL_ENGINE', 'postgres');
const NATIVE = UL_ENGINE === 'mysql' ? 'mysql2' : 'pg';
const LAYERS = env('UL_LAYERS', `${NATIVE},knex,drizzle,prisma,sequelize,typeorm,objection,mikroorm`).split(',');
const FRACTIONS = env('UL_FRACTIONS', '0.50,0.70,0.85,0.95').split(',').map(Number);
const REPS = Number(env('UL_REPS', 5));
const DURATION_MS = Number(env('UL_DURATION_MS', 8000));
const WARMUP_MS = 3000, TIMEOUT_MS = 10000, CONNECTIONS = 256;

const raw = JSON.parse(await readFile(join(here, '..', 'results', 'raw.json'), 'utf8'));
const capacity = (adapter) => {
  const r = raw.find((x) => x.adapter === adapter && x.engine === UL_ENGINE && x.endpoint === 'deep_fetch');
  return r ? r.rps : null;                    // saturating closed-loop throughput
};

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function health(base, tries = 120) { return new Promise((res, rej) => { const t = async () => { try { const r = await fetch(`${base}/health`); if (r.ok) return res(); } catch {} if (--tries <= 0) return rej(new Error('health timeout')); setTimeout(t, 100); }; t(); }); }

// One CO-corrected open-loop pass at a fixed offered rate (copied from openloop2.mjs
// so that script's Supplement Table S6/S17 outputs are untouched).
async function pass(base, rate, durationMs, seed) {
  const pool = new Pool(base, { connections: CONNECTIONS, pipelining: 1 });
  const rnd = mulberry32(seed);
  const total = Math.max(1, Math.floor((durationMs / 1000) * rate));
  const interval = 1000 / rate;
  const lat = new Float64Array(total);
  let completed = 0, timeouts = 0, errors = 0;
  const t0 = performance.now();
  const results = [];
  const fire = async (k, scheduledAt) => {
    const path = `/posts/${1 + Math.floor(rnd() * SEED_POSTS)}/thread`;
    try {
      const ac = new AbortController();
      const deadline = setTimeout(() => ac.abort(), Math.max(1, scheduledAt + TIMEOUT_MS - performance.now()));
      const res = await pool.request({ path, method: 'GET', signal: ac.signal });
      await res.body.text();
      clearTimeout(deadline);
      lat[k] = performance.now() - scheduledAt;            // CO-corrected: from intended time
      if (res.statusCode === 200) completed++; else errors++;
    } catch { lat[k] = performance.now() - scheduledAt; timeouts++; }
  };
  for (let k = 0; k < total; k++) {
    const scheduledAt = t0 + k * interval;
    const wait = scheduledAt - performance.now();
    if (wait > 1) await new Promise((r) => setTimeout(r, wait));
    results.push(fire(k, scheduledAt));
  }
  await Promise.allSettled(results);
  await pool.close();
  const sorted = Array.from(lat.slice(0, total)).sort((a, b) => a - b);
  const q = (p) => sorted[Math.min(total - 1, Math.floor(p * total))];
  const elapsedS = (performance.now() - t0) / 1000;
  return { achieved: Math.round(completed / elapsedS), timeouts, errors,
    p50: +q(0.50).toFixed(1), p90: +q(0.90).toFixed(1), p99: +q(0.99).toFixed(1) };
}

const out = [];
let port = 4700;
for (const adapter of LAYERS) {
  const cap = capacity(adapter);
  if (!cap) { console.error(`  no capacity for ${adapter}/${UL_ENGINE}; skipping`); continue; }
  const base = `http://127.0.0.1:${port++}`;
  if (adapter === 'prisma') execSync(`npx prisma generate --schema=prisma/schema.${UL_ENGINE}.prisma`, { stdio: 'ignore' });
  const child = spawn(process.execPath, [join(here, '..', 'src', 'server.mjs')], {
    env: { ...process.env, TZ: 'UTC', ADAPTER: adapter, ENGINE: UL_ENGINE, PORT: String(base.split(':')[2]) },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  try {
    await health(base);
    for (const frac of FRACTIONS) {
      const rate = Math.max(1, Math.round(frac * cap));
      await pass(base, Math.min(rate, cap), WARMUP_MS, 7);          // warm-up
      const p99s = [], achs = [], tos = [];
      for (let i = 0; i < REPS; i++) {
        const r = await pass(base, rate, DURATION_MS, 100 + i);
        p99s.push(r.p99); achs.push(r.achieved); tos.push(r.timeouts);
      }
      const rec = { engine: UL_ENGINE, adapter, capacity: cap, fraction: frac, offered: rate,
        achieved_med: Math.round(median(achs)), p99_med: +median(p99s).toFixed(1), p99_samples: p99s, timeouts_total: tos.reduce((a, b) => a + b, 0) };
      out.push(rec);
      console.log(`  ${UL_ENGINE}/${adapter} @${(frac * 100).toFixed(0)}% (${rate}/s of ${cap}): p99 med ${rec.p99_med}ms  achieved ${rec.achieved_med}  to=${rec.timeouts_total}`);
    }
  } catch (e) { console.error(`  FAILED ${UL_ENGINE}/${adapter}: ${e.message}`); }
  finally { child.kill('SIGTERM'); await new Promise((r) => setTimeout(r, 400)); }
}
await writeFile(join(here, '..', 'results', `utilization.${UL_ENGINE}.json`), JSON.stringify(out, null, 2));
console.log(`\nwrote results/utilization.${UL_ENGINE}.json (${out.length} cells)`);
