// Long-run drift check (adversarial-review surface 6). The primary protocol uses
// 12-second measured runs; Node back-ends are known to drift over sustained load
// (Kuffel & Walter). Here we hold three representative layers under ~10 minutes of
// continuous deep-fetch load each (PostgreSQL): one server boot, 2s warm-up, then
// ten consecutive 60-second runs. Drift = median(last 3 minutes) vs median(first 3);
// we also check the between-layer ordering is preserved minute by minute. Reported
// inline in Threats (no table). Writes results/longrun.json.
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import autocannon from 'autocannon';
import { config as cfg } from '../src/config.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const SEED_POSTS = cfg.seed.posts;
const rnd = (n) => 1 + Math.floor(Math.random() * n);
const LAYERS = ['pg', 'prisma', 'mikroorm'];
const MINUTES = 10, CONNECTIONS = 50, WARMUP = 2;
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

function health(base, tries = 100) { return new Promise((res, rej) => { const t = async () => { try { const r = await fetch(`${base}/health`); if (r.ok) return res(); } catch {} if (--tries <= 0) return rej(new Error('health timeout')); setTimeout(t, 100); }; t(); }); }
function run(base, dur) { return new Promise((res, rej) => autocannon({ url: base, connections: CONNECTIONS, duration: dur, requests: [{ setupRequest: (r) => ({ ...r, method: 'GET', path: `/posts/${rnd(SEED_POSTS)}/thread` }) }] }, (e, r) => e ? rej(e) : res(r))); }

const out = [];
let port = 3800;
for (const adapter of LAYERS) {
  const p = port++; const base = `http://127.0.0.1:${p}`;
  if (adapter === 'prisma') { const { execSync } = await import('node:child_process'); execSync('npx prisma generate --schema=prisma/schema.postgres.prisma', { stdio: 'ignore' }); }
  const child = spawn(process.execPath, [join(here, '..', 'src', 'server.mjs')], {
    env: { ...process.env, ADAPTER: adapter, ENGINE: 'postgres', PORT: String(p) }, stdio: ['ignore', 'ignore', 'inherit'],
  });
  try {
    await health(base);
    await run(base, WARMUP);
    const perMin = [];
    for (let m = 0; m < MINUTES; m++) {
      const r = await run(base, 60);
      perMin.push(Math.round(r.requests.average));
      console.log(`  ${adapter} minute ${m + 1}/${MINUTES}: ${Math.round(r.requests.average)} req/s (p99 ${r.latency.p99}ms)`);
    }
    const first3 = median(perMin.slice(0, 3)), last3 = median(perMin.slice(-3));
    const driftPct = ((last3 - first3) / first3) * 100;
    out.push({ adapter, perMin, first3, last3, driftPct: Number(driftPct.toFixed(1)) });
    console.log(`  ${adapter}: first3 ${first3}, last3 ${last3}, drift ${driftPct.toFixed(1)}%`);
  } catch (e) { console.error(`  FAILED ${adapter}: ${e.message}`); }
  finally { child.kill('SIGTERM'); await new Promise((r) => setTimeout(r, 400)); }
}
// band ordering preserved every minute? (pg and prisma are statistically tied at the
// top, so the invariant is: each light layer exceeds mikroorm in every single minute)
const by = Object.fromEntries(out.map((o) => [o.adapter, o.perMin]));
const ok = out.length === LAYERS.length && Array.from({ length: MINUTES }, (_, m) => m)
  .every((m) => by.pg[m] > by.mikroorm[m] && by.prisma[m] > by.mikroorm[m]);
console.log(`band ordering (pg, prisma > mikroorm) preserved every minute: ${ok}`);
await writeFile(join(here, '..', 'results', 'longrun.json'), JSON.stringify({ layers: out, orderingPreservedEveryMinute: ok }, null, 2));
console.log('wrote results/longrun.json');
