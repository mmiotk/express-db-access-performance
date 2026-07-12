// Warm-up / steady-state diagnostics (revision E1.9 / review 6.6): from a COLD
// server boot, drive the deep fetch closed-loop (50 workers) for 60 s and record
// completed requests per second. The stability point is the first second t where
// the mean of seconds [t, t+5) is within ±2% of the mean of the final 10 s; the
// measured warm-up must exceed it. Layers: fast / engine-threaded / slowest.
// Writes results/warmupcurve.json.
import { spawn, execSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'undici';
import { config as cfg } from '../src/config.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const SEED_POSTS = cfg.seed.posts;
const LAYERS = (process.env.WC_LAYERS ?? 'pg,prisma,mikroorm').split(',');
const SECONDS = Number(process.env.WC_SECONDS ?? 60);
const WORKERS = 50;

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function health(base,tries=100){return new Promise((res,rej)=>{const t=async()=>{try{const r=await fetch(`${base}/health`);if(r.ok)return res();}catch{}if(--tries<=0)return rej(new Error('health timeout'));setTimeout(t,100);};t();});}

const out=[];
for (const adapter of LAYERS) {
  const port = 4100 + LAYERS.indexOf(adapter);
  const base = `http://127.0.0.1:${port}`;
  if (adapter === 'prisma') execSync('npx prisma generate --schema=prisma/schema.postgres.prisma', { stdio: 'ignore' });
  const child = spawn(process.execPath, [join(here, '..', 'src', 'server.mjs')], {
    env: { ...process.env, TZ: 'UTC', ADAPTER: adapter, ENGINE: 'postgres', PORT: String(port) },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  try {
    await health(base);
    const pool = new Pool(base, { connections: WORKERS, pipelining: 1 });
    const perSec = new Array(SECONDS).fill(0);
    const t0 = performance.now();
    let stop = false;
    const rnd = mulberry32(7);
    const worker = async () => {
      while (!stop) {
        try {
          const res = await pool.request({ path: `/posts/${1 + Math.floor(rnd() * SEED_POSTS)}/thread`, method: 'GET' });
          await res.body.text();
          const sec = Math.floor((performance.now() - t0) / 1000);
          if (sec < SECONDS) perSec[sec]++; else { stop = true; }
        } catch { if (!stop) { /* transient */ } }
      }
    };
    await Promise.all(Array.from({ length: WORKERS }, worker));
    await pool.close();
    const tail = perSec.slice(-10).reduce((a, b) => a + b, 0) / 10;
    let stable = null;
    for (let t = 0; t + 5 <= SECONDS; t++) {
      const m = perSec.slice(t, t + 5).reduce((a, b) => a + b, 0) / 5;
      if (Math.abs(m - tail) / tail <= 0.02) { stable = t; break; }
    }
    out.push({ adapter, perSec, tailMean: Math.round(tail), stableAfterSec: stable });
    console.log(`  ${adapter}: steady ~${Math.round(tail)} req/s, stable after ${stable}s  (first 5s: ${perSec.slice(0,5).join(',')})`);
  } catch (e) { console.error(`  FAILED ${adapter}: ${e.message}`); }
  finally { child.kill('SIGTERM'); await new Promise((r) => setTimeout(r, 400)); }
}
await writeFile(join(here, '..', 'results', 'warmupcurve.json'), JSON.stringify(out, null, 2));
console.log('wrote results/warmupcurve.json');
