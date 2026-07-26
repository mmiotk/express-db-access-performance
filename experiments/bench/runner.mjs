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
import { attachDiagnosticCounter } from './diagnostics.mjs';

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
// Benchmark-insert floor: rows with id > RESET_FLOOR are deleted between write
// runs. Defaults to the seed size; campaigns with fan-out posts (ids 250001..)
// must set RESET_FLOOR=300000 so those rows survive the resets.
const RESET_FLOOR = Number(env('RESET_FLOOR', SEED_POSTS));
const PREFLIGHT = env('PREFLIGHT', RESET_FLOOR >= 300000 ? '1' : '0') === '1';
// Diagnostic output inside a measured run rejects the cell by default; set this to
// record it without rejecting (used when characterising a known-chatty driver).
const ALLOW_TIMED_DIAGNOSTICS = env('ALLOW_TIMED_DIAGNOSTICS', '0') === '1';

// Port allocator: never hand a server a port the databases (or anything else on the
// host) listen on — a replicate of the first overnight run was lost to a collision
// with MySQL's 3306 when the naive `port++` walked into it.
const RESERVED_PORTS = new Set([3306, 5432, 33060]);
let portCursor = BASE_PORT;
function nextPort() { do { portCursor++; } while (RESERVED_PORTS.has(portCursor)); return portCursor; }

// Shared request streams: target ids come from a PRNG seeded by (endpoint,
// replicate) ONLY, so every adapter in a replicate draws from the same identifier
// distribution — a task-equivalence control.
//
// NOT an identical served sequence. The generator is consumed one draw per request
// and is shared by the warm-up and the measured runs, so adapters of unequal
// throughput consume different numbers of draws before measurement begins and enter
// the measured window at different stream offsets. The intended common-random-numbers
// variance reduction is therefore largely forfeited; the paired analysis is licensed
// by the randomized-block design, not by sequence identity.
//
// results/traces-sample.json records the FIRST 50 ids each stream would yield, by
// re-instantiating streamFor() at write time. It documents the seeding, and is not a
// log of the ids actually served.
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function fnv1a(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; }
const streamFor = (epKey, rep) => { const g = mulberry32(fnv1a(`${epKey}:${rep}:v2`)); return (n) => 1 + Math.floor(g() * n); };

// Each endpoint: how autocannon should shape requests against the running server.
// `rep` selects the paired id stream shared by every adapter in that replicate.
function endpoints(base, rep = 0) {
  const s = Object.fromEntries(['point_read', 'range_scan', 'deep_fetch', 'aggregation', 'write'].map((k) => [k, streamFor(k, rep)]));
  return [
    { key: 'point_read', title: 'Point read', opts: { url: base, requests: [{ setupRequest: (r) => ({ ...r, method: 'GET', path: `/posts/${s.point_read(SEED_POSTS)}` }) }] } },
    { key: 'range_scan', title: 'Range scan', opts: { url: base, requests: [{ setupRequest: (r) => ({ ...r, method: 'GET', path: `/posts?limit=20&before=${20 + s.range_scan(SEED_POSTS)}` }) }] } },
    { key: 'deep_fetch', title: 'Deep fetch', opts: { url: base, requests: [{ setupRequest: (r) => ({ ...r, method: 'GET', path: `/posts/${s.deep_fetch(SEED_POSTS)}/thread` }) }] } },
    { key: 'aggregation', title: 'Aggregation', opts: { url: base, requests: [{ setupRequest: (r) => ({ ...r, method: 'GET', path: `/authors/${s.aggregation(SEED_AUTHORS)}/summary` }) }] } },
    { key: 'write', title: 'Insert', opts: { url: base, requests: [{ method: 'POST', path: '/posts', headers: { 'content-type': 'application/json' }, setupRequest: (r) => ({ ...r, body: JSON.stringify({ authorId: s.write(SEED_AUTHORS), title: 'bench', body: 'x' }) }) }] } },
  ];
}

