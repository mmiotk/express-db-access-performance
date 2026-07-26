// Concurrency sweep: for the deep fetch (the most layer-sensitive pattern),
// drive each access layer at a range of connection counts and record throughput,
// to expose saturation behaviour and show the ranking is robust to load.
// Writes results/${outputFile} and a pgfplots figure results/tables/fig_scaling.tex.
//
// Env: CONNS (default 1,8,32,64,128,256), PATTERN (deep_fetch), ENGINES, ADAPTERS,
//      DURATION (4), REPEATS (2), WARMUP (1), INPUT_SEED, PORT (3200).
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
const CONNS = env('CONNS', '1,8,32,64,128,256').split(',').map((s) => Number(s.trim()));
const PATTERN = env('PATTERN', 'deep_fetch');
const DURATION = Number(env('DURATION', 4));
const REPEATS = Number(env('REPEATS', 2));
const WARMUP = Number(env('WARMUP', 1));
const INPUT_SEED = Number(env('INPUT_SEED', 20260725));
let port = Number(env('PORT', 3200));
const wantEngines = env('ENGINES', 'postgres,mysql').split(',').map((s) => s.trim());
const wantAdapters = env('ADAPTERS', Object.keys(ADAPTERS).join(',')).split(',').map((s) => s.trim());
const outputFile = env('SCALING_OUT', 'scaling.json');

