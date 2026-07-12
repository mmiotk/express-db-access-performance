// Graph-size (fan-out) sweep (revision E3.5 / review 6.10): deep fetch against the
// dedicated posts with EXACTLY 0/1/10/50/100/500 comments (ids 250001..250006,
// created by seed-fanout.mjs), per layer, closed-loop 50 connections, median of
// FO_REPS runs. PostgreSQL primary (MySQL optional via FO_ENGINES). Writes
// results/fanout.json.
import { spawn, execSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import autocannon from 'autocannon';
import { ADAPTERS } from '../src/config.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const FANOUT = [0, 1, 10, 50, 100, 500];
const BASE_ID = 250001;
const ENGINES = (process.env.FO_ENGINES ?? 'postgres').split(',');
const REPS = Number(process.env.FO_REPS ?? 3);
const DURATION = Number(process.env.FO_DURATION ?? 8), WARMUP = 2, CONNECTIONS = 50;
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

function health(base, tries = 100) { return new Promise((res, rej) => { const t = async () => { try { const r = await fetch(`${base}/health`); if (r.ok) return res(); } catch {} if (--tries <= 0) return rej(new Error('health timeout')); setTimeout(t, 100); }; t(); }); }
function run(base, id, dur) { return new Promise((res, rej) => autocannon({ url: base, connections: CONNECTIONS, duration: dur, requests: [{ method: 'GET', path: `/posts/${id}/thread` }] }, (e, r) => e ? rej(e) : res(r))); }

const out = [];
let port = 4200;
for (const engine of ENGINES) for (const adapter of Object.keys(ADAPTERS)) {
  if (!ADAPTERS[adapter].engines.includes(engine)) continue;
  const p = ++port; const base = `http://127.0.0.1:${p}`;
  if (adapter === 'prisma') execSync(`npx prisma generate --schema=prisma/schema.${engine}.prisma`, { stdio: 'ignore' });
  const child = spawn(process.execPath, [join(here, '..', 'src', 'server.mjs')], {
    env: { ...process.env, TZ: 'UTC', ADAPTER: adapter, ENGINE: engine, PORT: String(p) }, stdio: ['ignore', 'ignore', 'inherit'],
  });
  try {
    await health(base);
    await run(base, BASE_ID + 2, WARMUP); // warm on the 10-comment post
    for (let i = 0; i < FANOUT.length; i++) {
      const id = BASE_ID + i;
      const samples = [], p99s = [];
      for (let k = 0; k < REPS; k++) { const r = await run(base, id, DURATION); samples.push(Math.round(r.requests.average)); p99s.push(r.latency.p99); }
      out.push({ adapter, engine, fanout: FANOUT[i], rps: median(samples), p99: median(p99s), rps_samples: samples });
      console.log(`  ${adapter}/${engine} fanout=${FANOUT[i]}: ${median(samples)} req/s p99=${median(p99s)}ms`);
    }
  } catch (e) { console.error(`  FAILED ${adapter}/${engine}: ${e.message}`); }
  finally { child.kill('SIGTERM'); await new Promise((r) => setTimeout(r, 400)); }
}
await writeFile(join(here, '..', 'results', 'fanout.json'), JSON.stringify(out, null, 2));
console.log('wrote results/fanout.json');
