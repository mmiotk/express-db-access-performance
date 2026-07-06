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

import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import autocannon from 'autocannon';
import { ADAPTERS, config as cfg } from '../src/config.mjs';
import { median, toCsv, texTable } from './stats.mjs';

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

const SEED_POSTS = cfg.seed.posts;
const SEED_AUTHORS = cfg.seed.authors;
const rnd = (n) => 1 + Math.floor(Math.random() * n);

// Each endpoint: how autocannon should shape requests against the running server.
function endpoints(base) {
  return [
    { key: 'point_read', title: 'Point read', opts: { url: base, requests: [{ setupRequest: (r) => ({ ...r, method: 'GET', path: `/posts/${rnd(SEED_POSTS)}` }) }] } },
    { key: 'range_scan', title: 'Range scan', opts: { url: base, requests: [{ setupRequest: (r) => ({ ...r, method: 'GET', path: `/posts?limit=20&offset=${rnd(SEED_POSTS - 20)}` }) }] } },
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

async function benchCell(adapter, engine, port) {
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [join(here, '..', 'src', 'server.mjs')], {
    env: { ...process.env, ADAPTER: adapter, ENGINE: engine, PORT: String(port) },
    stdio: ['ignore', 'inherit', 'inherit'],
  });

  const rows = [];
  try {
    await waitForHealth(base);
    for (const ep of endpoints(base)) {
      // warm-up (JIT + pool fill + plan cache) — measurements discarded
      if (WARMUP > 0) await runAutocannon(ep.opts, { duration: WARMUP });

      const reqps = [];
      const p50 = []; const p90 = []; const p99 = []; const p975 = [];
      for (let i = 0; i < REPEATS; i++) {
        const r = await runAutocannon(ep.opts, { duration: DURATION });
        reqps.push(r.requests.average);
        p50.push(r.latency.p50); p90.push(r.latency.p90); p975.push(r.latency.p97_5 ?? r.latency.p975); p99.push(r.latency.p99);
      }
      rows.push({
        adapter, engine, category: ADAPTERS[adapter].category, endpoint: ep.key,
        rps: Math.round(median(reqps)),
        p50: median(p50), p90: median(p90), p975: median(p975), p99: median(p99),
        connections: CONNECTIONS, duration: DURATION, repeats: REPEATS,
      });
      console.log(`  ${adapter}/${engine}/${ep.key}: ${Math.round(median(reqps))} req/s  p99=${median(p99)}ms`);
    }
  } finally {
    child.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 500));
  }
  return rows;
}

async function main() {
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

  await writeFile(join(resultsDir, 'raw.json'), JSON.stringify(all, null, 2));
  await writeFile(join(resultsDir, 'summary.csv'), toCsv(all));

  const tablesDir = join(resultsDir, 'tables');
  const eps = [
    ['point_read', 'Point-read throughput by access layer'],
    ['range_scan', 'Range-scan throughput by access layer'],
    ['deep_fetch', 'Deep-fetch (nested) throughput by access layer'],
    ['aggregation', 'Aggregation throughput by access layer'],
    ['write', 'Insert throughput by access layer'],
  ];
  for (const [key, caption] of eps) {
    await writeFile(join(tablesDir, `${key}_rps.tex`),
      texTable({ rows: all, endpoint: key, metric: 'rps', caption, label: `tab:${key}_rps`, unit: 'req/s, higher is better' }));
    await writeFile(join(tablesDir, `${key}_p99.tex`),
      texTable({ rows: all, endpoint: key, metric: 'p99', caption: caption.replace('throughput', 'tail latency (p99)'), label: `tab:${key}_p99`, unit: 'ms, lower is better' }));
  }
  console.log(`\nWrote ${all.length} rows → results/raw.json, summary.csv, ${eps.length * 2} tables.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