const SEED_POSTS = cfg.seed.posts;
// benchmark-insert floor: fan-out seed posts (ids 250001..250006) own comments and
// must survive resets — same contract as the runner's RESET_FLOOR
const RESET_FLOOR = Number(env('RESET_FLOOR', 300000));
function mulberry32(a) {
  return function next() {
    a |= 0;
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rnd = (random, n) => 1 + Math.floor(random() * n);
const pathFor = {
  deep_fetch: (random) => '/posts/' + rnd(random, SEED_POSTS) + '/thread',
  point_read: (random) => '/posts/' + rnd(random, SEED_POSTS),
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
async function waitIdle(base, timeoutMs = 30000) { const deadline = Date.now() + timeoutMs; for (;;) { const s = await (await fetch(`${base}/stats`)).json(); if (s.active_handlers === 0) return; if (Date.now() > deadline) throw new Error('handler-drain timeout'); await new Promise((r) => setTimeout(r, 25)); } }
const run = (base, connections, seed, duration = DURATION) => new Promise((resolve, reject) => {
  const random = mulberry32(seed);
  autocannon({ url: base, connections, duration,
    requests: [{ setupRequest: (r) => ({ ...r, method: 'GET', path: pathFor[PATTERN](random) }) }] },
  (e, r) => (e ? reject(e) : resolve(r)));
});
async function resetWrites(engine) {
  if (engine === 'postgres') { const c = new pg.Client(cfg.postgres); await c.connect(); await c.query('DELETE FROM posts WHERE id > $1', [RESET_FLOOR]); await c.query("SELECT setval(pg_get_serial_sequence('posts', 'id'), $1, true)", [RESET_FLOOR]); await c.end(); }
  else { const c = await mysql.createConnection(cfg.mysql); await c.query('DELETE FROM posts WHERE id > ?', [RESET_FLOOR]); await c.query('ALTER TABLE posts AUTO_INCREMENT = ' + Number(RESET_FLOOR + 1)); await c.end(); }
}
function ensurePrisma(engine) {
  execFileSync('npx', ['prisma', 'generate', `--schema=${join(here, '..', 'prisma', `schema.${engine}.prisma`)}`], { stdio: 'ignore' });
}

async function sweepCell(adapter, engine, p) {
  if (adapter === 'prisma') ensurePrisma(engine);
  const base = `http://127.0.0.1:${p}`;
  const child = spawn(process.execPath, [join(here, '..', 'src', 'server.mjs')],
    { env: { ...process.env, ADAPTER: adapter, ENGINE: engine, PORT: String(p) }, stdio: ['ignore', 'inherit', 'inherit'] });
  const out = [];
  try {
    await waitForHealth(base); await resetWrites(engine);
    if (WARMUP > 0) { await run(base, CONNS[Math.floor(CONNS.length / 2)], INPUT_SEED - 1, WARMUP); await waitIdle(base); } // mid-load warm-up
    for (const c of CONNS) {
      const rpsRuns = [];
      for (let i = 0; i < REPEATS; i++) {
        const measured = await run(base, c, INPUT_SEED + c * 100 + i);
        await waitIdle(base);
        const errors = Number(measured.errors ?? 0);
        const timeouts = Number(measured.timeouts ?? 0);
        const non2xx = Number(measured.non2xx ?? ((measured['4xx'] ?? 0) + (measured['5xx'] ?? 0)));
        if (errors || timeouts || non2xx) {
          throw new Error('request failures at c=' + c + ', repeat=' + i + ': ' + errors + '/' + timeouts + '/' + non2xx);
        }
        rpsRuns.push(measured.requests.average);
      }
      const rps = Math.round(median(rpsRuns));
      out.push({ adapter, engine, connections: c, rps,
        rps_samples: rpsRuns.map((value) => +value.toFixed(3)),
        repeats: REPEATS, duration_s: DURATION, warmup_s: WARMUP,
        input_seed: INPUT_SEED, errors: 0, timeouts: 0, non2xx: 0 });
      console.log(`  ${adapter}/${engine} c=${c}: ${rps} req/s`);
    }
  } finally { if (child.exitCode === null) child.kill('SIGTERM'); await new Promise((resolve) => { if (child.exitCode !== null) return resolve(); const timeout = setTimeout(resolve, 5000); child.once('exit', () => { clearTimeout(timeout); resolve(); }); }); }
  return out;
}

const marks = ['*', 'square*', 'triangle*', 'diamond*', 'o', 'square', 'triangle', 'x', '+'];
function figure(all, engine) {
  const layers = [...new Set(all.filter((r) => r.engine === engine).map((r) => r.adapter))];
  const plots = layers.map((a, i) => {
    const pts = all.filter((r) => r.engine === engine && r.adapter === a)
      .sort((x, y) => x.connections - y.connections).map((r) => `(${r.connections},${r.rps})`).join(' ');
    return `    \\addplot+[mark=${marks[i % marks.length]}] coordinates {${pts}};\n    \\addlegendentry{${a.replace('_', '\\_')}}`;
  }).join('\n');
  return `% auto-generated by bench/scaling.mjs
\\begin{figure}[htbp]
  \\centering
  \\begin{tikzpicture}
  \\begin{axis}[width=\\linewidth,height=6.5cm,xlabel={Concurrent connections},
      ylabel={Throughput (req/s)},xmode=log,log basis x=2,legend pos=north west,
      legend columns=2,legend cell align=left,font=\\small,grid=both,
      title={deep fetch scaling on ${engine==="postgres"?"PostgreSQL":"MySQL"}}]
${plots}
  \\end{axis}
  \\end{tikzpicture}
  \\caption{Deep-fetch throughput of each configured layer across the declared concurrency ladder (${engine}). The curve maximum is used as an alternative empirical capacity denominator; uncertainty is assessed from the repeated point measurements.}
  \\label{fig:scaling}
\\end{figure}
`;
}

const all = [];
const failures = [];
for (const engine of wantEngines) {
  for (const adapter of wantAdapters) {
    const meta = ADAPTERS[adapter];
    if (!meta || !meta.engines.includes(engine)) continue;
    console.log(`\n== sweep ${adapter} on ${engine==="postgres"?"PostgreSQL":"MySQL"} ==`);
    try { all.push(...await sweepCell(adapter, engine, port++)); }
    catch (e) {
      failures.push(adapter + '/' + engine + ': ' + e.message);
      console.error('  FAILED ' + adapter + '/' + engine + ': ' + e.message);
    }
  }
}
if (failures.length) throw new Error('scaling sweep rejected:\n- ' + failures.join('\n- '));
let merged = all;
if (process.env.MERGE === '1') {
  try {
    const prev = JSON.parse(readFileSync(join(here, '..', 'results', outputFile), 'utf8'));
    const key = (r) => `${r.adapter}|${r.engine}|${r.connections}`;
    const fresh = new Set(all.map(key));
    merged = prev.filter((r) => !fresh.has(key(r))).concat(all);
    console.log(`[merge] replaced ${all.length} points, kept ${merged.length - all.length} existing`);
  } catch { console.warn('[merge] no existing scaling.json; writing fresh'); }
}
await writeFile(join(here, '..', 'results', outputFile), JSON.stringify(merged, null, 2));
await writeFile(join(here, '..', 'results', 'tables', 'fig_scaling.tex'), figure(merged, 'postgres'));
console.log(`\nWrote ${merged.length} points → results/${outputFile} + tables/fig_scaling.tex`);
