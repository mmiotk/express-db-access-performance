// P4 — open-loop (constant-arrival-rate) validation of the tail-latency findings.
// The main results use a closed-loop (constant-concurrency) generator; here we drive
// the deep fetch on PostgreSQL at a FIXED aggregate request rate
// (autocannon's overallRate) across many connections, so arrival is governed by the
// clock rather than by response times. For each layer and offered rate we record the
// achieved rate (a shortfall marks saturation) and p50/p99. This is a constant-arrival
// generator, not a formally coordinated-omission-corrected one (e.g. wrk2); a
// CO-corrected tool would report equal or higher tails, so these open-loop tails are
// conservative. Writes results/openloop.json + paper table openloop.tex.
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import autocannon from 'autocannon';
import { config as cfg } from '../src/config.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const SEED_POSTS = cfg.seed.posts;
const rnd = (n) => 1 + Math.floor(Math.random() * n);
const LAYERS = ['pg', 'prisma', 'knex', 'sequelize', 'mikroorm']; // top / top-high-CPU / middle / data-mapper / slowest
const RATES = [250, 500, 1000, 2000, 4000];                        // offered aggregate req/s
const CONNECTIONS = 256, DURATION = 15, WARMUP = 3;

function waitForHealth(base, tries = 100) {
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try { const r = await fetch(`${base}/health`); if (r.ok) return resolve(); } catch { /* not up yet */ }
      if (--tries <= 0) return reject(new Error('server health timeout'));
      setTimeout(tick, 100);
    };
    tick();
  });
}
function run(base, overallRate, duration) {
  return new Promise((resolve, reject) => {
    autocannon({
      url: base, connections: CONNECTIONS, overallRate, duration,
      requests: [{ setupRequest: (r) => ({ ...r, method: 'GET', path: `/posts/${rnd(SEED_POSTS)}/thread` }) }],
    }, (err, res) => err ? reject(err) : resolve(res));
  });
}

const out = [];
let port = 3300;
for (const adapter of LAYERS) {
  const p = port++;
  const base = `http://127.0.0.1:${p}`;
  const child = spawn(process.execPath, [join(here, '..', 'src', 'server.mjs')], {
    env: { ...process.env, ADAPTER: adapter, ENGINE: 'postgres', PORT: String(p) },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  try {
    await waitForHealth(base);
    for (const rate of RATES) {
      await run(base, rate, WARMUP);                    // warm-up
      const r = await run(base, rate, DURATION);        // measured
      const achieved = Math.round(r.requests.average);
      const row = { adapter, offered: rate, achieved, p50: r.latency.p50, p99: r.latency.p99, saturated: achieved < rate * 0.95 };
      out.push(row);
      console.log(`  ${adapter} @${rate}: achieved ${achieved}  p50=${r.latency.p50}ms  p99=${r.latency.p99}ms${row.saturated ? '  [SATURATED]' : ''}`);
    }
  } catch (e) { console.error(`  FAILED ${adapter}: ${e.message}`); }
  finally { child.kill('SIGTERM'); await new Promise((r) => setTimeout(r, 500)); }
}

await writeFile(join(here, '..', 'results', 'openloop.json'), JSON.stringify(out, null, 2));

// This script no longer writes paper/tables/openloop.tex. That table is owned by
// scripts/openloop2.mjs, which measures the SAME quantity (constant-arrival tail on
// the deep fetch) but applies the coordinated-omission correction: latency is taken
// from each request's INTENDED start time, timeouts are clipped into the
// distribution, and both engines are covered. This script's generator is not
// CO-corrected (see the header), so its tails are systematically lower. Both wrote
// the same path and label, so whichever ran last won -- and the supplement's caption
// for tab:openloop explicitly describes the corrected measurement, which would have
// made an uncorrected table contradict its own prose.
// results/openloop.json is still written, for provenance and comparison.
console.log('\nwrote results/openloop.json (no table; openloop.tex is owned by openloop2.mjs)');
