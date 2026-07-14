// Single-host resource-isolation check (revision round 2, review 6.5). The primary
// campaign runs the application server, the databases, and the load generator as
// separate processes on one shared host without CPU pinning. This re-runs
// representative deep-fetch cells with the three components pinned to DISJOINT core
// sets (database 0-3, application 4-13, generator 14-15) so that scheduler and
// shared-cache contention between them is removed, and compares to the shared-host
// primary. If the relative results reproduce, same-host contention is not driving
// the ranking. Writes results/isolation.json.
import { spawn, execSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import autocannon from 'autocannon';
import { config as cfg } from '../src/config.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const SEED_POSTS = cfg.seed.posts;
const LAYERS = (process.env.ISO_LAYERS ?? 'pg,prisma,mikroorm').split(',');
const DB_CORES = '0-3', APP_CORES = '4-13', GEN_CORES = '14-15';
const REPS = Number(process.env.ISO_REPS ?? 5), DURATION = 12, WARMUP = 5, CONNECTIONS = 50;
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function health(base, tries = 100) { return new Promise((res, rej) => { const t = async () => { try { const r = await fetch(`${base}/health`); if (r.ok) return res(); } catch {} if (--tries <= 0) return rej(new Error('health timeout')); setTimeout(t, 100); }; t(); }); }
function run(base, dur, rnd) { return new Promise((res, rej) => autocannon({ url: base, connections: CONNECTIONS, duration: dur, requests: [{ setupRequest: (r) => ({ ...r, method: 'GET', path: `/posts/${1 + Math.floor(rnd() * SEED_POSTS)}/thread` }) }] }, (e, r) => e ? rej(e) : res(r))); }

// pin the generator (this process) and the databases to disjoint core sets
try { execSync(`taskset -pc ${GEN_CORES} ${process.pid}`, { stdio: 'ignore' }); } catch {}
for (const pat of ['postgres', 'mysqld']) {
  try { execSync(`for p in $(pgrep -x ${pat}); do taskset -pc ${DB_CORES} $p >/dev/null 2>&1 || true; done`, { shell: '/bin/bash', stdio: 'ignore' }); } catch {}
}
console.log(`pinned: DB->${DB_CORES}, application->${APP_CORES}, generator->${GEN_CORES}`);

// primary (shared-host) medians for comparison
const raw = JSON.parse(await readFile(join(here, '..', 'results', 'raw.json'), 'utf8'));
const primaryRps = (a) => { const r = raw.find((x) => x.adapter === a && x.engine === 'postgres' && x.endpoint === 'deep_fetch'); return r ? median(r.rps_samples) : null; };

const out = [];
let port = 4600;
for (const adapter of LAYERS) {
  if (adapter === 'prisma') execSync('npx prisma generate --schema=prisma/schema.postgres.prisma', { stdio: 'ignore' });
  const p = ++port; const base = `http://127.0.0.1:${p}`;
  const child = spawn('taskset', ['-c', APP_CORES, process.execPath, join(here, '..', 'src', 'server.mjs')], {
    env: { ...process.env, TZ: 'UTC', ADAPTER: adapter, ENGINE: 'postgres', PORT: String(p) }, stdio: ['ignore', 'ignore', 'inherit'],
  });
  try {
    await health(base);
    const rnd = mulberry32(0x1a0 + port);
    await run(base, WARMUP, rnd);
    const samples = [];
    for (let k = 0; k < REPS; k++) samples.push(Math.round((await run(base, DURATION, rnd)).requests.average));
    const iso = median(samples), prim = primaryRps(adapter);
    out.push({ adapter, isolated_rps: iso, primary_rps: prim, ratio: prim ? +(iso / prim).toFixed(3) : null, rps_samples: samples });
    console.log(`  ${adapter}: isolated ${iso} vs primary ${prim} (ratio ${prim ? (iso / prim).toFixed(3) : 'n/a'})`);
  } catch (e) { console.error(`  FAILED ${adapter}: ${e.message}`); }
  finally { child.kill('SIGTERM'); await new Promise((r) => setTimeout(r, 400)); }
}
await writeFile(join(here, '..', 'results', 'isolation.json'), JSON.stringify({ db_cores: DB_CORES, app_cores: APP_CORES, gen_cores: GEN_CORES, cells: out }, null, 2));
console.log('wrote results/isolation.json');