function waitForHealth(base, child, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = async () => {
      if (child.exitCode !== null || child.signalCode !== null) {
        return reject(new Error(
          `server exited before health (code=${child.exitCode}, signal=${child.signalCode})`,
        ));
      }
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

async function waitForIdle(base, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const stats = await (await fetch(`${base}/stats`)).json();
      if (stats.active_handlers === 0) return;
    } catch { // server health handling reports a clearer failure elsewhere
    }
    if (Date.now() > deadline) throw new Error('server handler-drain timeout');
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
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
// Treatment-level accounting: a process TREE (parent + all descendants), so an
// engine or helper running as a child process could never escape the measurement.
// (For the pinned Prisma this tree is a single process — its Rust engine is an
// in-process Node-API library — but we account for the general case and record the
// child share separately as evidence.)
function descendants(pid) {
  const out = [];
  const walk = (p) => {
    let kids = [];
    try {
      kids = readFileSync(`/proc/${p}/task/${p}/children`, 'utf8').trim().split(/\s+/).filter(Boolean).map(Number);
    } catch { /* gone */ }
    for (const k of kids) { out.push(k); walk(k); }
  };
  walk(pid);
  return out;
}
function cpuTicksTree(pid) {
  const self = cpuTicks(pid);
  if (self == null) return { total: null, children: null };
  let kids = 0;
  for (const c of descendants(pid)) { const t = cpuTicks(c); if (t != null) kids += t; }
  return { total: self + kids, children: kids };
}
function pidsMatching(pattern) {
  try {
    return execFileSync('sh', ['-c', `pgrep -x '${pattern}' || pgrep -f '${pattern}' || true`], { encoding: 'utf8' })
      .trim().split('\n').filter(Boolean).map(Number);
  } catch { return []; }
}
function rssMB(pid) {
  try {
    const m = readFileSync(`/proc/${pid}/status`, 'utf8').match(/VmRSS:\s+(\d+)\s+kB/);
    return m ? Number(m[1]) / 1024 : null;
  } catch { return null; }
}
function startSampler(pid, engine) {
  const dbPids = pidsMatching(engine === 'postgres' ? 'postgres' : 'mysqld');
  const dbTicks = () => dbPids.reduce((s, p) => { const t = cpuTicks(p); return t == null ? s : s + t; }, 0);
  let last = cpuTicksTree(pid); let lastDb = dbTicks(); let lastGen = process.cpuUsage();
  let lastT = process.hrtime.bigint();
  const cpu = []; const cpuKids = []; const cpuDb = []; const cpuGen = [];
  let rssPeak = 0; let timer = null; let stopped = false;
  const tick = () => {
    if (stopped) return;
    const c = cpuTicksTree(pid); const d = dbTicks(); const g = process.cpuUsage();
    const t = process.hrtime.bigint();
    const dt = Number(t - lastT) / 1e9;
    if (c.total != null && last.total != null && dt > 0) {
      cpu.push(((c.total - last.total) / CLK_TCK) / dt * 100);
      cpuKids.push(((c.children - last.children) / CLK_TCK) / dt * 100);
      cpuDb.push(((d - lastDb) / CLK_TCK) / dt * 100);
      cpuGen.push(((g.user + g.system - lastGen.user - lastGen.system) / 1e6) / dt * 100);
    }
    last = c; lastDb = d; lastGen = g; lastT = t;
    const r = rssMB(pid); if (r && r > rssPeak) rssPeak = r;
    timer = setTimeout(tick, 200);
  };
  timer = setTimeout(tick, 200);
  return () => {
    stopped = true; if (timer) clearTimeout(timer);
    const m = (a) => (a.length ? Math.round(median(a)) : null);
    return { cpuPct: m(cpu), cpuChildrenPct: m(cpuKids), dbCpuPct: m(cpuDb), genCpuPct: m(cpuGen), rssPeakMB: rssPeak ? Math.round(rssPeak) : null };
  };
}

// Rebuild the physical database state before a measured write run: logical row
// deletion does not restore sequences, dead tuples, index pages, or purge state.
// PostgreSQL: drop + recreate from the bench_seed template (file-level copy, ~1-2s;
// resets sequences, statistics, and physical layout). MySQL: the write workload
// only touches `posts`, so delete benchmark rows, rebuild the table physically
// (OPTIMIZE), and pin AUTO_INCREMENT — an in-place approximation, disclosed as such.
async function rebuildDb(engine) {
  if (engine === 'postgres') {
    const c = new pg.Client({ ...cfg.postgres, database: 'postgres' }); await c.connect();
    await c.query('DROP DATABASE IF EXISTS bench WITH (FORCE)');
    await c.query('CREATE DATABASE bench TEMPLATE bench_seed');
    await c.end();
  } else {
    const c = await mysql.createConnection(cfg.mysql);
    await c.query('DELETE FROM posts WHERE id > ?', [RESET_FLOOR]);
    await c.query('OPTIMIZE TABLE posts');
    if (RESET_FLOOR > SEED_POSTS) {
      // Keep generated writes above the deletion floor. MySQL 9.7.1 can lower
      // the allocator to MAX(id)+1 after OPTIMIZE; an explicit sentinel at the
      // floor advances the actual allocator even when information_schema is stale.
      await c.query(
        'INSERT INTO posts(id, author_id, title, body, views) VALUES (?, 1, ?, ?, 0)',
        [RESET_FLOOR, '__runner_sequence_sentinel__', ''],
      );
      await c.query('DELETE FROM posts WHERE id = ?', [RESET_FLOOR]);
    } else {
      const [[{ ai }]] = await c.query('SELECT COALESCE(MAX(id),0)+1 AS ai FROM posts');
      await c.query('ALTER TABLE posts AUTO_INCREMENT = ' + Number(ai));
    }
    await c.end();
  }
}

// Prisma's client is generated per provider; regenerate before a prisma cell so
// the full matrix runs in one command.
function ensurePrismaClient(engine) {
  const schema = join(here, '..', 'prisma', `schema.${engine}.prisma`);
  execFileSync('npx', ['prisma', 'generate', `--schema=${schema}`], { stdio: 'ignore' });
}

// The write endpoint inserts rows; restore rows and the exact allocator so warm-up
// rate cannot change the measured ID sequence. Seeded/fan-out posts stay at or
// below RESET_FLOOR and benchmark inserts have no comments, so deletion is FK-safe.
async function resetWrites(engine) {
  if (engine === 'postgres') {
    const c = new pg.Client(cfg.postgres); await c.connect();
    await c.query('DELETE FROM posts WHERE id > $1', [RESET_FLOOR]);
    await c.query("SELECT setval(pg_get_serial_sequence('posts', 'id'), $1, true)", [RESET_FLOOR]);
    await c.end();
  } else {
    const c = await mysql.createConnection(cfg.mysql);
    await c.query('DELETE FROM posts WHERE id > ?', [RESET_FLOOR]);
    await c.query('ALTER TABLE posts AUTO_INCREMENT = ' + Number(RESET_FLOOR + 1));
    await c.end();
  }
}

async function benchCell(adapter, engine, port, { repeats = REPEATS, rep = 0, only = null } = {}) {
  if (adapter === 'prisma') ensurePrismaClient(engine);
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [join(here, '..', 'src', 'server.mjs')], {
    env: { ...process.env, TZ: 'UTC', ADAPTER: adapter, ENGINE: engine, PORT: String(port) },
    // Piped, not inherited, so diagnostic output in the timed path is counted rather
    // than merely scrolling past a human. A correct-but-wasteful adapter often
    // announces itself this way: the Knex MySQL `returning` defect emitted 44,907
    // warnings inside two pilot repetitions and was caught only because someone
    // happened to watch the console. Output is still forwarded, so nothing is hidden.
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const diagnostics = attachDiagnosticCounter(child);

  const wanted = only ?? wantEndpoints;
  const rows = [];
  try {
    await waitForHealth(base, child);
    for (const ep of endpoints(base, rep).filter((e) => wanted.includes(e.key))) {
      // The write endpoint grows the table, so reset before the warm-up and before
      // every measured run (not just once per cell), so each run starts from the
      // identical seeded table rather than one grown by the earlier runs.
      if (ep.key === 'write') await resetWrites(engine);
      // warm-up (JIT + pool fill + plan cache) — measurements discarded
      diagnostics.enter('warmup');
      if (WARMUP > 0) {
        await runAutocannon(ep.opts, { duration: WARMUP });
        await waitForIdle(base);
      }

      const reqps = [];
      const p50 = []; const p90 = []; const p99 = []; const p975 = [];
      let errors = 0, timeouts = 0, non2xx = 0;
      const stopSampler = startSampler(child.pid, engine); // treatment tree + db + generator CPU
      const diagBefore = diagnostics.measuredLines();
      diagnostics.enter('measured');
      let res;
      try {
        for (let i = 0; i < repeats; i++) {
          if (ep.key === "write") await resetWrites(engine);
          const r = await runAutocannon(ep.opts, { duration: DURATION });
          await waitForIdle(base);
          reqps.push(r.requests.average);
          p50.push(r.latency.p50); p90.push(r.latency.p90); p975.push(r.latency.p97_5 ?? r.latency.p975); p99.push(r.latency.p99);
          errors += r.errors ?? 0; timeouts += r.timeouts ?? 0; non2xx += r.non2xx ?? 0;
        }
      } finally {
        res = stopSampler();
        await diagnostics.settle();
        diagnostics.enter('between');
      }
      const diagInTimedPath = diagnostics.measuredLines() - diagBefore;
      if (diagInTimedPath > 0 && !ALLOW_TIMED_DIAGNOSTICS) {
        throw new Error(
          `${adapter}/${engine}/${ep.key}: rejected timed run ` +
          `(${diagInTimedPath} diagnostic line(s) written during measurement; ` +
          `a treatment doing per-request work it warns about is not admissible). ` +
          `First: ${diagnostics.samples()[0] ?? 'n/a'}. ` +
          `Set ALLOW_TIMED_DIAGNOSTICS=1 to record instead of reject.`,
        );
      }
      if (errors !== 0 || timeouts !== 0 || non2xx !== 0) {
        throw new Error(
          `${adapter}/${engine}/${ep.key}: rejected timed run ` +
          `(errors=${errors}, timeouts=${timeouts}, non2xx=${non2xx})`,
        );
      }
      let srvStats = {};
      try { srvStats = await (await fetch(`${base}/stats`)).json(); } catch { /* optional */ }
      rows.push({
        adapter, engine, category: ADAPTERS[adapter].category, endpoint: ep.key,
        rps: Math.round(median(reqps)),
        p50: median(p50), p90: median(p90), p975: median(p975), p99: median(p99),
        cpu_pct: res.cpuPct, cpu_children_pct: res.cpuChildrenPct, db_cpu_pct: res.dbCpuPct, gen_cpu_pct: res.genCpuPct,
        rss_mb: res.rssPeakMB,
        errors, timeouts, non2xx,
        // Diagnostic output per window: a zero here is positive evidence that the
        // treatment did no self-announcing work in the timed path (R7 sub-class).
        diagnostic_lines_timed: diagInTimedPath,
        diagnostic_lines_total: diagnostics.snapshot().lines,
        gc_count: srvStats.gc_count ?? null, gc_ms: srvStats.gc_ms ?? null,
        pool_used_avg: srvStats.pool_used_avg ?? null, pool_pending_avg: srvStats.pool_pending_avg ?? null, pool_pending_max: srvStats.pool_pending_max ?? null,
        connections: CONNECTIONS, duration: DURATION, warmup: WARMUP, repeats: REPEATS,
        rps_samples: reqps.map((x) => Math.round(x)), // retained for CV + significance tests
        p99_samples: p99,
        p975_samples: p975, // retained for tail-window sensitivity (p97.5 vs p99)
      });
      console.log(`  ${adapter}/${engine}/${ep.key}: ${Math.round(median(reqps))} req/s  p99=${median(p99)}ms  cpu=${res.cpuPct}% (kids ${res.cpuChildrenPct}%, db ${res.dbCpuPct}%)  err/to/n2=${errors}/${timeouts}/${non2xx}  rss=${res.rssPeakMB}MB`);
    }
  } finally {
    if (child.exitCode === null) child.kill('SIGTERM');
    await new Promise((resolve) => {
      if (child.exitCode !== null) return resolve();
      const timeout = setTimeout(resolve, 5000);
      child.once('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }
  return rows;
}

// INDEP mode (P3/P8): each replicate boots a fresh server for each adapter-engine read block; selected read endpoints run sequentially in that process. Writes use a separate fresh server after the declared state rebuild. No process crosses adapter, engine, or replicate boundaries; host and DB cache state remain shared. Cell-block order is randomized per replicate. Writes results/raw-indep.json
// (separate from raw.json), with rps_samples holding the N repeated run
// values for bootstrap CIs and CV.
async function mainIndep() {
  const REPLICATES = Number(env('REPLICATES', 5));
  const OUT = env('INDEP_OUT', 'raw-indep');
  const CAMPAIGN_ID = env('CAMPAIGN_ID', OUT);
  const ORDER_SEED = Number(env('ORDER_SEED', 20260723));
  // ORDER=shuffle (default) randomizes cell order per replicate; ORDER=forward and
  // ORDER=reverse fix it, so an order-reversal A/B run can demonstrate the absence
  // of history effects. REBUILD_WRITES=1 (default) measures the write endpoint in
  // its own server boot after a physical database-state rebuild.
  const ORDER = env('ORDER', 'shuffle');
  const REBUILD_WRITES = env('REBUILD_WRITES', '1') === '1';
  const READ_EPS = ['point_read', 'range_scan', 'deep_fetch', 'aggregation'].filter((e) => wantEndpoints.includes(e));
  const DO_WRITE = wantEndpoints.includes('write');
  const cells = [];
  if (PREFLIGHT) {
    for (const engine of wantEngines) {
      execFileSync(process.execPath, [join(here, 'verify-campaign-state.mjs')], {
        env: { ...process.env, ENGINE: engine },
        stdio: 'inherit',
      });
    }
  }
  for (const engine of wantEngines) for (const adapter of wantAdapters) {
    const meta = ADAPTERS[adapter];
    if (meta && meta.engines.includes(engine)) cells.push({ adapter, engine });
  }
  const acc = new Map();
  const startupEvents = [];
  const K = (a, e, ep) => `${a}|${e}|${ep}`;
  const push = (r) => {
    const k = K(r.adapter, r.engine, r.endpoint);
    if (!acc.has(k)) acc.set(k, { adapter: r.adapter, engine: r.engine, category: r.category, endpoint: r.endpoint, rps: [], p50: [], p90: [], p975: [], p99: [], cpu: [], cpuKids: [], cpuDb: [], cpuGen: [], rss: [], startupRetries: [], errors: 0, timeouts: 0, non2xx: 0 });
    const a = acc.get(k);
    a.rps.push(r.rps); a.p50.push(r.p50); a.p90.push(r.p90); a.p975.push(r.p975); a.p99.push(r.p99);
    a.cpu.push(r.cpu_pct); a.cpuKids.push(r.cpu_children_pct); a.cpuDb.push(r.db_cpu_pct); a.cpuGen.push(r.gen_cpu_pct); a.rss.push(r.rss_mb);
    (a.gc ??= []).push(r.gc_count); (a.gcMs ??= []).push(r.gc_ms);
    (a.poolUsed ??= []).push(r.pool_used_avg); (a.poolPend ??= []).push(r.pool_pending_avg); (a.poolPendMax ??= []).push(r.pool_pending_max);
    a.startupRetries.push(r.startup_retries ?? 0);
    a.errors += r.errors; a.timeouts += r.timeouts; a.non2xx += r.non2xx;
  };
  const benchWithStartupRetry = async (adapter, engine, options) => {
    const maxAttempts = 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const rows = await benchCell(adapter, engine, nextPort(), options);
        return rows.map((row) => ({ ...row, startup_retries: attempt - 1 }));
      } catch (error) {
        const startupFailure = /server (health timeout|exited before health)/.test(error.message);
        startupEvents.push({
          adapter,
          engine,
          replicate: options.rep + 1,
          endpoints: options.only,
          attempt,
          startupFailure,
          message: error.message,
        });
        if (!startupFailure || attempt === maxAttempts) throw error;
        console.error(
          `  REJECTED START ${adapter}/${engine} attempt ${attempt}/${maxAttempts}: ` +
          `${error.message}; retrying before warm-up`,
        );
      }
    }
    throw new Error("unreachable startup-retry state");
  };
  for (let rep = 0; rep < REPLICATES; rep++) {
    const order = cells.slice();
    if (ORDER === 'shuffle') {
      const orderRand = mulberry32(fnv1a([CAMPAIGN_ID, ORDER_SEED, rep, 'order'].join(':')));
      for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(orderRand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    } else if (ORDER === 'reverse') order.reverse();
    console.log(`\n===== replicate ${rep + 1}/${REPLICATES} (order=${ORDER}: ${order.map((c) => c.adapter).join(',')}) =====`);
    for (const { adapter, engine } of order) {
      console.log(`\n== rep ${rep + 1}: ${adapter} on ${engine} ==`);
      try {
        if (READ_EPS.length) {
          (await benchWithStartupRetry(adapter, engine, { repeats: 1, rep, only: READ_EPS }))
            .forEach(push);
        }
        if (DO_WRITE) {
          if (REBUILD_WRITES) await rebuildDb(engine); // fresh physical state, then a dedicated boot
          (await benchWithStartupRetry(adapter, engine, { repeats: 1, rep, only: ["write"] }))
            .forEach(push);
          await resetWrites(engine); // leave the next cell and campaign end at the declared seed state
        }
      } catch (e) {
        console.error(`  FAILED ${adapter}/${engine}: ${e.message}`);
        await writeFile(
          join(resultsDir, `${OUT}.startup-events.json`),
          JSON.stringify(startupEvents, null, 2),
        );
        await writeFile(
          join(resultsDir, `${OUT}.partial.json`),
          JSON.stringify([...acc.values()], null, 2),
        );
        throw new Error(
          `campaign rejected at replicate ${rep + 1}, ${adapter}/${engine}: ${e.message}`,
        );
      }
    }
    const expectedEndpoints = [...READ_EPS, ...(DO_WRITE ? ["write"] : [])];
    const expectedCellCount = cells.length * expectedEndpoints.length;
    const replicateProblems = [];
    if (acc.size !== expectedCellCount) {
      replicateProblems.push(`roster has ${acc.size} keys, expected ${expectedCellCount}`);
    }
    for (const { adapter, engine } of cells) {
      for (const endpoint of expectedEndpoints) {
        const key = K(adapter, engine, endpoint);
        const row = acc.get(key);
        if (!row) {
          replicateProblems.push(`${key}: missing after replicate ${rep + 1}`);
        } else if (row.rps.length !== rep + 1 || row.p99.length !== rep + 1) {
          replicateProblems.push(
            `${key}: samples=${row.rps.length}/${row.p99.length}, expected ${rep + 1}`,
          );
        }
      }
    }
    if (replicateProblems.length) {
      throw new Error(
        `replicate completeness gate failed:\n${replicateProblems.join("\n")}`,
      );
    }
    // checkpoint: persist accumulated samples after every replicate so a crash in a
    // long overnight run loses at most the replicate in progress
    await writeFile(join(resultsDir, `${OUT}.partial.json`),
      JSON.stringify([...acc.values()], null, 2));
    console.log(`[checkpoint] replicate ${rep + 1}/${REPLICATES} saved (${acc.size} cells)`);
  }
  const expectedKeys = [];
  for (const { adapter, engine } of cells) {
    for (const endpoint of [...READ_EPS, ...(DO_WRITE ? ["write"] : [])]) {
      expectedKeys.push(K(adapter, engine, endpoint));
    }
  }
  const completenessProblems = [];
  for (const key of expectedKeys) {
    const row = acc.get(key);
    if (!row) {
      completenessProblems.push(`${key}: missing`);
      continue;
    }
    for (const [metric, values] of Object.entries({
      rps: row.rps,
      p50: row.p50,
      p90: row.p90,
      p975: row.p975,
      p99: row.p99,
    })) {
      if (values.length !== REPLICATES) {
        completenessProblems.push(
          `${key}: ${metric} has ${values.length}, expected ${REPLICATES}`,
        );
      }
    }
    if (row.errors !== 0 || row.timeouts !== 0 || row.non2xx !== 0) {
      completenessProblems.push(
        `${key}: errors/timeouts/non2xx=${row.errors}/${row.timeouts}/${row.non2xx}`,
      );
    }
  }
  if (acc.size !== expectedKeys.length) {
    completenessProblems.push(
      `roster has ${acc.size} keys, expected exactly ${expectedKeys.length}`,
    );
  }
  await writeFile(
    join(resultsDir, `${OUT}.startup-events.json`),
    JSON.stringify(startupEvents, null, 2),
  );
  if (completenessProblems.length) {
    throw new Error(
      `campaign completeness gate failed:\n${completenessProblems.join("\n")}`,
    );
  }
  const m0 = (xs) => { const v = xs.filter((x) => x != null); return v.length ? Math.round(median(v)) : null; };
  const rows = [...acc.values()].map((a) => ({
    adapter: a.adapter, engine: a.engine, category: a.category, endpoint: a.endpoint,
    rps: Math.round(median(a.rps)),
    p50: median(a.p50), p90: median(a.p90), p975: median(a.p975), p99: median(a.p99),
    cpu_pct: m0(a.cpu), cpu_children_pct: m0(a.cpuKids), db_cpu_pct: m0(a.cpuDb), gen_cpu_pct: m0(a.cpuGen),
    rss_mb: m0(a.rss),
    gc_count: m0(a.gc ?? []), gc_ms: m0(a.gcMs ?? []),
    pool_used_avg: m0(a.poolUsed ?? []), pool_pending_avg: m0(a.poolPend ?? []), pool_pending_max: m0(a.poolPendMax ?? []),
    errors: a.errors, timeouts: a.timeouts, non2xx: a.non2xx,
    connections: CONNECTIONS, duration: DURATION, warmup: WARMUP, repeats: a.rps.length, independent: true,
    campaign_id: CAMPAIGN_ID, order_mode: ORDER, order_seed: ORDER_SEED,
    // paired_streams asserts only that target ids were seeded per (endpoint, replicate)
    // and shared across adapters — NOT that adapters saw an identical served sequence
    // (see the streamFor note above). The key name is retained because three table
    // generators gate on it against already-archived campaign files.
    rebuild_writes: REBUILD_WRITES, preflight: PREFLIGHT, paired_streams: true,
    startup_retries: Math.max(0, ...a.startupRetries),
    rps_samples: a.rps.map((x) => Math.round(x)), p99_samples: a.p99, p975_samples: a.p975,
  }));
  // artifact evidence of the paired id streams: first 50 ids per endpoint per replicate
  const sample = {};
  for (const ep of ['point_read', 'range_scan', 'deep_fetch', 'aggregation', 'write']) {
    sample[ep] = {};
    for (let rep = 0; rep < Math.min(REPLICATES, 3); rep++) {
      const s = streamFor(ep, rep); sample[ep][`rep${rep}`] = Array.from({ length: 50 }, () => s(ep === 'aggregation' || ep === 'write' ? SEED_AUTHORS : SEED_POSTS));
    }
  }
  const tracesOut = OUT === 'raw-indep' ? 'traces-sample.json' : OUT + '-traces-sample.json';
  await writeFile(join(resultsDir, tracesOut), JSON.stringify(sample, null, 2));
  await writeFile(join(resultsDir, `${OUT}.json`), JSON.stringify(rows, null, 2));
  console.log(`\nWrote ${rows.length} rows → results/${OUT}.json (${REPLICATES} repeated runs, order=${ORDER}, paired streams, write-rebuild=${REBUILD_WRITES}, ${DURATION}s runs).`);
}

async function main() {
  if (process.env.INDEP === '1') return mainIndep();
  const all = [];
  for (const engine of wantEngines) {
    for (const adapter of wantAdapters) {
      const meta = ADAPTERS[adapter];
      if (!meta) { console.warn(`unknown adapter ${adapter}, skipping`); continue; }
      if (!meta.engines.includes(engine)) continue; // e.g. pg is postgres-only
      console.log(`\n== ${adapter} on ${engine} ==`);
      try {
        const rows = await benchCell(adapter, engine, nextPort());
        all.push(...rows);
      } catch (e) {
        console.error(`  FAILED ${adapter}/${engine}: ${e.message}`);
        throw new Error(`benchmark rejected at ${adapter}/${engine}: ${e.message}`);
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
    ['deep_fetch', 'deep fetch'],
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
