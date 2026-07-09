// Benchmark matrix runner.
//
// For every valid (adapter, engine) cell it: boots one server process, waits for
// /health, warms each endpoint, then drives autocannon per endpoint and records
// throughput (req/s) and latency percentiles (p50/p90/p97.5/p99). Repeats R times
// and reports medians. Writes results/{raw.json, summary.csv} and LaTeX tables.
//
// Env knobs:
//   ADAPTERS   comma list (default: all)      ENGINES  comma list (default: postgres,mysql)
//   DURATION   seconds per endpoint (10)      CONNECTIONS  concurrent conns (50)
//   REPEATS    runs per cell (3)              WARMUP   seconds (3)
//   PORT       base port (3100)
//
// Example (quick sanity): ADAPTERS=pg,knex ENGINES=postgres DURATION=3 REPEATS=1 node bench/runner.mjs

import { spawn, execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import autocannon from 'autocannon';
import pg from 'pg';
import mysql from 'mysql2/promise';
import { ADAPTERS, config as cfg } from '../src/config.mjs';
import { median, toCsv, texTableCombined } from './stats.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const resultsDir = join(here, '..', 'results');

const env = (k, d) => (process.env[k] ?? d);
const DURATION = Number(env('DURATION', 10));
const CONNECTIONS = Number(env('CONNECTIONS', 50));
const REPEATS = Number(env('REPEATS', 3));
const WARMUP = Number(env('WARMUP', 3));
const BASE_PORT = Number(env('PORT', 3100));

const wantAdapters = (env('ADAPTERS', Object.keys(ADAPTERS).join(','))).split(',').map((s) => s.trim());
const wantEngines = (env('ENGINES', 'postgres,mysql')).split(',').map((s) => s.trim());
const wantEndpoints = (env('ENDPOINTS', 'point_read,range_scan,deep_fetch,aggregation,write')).split(',').map((s) => s.trim());

const SEED_POSTS = cfg.seed.posts;
const SEED_AUTHORS = cfg.seed.authors;
const rnd = (n) => 1 + Math.floor(Math.random() * n);

// Each endpoint: how autocannon should shape requests against the running server.
function endpoints(base) {
  return [
    { key: 'point_read', title: 'Point read', opts: { url: base, requests: [{ setupRequest: (r) => ({ ...r, method: 'GET', path: `/posts/${rnd(SEED_POSTS)}` }) }] } },
    { key: 'range_scan', title: 'Range scan', opts: { url: base, requests: [{ setupRequest: (r) => ({ ...r, method: 'GET', path: `/posts?limit=20&before=${20 + rnd(SEED_POSTS)}` }) }] } },
    { key: 'deep_fetch', title: 'Deep fetch', opts: { url: base, requests: [{ setupRequest: (r) => ({ ...r, method: 'GET', path: `/posts/${rnd(SEED_POSTS)}/thread` }) }] } },
    { key: 'aggregation', title: 'Aggregation', opts: { url: base, requests: [{ setupRequest: (r) => ({ ...r, method: 'GET', path: `/authors/${rnd(SEED_AUTHORS)}/summary` }) }] } },
    { key: 'write', title: 'Insert', opts: { url: base, requests: [{ method: 'POST', path: '/posts', headers: { 'content-type': 'application/json' }, setupRequest: (r) => ({ ...r, body: JSON.stringify({ authorId: rnd(SEED_AUTHORS), title: 'bench', body: 'x' }) }) }] } },
  ];
}

function waitForHealth(base, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(`${base}/health`);
        if (res.ok) return resolve(true);
      } catch { /* not up yet */ }
      if (Date.now() > deadline) return reject(new Error('server health timeout'));
      setTimeout(tick, 250);
    };
    tick();
  });
}

