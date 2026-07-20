// Native-driver deep-fetch baseline on the SAME harness as scripts/deepfetch-regimes.mjs
// (fixed post id, warmup pass, then 25 timed repeats), so the performance-conscious ORM
// deep-fetch throughput can be compared to the native driver on one footing. The native
// drivers expose only a hand-authored join (no documented alternative loading strategy), so
// there is a single regime. Records are tagged role:'native-baseline' and APPENDED to
// results/deepfetch-regimes.json (one file for the whole co-primary-regime experiment), so
// run this AFTER scripts/deepfetch-regimes.mjs.
//   node scripts/deepfetch-regimes.mjs && node scripts/deepfetch-native.mjs
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import autocannon from 'autocannon';
import { median } from '../bench/stats.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const env = (k, d) => process.env[k] ?? d;
const CONNECTIONS = Number(env('AL_CONN', 50));
const DURATION = Number(env('AL_DURATION', 8));
const WARMUP = Number(env('AL_WARMUP', 10));
const REPEATS = Number(env('AL_REPEATS', 25));
const CELLS = [{ engine: 'postgres', adapter: 'pg' }, { engine: 'mysql', adapter: 'mysql2' }];

function health(base, tries = 300) { return new Promise((res, rej) => { const t = async () => { try { const r = await fetch(`${base}/health`); if (r.ok) return res(); } catch {} if (--tries <= 0) return rej(new Error('health timeout')); setTimeout(t, 100); }; t(); }); }
function run(path, base, duration) {
  return new Promise((resolve, reject) => {
    autocannon({ url: `${base}${path}`, connections: CONNECTIONS, duration }, (err, r) => err ? reject(err) : resolve(Math.round(r.requests.average)));
  });
}

const out = [];
let port = 4700;
for (const { engine, adapter } of CELLS) {
  const base = `http://127.0.0.1:${port++}`;
  const child = spawn(process.execPath, [join(here, '..', 'src', 'server.mjs')], {
    env: { ...process.env, TZ: 'UTC', ADAPTER: adapter, ENGINE: engine, PORT: String(base.split(':')[2]) },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  try {
    await health(base);
    await run('/posts/1/thread', base, WARMUP);
    const doc = [];
    for (let i = 0; i < REPEATS; i++) doc.push(await run('/posts/1/thread', base, DURATION));
    const doc_med = median(doc);
    out.push({ engine, adapter, role: 'native-baseline', connections: CONNECTIONS, duration: DURATION, warmup: WARMUP, repeats: REPEATS, doc_primary_rps: doc_med, doc_samples: doc });
    console.log(`  ${engine}/${adapter}: native deep-fetch ${doc_med} req/s (n=${REPEATS})`);
  } catch (e) { console.error(`  FAILED ${engine}/${adapter}: ${e.message}`); }
  finally { child.kill('SIGTERM'); await new Promise((r) => setTimeout(r, 400)); }
}
// append the native reference rows to the co-primary-regime file (one raw-data file for the
// whole experiment), replacing any previous native-baseline rows
const regimesPath = join(here, '..', 'results', 'deepfetch-regimes.json');
const existing = JSON.parse(await readFile(regimesPath, 'utf8')).filter((r) => r.role !== 'native-baseline');
await writeFile(regimesPath, JSON.stringify([...existing, ...out], null, 2));
console.log(`\nappended ${out.length} native baselines to results/deepfetch-regimes.json`);
