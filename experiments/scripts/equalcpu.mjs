// Equal-resource comparison (revision E3.6 / review 6.4-6.5): pin the SERVER to
// 1, 2, and 4 cores (taskset) with database and generator on disjoint cores, and
// re-measure the deep fetch for representative layers. Answers "which layer is
// faster at EQUAL CPU" as opposed to unconstrained throughput. Writes
// results/equalcpu.json.
import { spawn, execSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import autocannon from 'autocannon';
import { config as cfg } from '../src/config.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const SEED_POSTS = cfg.seed.posts;
const LAYERS = (process.env.EC_LAYERS ?? 'pg,prisma,mikroorm').split(',');
const MASKS = [['1core', '4'], ['2core', '4-5'], ['4core', '4-7']];
const DB_CORES = '0-3', GEN_CORES = '8-11';
const REPS = Number(process.env.EC_REPS ?? 3), DURATION = 12, WARMUP = 2, CONNECTIONS = 50;
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function health(base, tries = 100) { return new Promise((res, rej) => { const t = async () => { try { const r = await fetch(`${base}/health`); if (r.ok) return res(); } catch {} if (--tries <= 0) return rej(new Error('health timeout')); setTimeout(t, 100); }; t(); }); }
function run(base, dur, rnd) { return new Promise((res, rej) => autocannon({ url: base, connections: CONNECTIONS, duration: dur, requests: [{ setupRequest: (r) => ({ ...r, method: 'GET', path: `/posts/${1 + Math.floor(rnd() * SEED_POSTS)}/thread` }) }] }, (e, r) => e ? rej(e) : res(r))); }

// pin databases + generator once
try { execSync(`taskset -pc ${GEN_CORES} ${process.pid}`, { stdio: 'ignore' }); } catch {}
for (const pat of ['postgres', 'mysqld']) {
  try { execSync(`for p in $(pgrep -x ${pat}); do taskset -pc ${DB_CORES} $p >/dev/null 2>&1 || true; done`, { shell: '/bin/bash', stdio: 'ignore' }); } catch {}
}
console.log(`pinned: DB->${DB_CORES}, generator->${GEN_CORES}`);

const out = [];
let port = 4300;
for (const adapter of LAYERS) {
  if (adapter === 'prisma') execSync('npx prisma generate --schema=prisma/schema.postgres.prisma', { stdio: 'ignore' });
  for (const [label, mask] of MASKS) {
    const p = ++port; const base = `http://127.0.0.1:${p}`;
    const child = spawn('taskset', ['-c', mask, process.execPath, join(here, '..', 'src', 'server.mjs')], {
      env: { ...process.env, TZ: 'UTC', ADAPTER: adapter, ENGINE: 'postgres', PORT: String(p) }, stdio: ['ignore', 'ignore', 'inherit'],
    });
    try {
      await health(base);
      const rnd = mulberry32(0xec + port);
      await run(base, WARMUP, rnd);
      const samples = [];
      for (let k = 0; k < REPS; k++) samples.push(Math.round((await run(base, DURATION, rnd)).requests.average));
      out.push({ adapter, cores: label, mask, rps: median(samples), rps_samples: samples });
      console.log(`  ${adapter} @${label}: ${median(samples)} req/s`);
    } catch (e) { console.error(`  FAILED ${adapter}@${label}: ${e.message}`); }
    finally { child.kill('SIGTERM'); await new Promise((r) => setTimeout(r, 400)); }
  }
}
await writeFile(join(here, '..', 'results', 'equalcpu.json'), JSON.stringify(out, null, 2));
console.log('wrote results/equalcpu.json');