function runAutocannon(opts, { duration }) {
  return new Promise((resolve, reject) => {
    autocannon({ ...opts, connections: CONNECTIONS, duration, warmup: undefined }, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// --- Server-process resource sampler (Linux /proc). The load generator runs in
// THIS process; the server under test is the child, so sampling child.pid isolates
// the access layer's own CPU and memory from the load generator and the database.
const CLK_TCK = 100; // Linux USER_HZ

function cpuTicks(pid) {
  try {
    const s = readFileSync(`/proc/${pid}/stat`, 'utf8');
    const f = s.slice(s.lastIndexOf(')') + 2).split(' '); // fields from #3 (state)
    return Number(f[11]) + Number(f[12]);                 // utime(#14)+stime(#15)
  } catch { return null; }
}
function rssMB(pid) {
  try {
    const m = readFileSync(`/proc/${pid}/status`, 'utf8').match(/VmRSS:\s+(\d+)\s+kB/);
    return m ? Number(m[1]) / 1024 : null;
  } catch { return null; }
}
function startSampler(pid) {
  let last = cpuTicks(pid); let lastT = process.hrtime.bigint();
  const cpu = []; let rssPeak = 0; let timer = null; let stopped = false;
  const tick = () => {
    if (stopped) return;
    const c = cpuTicks(pid); const t = process.hrtime.bigint();
    const dt = Number(t - lastT) / 1e9;
    if (c != null && last != null && dt > 0) cpu.push(((c - last) / CLK_TCK) / dt * 100);
    last = c; lastT = t;
    const r = rssMB(pid); if (r && r > rssPeak) rssPeak = r;
    timer = setTimeout(tick, 200);
  };
  timer = setTimeout(tick, 200);
  return () => {
    stopped = true; if (timer) clearTimeout(timer);
    return { cpuPct: cpu.length ? Math.round(median(cpu)) : null, rssPeakMB: rssPeak ? Math.round(rssPeak) : null };
  };
}

// Prisma's client is generated per provider; regenerate before a prisma cell so
// the full matrix runs in one command.
function ensurePrismaClient(engine) {
  const schema = join(here, '..', 'prisma', `schema.${engine}.prisma`);
  execFileSync('npx', ['prisma', 'generate', `--schema=${schema}`], { stdio: 'ignore' });
}

// The write endpoint inserts rows; delete them so every cell starts from the
// identical seeded table (reproducibility + isolation between adapters/engines).
// Seeded posts have id <= SEED_POSTS; benchmark inserts have id > SEED_POSTS and
// carry no comments, so this is FK-safe.
async function resetWrites(engine) {
  if (engine === 'postgres') {
    const c = new pg.Client(cfg.postgres); await c.connect();
    await c.query('DELETE FROM posts WHERE id > $1', [SEED_POSTS]); await c.end();
  } else {
    const c = await mysql.createConnection(cfg.mysql);
    await c.query('DELETE FROM posts WHERE id > ?', [SEED_POSTS]); await c.end();
  }
}

async function benchCell(adapter, engine, port, { repeats = REPEATS } = {}) {
  if (adapter === 'prisma') ensurePrismaClient(engine);
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [join(here, '..', 'src', 'server.mjs')], {
    env: { ...process.env, ADAPTER: adapter, ENGINE: engine, PORT: String(port) },
    stdio: ['ignore', 'inherit', 'inherit'],
  });

  const rows = [];
  try {
    await waitForHealth(base);
    await resetWrites(engine); // start every cell from the identical seeded table
    for (const ep of endpoints(base).filter((e) => wantEndpoints.includes(e.key))) {
      // The write endpoint grows the table, so reset before the warm-up and before
      // every measured run (not just once per cell), so each run starts from the
      // identical seeded table rather than one grown by the earlier runs.
      if (ep.key === 'write') await resetWrites(engine);
      // warm-up (JIT + pool fill + plan cache) — measurements discarded
      if (WARMUP > 0) await runAutocannon(ep.opts, { duration: WARMUP });

      const reqps = [];
      const p50 = []; const p90 = []; const p99 = []; const p975 = [];
      const stopSampler = startSampler(child.pid); // server-process CPU/RSS over the measured runs
      for (let i = 0; i < repeats; i++) {
        if (ep.key === 'write') await resetWrites(engine);
        const r = await runAutocannon(ep.opts, { duration: DURATION });
        reqps.push(r.requests.average);
        p50.push(r.latency.p50); p90.push(r.latency.p90); p975.push(r.latency.p97_5 ?? r.latency.p975); p99.push(r.latency.p99);
      }
      const res = stopSampler();
      rows.push({
        adapter, engine, category: ADAPTERS[adapter].category, endpoint: ep.key,
        rps: Math.round(median(reqps)),
        p50: median(p50), p90: median(p90), p975: median(p975), p99: median(p99),
        cpu_pct: res.cpuPct, rss_mb: res.rssPeakMB,
        connections: CONNECTIONS, duration: DURATION, warmup: WARMUP, repeats: REPEATS,
        rps_samples: reqps.map((x) => Math.round(x)), // retained for CV + significance tests
        p99_samples: p99,
      });
      console.log(`  ${adapter}/${engine}/${ep.key}: ${Math.round(median(reqps))} req/s  p99=${median(p99)}ms  cpu=${res.cpuPct}%  rss=${res.rssPeakMB}MB`);
    }
  } finally {
    child.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 500));
  }
  return rows;
}

// INDEP mode (P3/P8): each replicate boots a FRESH server per cell and takes one
// measured run, so replicates are independent processes rather than repeats within
// one process; cell order is randomized per replicate. Writes results/raw-indep.json
// (separate from raw.json), with rps_samples holding the N independent replicate
// values for bootstrap CIs and CV.
async function mainIndep() {
  const REPLICATES = Number(env('REPLICATES', 5));
  const cells = [];
  for (const engine of wantEngines) for (const adapter of wantAdapters) {
    const meta = ADAPTERS[adapter];
    if (meta && meta.engines.includes(engine)) cells.push({ adapter, engine });
  }
  const acc = new Map();
  const K = (a, e, ep) => `${a}|${e}|${ep}`;
  let port = BASE_PORT;
  for (let rep = 0; rep < REPLICATES; rep++) {
    const order = cells.slice();
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    console.log(`\n===== replicate ${rep + 1}/${REPLICATES} (order ${order.map((c) => c.adapter).join(',')}) =====`);
    for (const { adapter, engine } of order) {
      console.log(`\n== rep ${rep + 1}: ${adapter} on ${engine} ==`);
      try {
        const rows = await benchCell(adapter, engine, port++, { repeats: 1 });
        for (const r of rows) {
          const k = K(r.adapter, r.engine, r.endpoint);
          if (!acc.has(k)) acc.set(k, { adapter: r.adapter, engine: r.engine, category: r.category, endpoint: r.endpoint, rps: [], p50: [], p90: [], p975: [], p99: [], cpu: [], rss: [] });
          const a = acc.get(k);
          a.rps.push(r.rps); a.p50.push(r.p50); a.p90.push(r.p90); a.p975.push(r.p975); a.p99.push(r.p99); a.cpu.push(r.cpu_pct); a.rss.push(r.rss_mb);
        }
      } catch (e) { console.error(`  FAILED ${adapter}/${engine}: ${e.message}`); }
    }
  }
  const rows = [...acc.values()].map((a) => ({
    adapter: a.adapter, engine: a.engine, category: a.category, endpoint: a.endpoint,
    rps: Math.round(median(a.rps)),
    p50: median(a.p50), p90: median(a.p90), p975: median(a.p975), p99: median(a.p99),
    cpu_pct: Math.round(median(a.cpu)), rss_mb: Math.round(median(a.rss)),
    connections: CONNECTIONS, duration: DURATION, warmup: WARMUP, repeats: a.rps.length, independent: true,
    rps_samples: a.rps.map((x) => Math.round(x)), p99_samples: a.p99,
  }));
  await writeFile(join(resultsDir, 'raw-indep.json'), JSON.stringify(rows, null, 2));
  console.log(`\nWrote ${rows.length} rows → results/raw-indep.json (${REPLICATES} independent replicates, randomized order, ${DURATION}s runs).`);
}

async function main() {
  if (process.env.INDEP === '1') return mainIndep();
  const all = [];
  let port = BASE_PORT;
  for (const engine of wantEngines) {
    for (const adapter of wantAdapters) {
      const meta = ADAPTERS[adapter];
      if (!meta) { console.warn(`unknown adapter ${adapter}, skipping`); continue; }
      if (!meta.engines.includes(engine)) continue; // e.g. pg is postgres-only
      console.log(`\n== ${adapter} on ${engine} ==`);
      try {
        const rows = await benchCell(adapter, engine, port++);
        all.push(...rows);
      } catch (e) {
        console.error(`  FAILED ${adapter}/${engine}: ${e.message}`);
      }
    }
  }

  // MERGE=1: update only the cells just measured, keeping all other existing rows
  // (so a targeted re-run of one adapter doesn't discard the rest of the matrix).
  let merged = all;
  if (process.env.MERGE === '1') {
    try {
      const prev = JSON.parse(readFileSync(join(resultsDir, 'raw.json'), 'utf8'));
      const key = (r) => `${r.adapter}|${r.engine}|${r.endpoint}`;
      const fresh = new Set(all.map(key));
      merged = prev.filter((r) => !fresh.has(key(r))).concat(all);
      console.log(`[merge] replaced ${all.length} rows, kept ${merged.length - all.length} existing`);
    } catch { console.warn('[merge] no existing raw.json; writing fresh'); }
  }

  await writeFile(join(resultsDir, 'raw.json'), JSON.stringify(merged, null, 2));
  // CSV omits the per-run sample arrays (scalar columns only).
  const flat = merged.map(({ rps_samples, p99_samples, ...r }) => r); // eslint-disable-line no-unused-vars
  await writeFile(join(resultsDir, 'summary.csv'), toCsv(flat));

  const tablesDir = join(resultsDir, 'tables');
  // One combined table per pattern: throughput and p99 side by side (fewer tables,
  // and the two metrics reported jointly — the paper's central point).
  const eps = [
    ['point_read', 'Point read'],
    ['range_scan', 'Keyset range scan'],
    ['deep_fetch', 'Deep/nested fetch'],
    ['aggregation', 'Aggregation'],
    ['write', 'Insert'],
  ];
  for (const [key, name] of eps) {
    await writeFile(join(tablesDir, `${key}.tex`), texTableCombined({
      rows: merged, endpoint: key, label: `tab:${key}`,
      caption: `${name}: throughput (req/s, higher is better) and tail latency (p99, ms, lower is better) by access layer and engine.`,
    }));
  }
  console.log(`\nWrote ${merged.length} rows → results/raw.json, summary.csv, ${eps.length} tables.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
