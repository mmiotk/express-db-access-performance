// Coordinated-omission-CORRECTED open-loop tail measurement (revision E7 / review
// 6.16). A constant-rate schedule assigns request k the intended start time
// t0 + k/rate; a bounded connection pool issues requests FIFO, and every latency is
// measured from the INTENDED start time, not the actual send time — wrk2's
// correction, implemented natively (no external binaries). Requests that cannot
// finish within TIMEOUT_MS are recorded as timeouts and included in the percentile
// distribution at their clipped value, so saturation cannot hide in the tail.
// Reports offered vs achieved rate, completion/timeout/error counts, queue depth,
// and corrected p50/p90/p99 per (layer, rate). Writes results/openloop2.json +
// paper table openloop.tex (same label; replaces the uncorrected run).
import { spawn, execSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'undici';
import { config as cfg } from '../src/config.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const SEED_POSTS = cfg.seed.posts;
const env = (k, d) => process.env[k] ?? d;
// OL_ENGINE selects the database engine (review 6.2: the open-loop intrinsic-tail
// companion is now run on BOTH engines, not PostgreSQL only). The native driver
// differs by engine, so the default layer set adapts.
const OL_ENGINE = env('OL_ENGINE', 'postgres');
const NATIVE = OL_ENGINE === 'mysql' ? 'mysql2' : 'pg';
const LAYERS = env('OL_LAYERS', `${NATIVE},prisma,knex,sequelize,mikroorm`).split(',');
const RATES = env('OL_RATES', '250,500,1000,2000,4000').split(',').map(Number);
const DURATION_MS = Number(env('OL_DURATION_MS', 15000));
const WARMUP_MS = 3000, TIMEOUT_MS = 10000, CONNECTIONS = 256;

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function health(base, tries = 100) { return new Promise((res, rej) => { const t = async () => { try { const r = await fetch(`${base}/health`); if (r.ok) return res(); } catch {} if (--tries <= 0) return rej(new Error('health timeout')); setTimeout(t, 100); }; t(); }); }

// One open-loop pass at a fixed offered rate. Returns corrected stats.
async function pass(base, rate, durationMs, seed) {
  const pool = new Pool(base, { connections: CONNECTIONS, pipelining: 1 });
  const rnd = mulberry32(seed);
  const total = Math.floor((durationMs / 1000) * rate);
  const interval = 1000 / rate;
  const lat = new Float64Array(total);           // corrected latency per request (ms)
  let completed = 0, timeouts = 0, errors = 0, issued = 0, maxQueue = 0;
  const t0 = performance.now();

  let inflight = 0; const results = [];
  const fire = async (k, scheduledAt) => {
    inflight++;
    const path = `/posts/${1 + Math.floor(rnd() * SEED_POSTS)}/thread`;
    try {
      const ac = new AbortController();
      const deadline = setTimeout(() => ac.abort(), Math.max(1, scheduledAt + TIMEOUT_MS - performance.now()));
      const res = await pool.request({ path, method: 'GET', signal: ac.signal });
      await res.body.text();
      clearTimeout(deadline);
      const l = performance.now() - scheduledAt;      // CO-corrected: from INTENDED time
      if (res.statusCode === 200) { lat[k] = l; completed++; } else { lat[k] = l; errors++; }
    } catch {
      lat[k] = performance.now() - scheduledAt;       // timeout/abort at clipped value
      timeouts++;
    } finally { inflight--; }
  };

  // scheduler: issue request k as close to its intended time as the event loop
  // allows; the queue backlog (scheduled but unsent) is the open-loop pressure.
  for (let k = 0; k < total; k++) {
    const scheduledAt = t0 + k * interval;
    const wait = scheduledAt - performance.now();
    if (wait > 1) await new Promise((r) => setTimeout(r, wait));
    const backlog = Math.round((performance.now() - scheduledAt) / interval);
    if (backlog > maxQueue) maxQueue = backlog;
    issued++;
    results.push(fire(k, scheduledAt));
  }
  await Promise.allSettled(results);
  await pool.close();

  const sorted = Array.from(lat.slice(0, total)).sort((a, b) => a - b);
  const q = (p) => sorted[Math.min(total - 1, Math.floor(p * total))];
  const elapsedS = (performance.now() - t0) / 1000;
  return {
    offered: rate, issued, completed, timeouts, errors,
    achieved: Math.round(completed / elapsedS),
    saturated: completed / elapsedS < rate * 0.95 || timeouts > 0,
    maxBacklog: maxQueue,
    p50: +q(0.50).toFixed(1), p90: +q(0.90).toFixed(1), p99: +q(0.99).toFixed(1),
  };
}

const out = [];
for (const adapter of LAYERS) {
  const port = 4000 + LAYERS.indexOf(adapter);
  const base = `http://127.0.0.1:${port}`;
  if (adapter === 'prisma') execSync(`npx prisma generate --schema=prisma/schema.${OL_ENGINE}.prisma`, { stdio: 'ignore' });
  const child = spawn(process.execPath, [join(here, '..', 'src', 'server.mjs')], {
    env: { ...process.env, TZ: 'UTC', ADAPTER: adapter, ENGINE: OL_ENGINE, PORT: String(port) },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  try {
    await health(base);
    for (const rate of RATES) {
      await pass(base, Math.min(rate, 1000), WARMUP_MS, 1);         // warm-up (capped rate)
      const r = await pass(base, rate, DURATION_MS, 42 + rate);
      out.push({ adapter, ...r });
      console.log(`  ${adapter} @${rate}/s: achieved ${r.achieved} (to=${r.timeouts} err=${r.errors})  p50=${r.p50} p99=${r.p99}${r.saturated ? '  [SATURATED]' : ''}`);
    }
  } catch (e) { console.error(`  FAILED ${adapter}: ${e.message}`); }
  finally { child.kill('SIGTERM'); await new Promise((r) => setTimeout(r, 400)); }
}
const tagged = out.map((r) => ({ engine: OL_ENGINE, ...r }));
await writeFile(join(here, '..', 'results', `openloop2.${OL_ENGINE}.json`), JSON.stringify(tagged, null, 2));

const cell = (a, rate) => { const r = out.find((x) => x.adapter === a && x.offered === rate); return r ? `${Math.round(r.p99)}${r.saturated ? '$^\\dagger$' : ''}` : '--'; };
const engLabel = OL_ENGINE === 'mysql' ? 'MySQL' : 'PostgreSQL';
const rows = LAYERS.map((a) => `    \\texttt{${a}} & ${RATES.map((rate) => cell(a, rate)).join(' & ')} \\\\`).join('\n');
const tex = `% auto-generated by scripts/openloop2.mjs — coordinated-omission-corrected open-loop p99
\\begin{table}[htbp]
  \\centering
  \\caption{Open-loop tail latency, corrected for coordinated omission: p99 (ms) on
    the deep/nested fetch (${engLabel}) under a constant offered request rate, with
    every latency measured from the request's intended start time and timed-out
    requests included at their clipped value. $^\\dagger$marks cells that did not
    sustain the offered rate (achieved${'<'}95\\% or any timeouts).}
  \\label{tab:openloop}
  \\begin{tabular}{l ${RATES.map(() => 'r').join(' ')}}
    \\toprule
    Layer & ${RATES.map((r) => r + '/s').join(' & ')} \\\\
    \\midrule
${rows}
    \\bottomrule
  \\end{tabular}
\\end{table}
`;
// PostgreSQL run keeps the legacy output names so Supplement Table S6 is unchanged.
if (OL_ENGINE === 'postgres') {
  await writeFile(join(here, '..', 'results', 'openloop2.json'), JSON.stringify(out, null, 2));
  await writeFile(join(here, '..', 'results', 'tables', 'openloop.tex'), tex);
  await writeFile(join(here, '..', '..', 'paper', 'tables', 'openloop.tex'), tex);
}
console.log(`\nwrote results/openloop2.${OL_ENGINE}.json${OL_ENGINE === 'postgres' ? ' + paper/tables/openloop.tex' : ''} (CO-corrected, ${engLabel})`);
