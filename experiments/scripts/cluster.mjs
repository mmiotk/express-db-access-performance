// Multi-worker sensitivity (review 4, §6.5). The reviewer's central single-host
// worry: Prisma's ~5-core in-process engine may look competitive only because the
// one-core layers leave cores idle. This scales each layer out to 1/2/4 Express
// workers (node:cluster, shared port) and re-measures the deep fetch, so every layer
// can use the spare cores. If Prisma's parity holds at 1 worker but the one-core
// layers overtake it at 2-4 workers, that is the reviewer's point, measured.
// Representative subset, both engines, median of CL_REPS. Writes results/cluster.json.
import { spawn, execSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import autocannon from 'autocannon';
import { median } from '../bench/stats.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const env = (k, d) => process.env[k] ?? d;
const ENGINES = env('CL_ENGINES', 'postgres,mysql').split(',');
const WORKERS = env('CL_WORKERS', '1,2,4').split(',').map(Number);
const CONNECTIONS = Number(env('CL_CONN', 50));
const DURATION = Number(env('CL_DURATION', 8));
const REPS = Number(env('CL_REPS', 3));
// native layer differs per engine; use fast native + query-engine ORM + heavy ORM
const layersFor = (e) => env('CL_LAYERS', `${e === 'mysql' ? 'mysql2' : 'pg'},prisma,mikroorm`).split(',');

function health(base, tries = 150) { return new Promise((res, rej) => { const t = async () => { try { const r = await fetch(`${base}/health`); if (r.ok) return res(); } catch {} if (--tries <= 0) return rej(new Error('health timeout')); setTimeout(t, 100); }; t(); }); }
function ac(url) { return new Promise((resolve, reject) => autocannon({ url, connections: CONNECTIONS, duration: DURATION }, (e, r) => e ? reject(e) : resolve({ rps: Math.round(r.requests.average), p99: r.latency.p99 }))); }

const out = [];
let port = 4750;
for (const engine of ENGINES) {
  for (const adapter of layersFor(engine)) {
    if (adapter === 'prisma') execSync(`npx prisma generate --schema=prisma/schema.${engine}.prisma`, { stdio: 'ignore' });
    for (const workers of WORKERS) {
      const base = `http://127.0.0.1:${port++}`;
      const child = spawn(process.execPath, [join(here, 'cluster-server.mjs')], {
        env: { ...process.env, TZ: 'UTC', ADAPTER: adapter, ENGINE: engine, PORT: String(base.split(':')[2]), WORKERS: String(workers) },
        stdio: ['ignore', 'ignore', 'inherit'],
      });
      try {
        await health(base);
        await ac(`${base}/posts/1/thread`);           // warm all workers
        const rps = [], p99 = [];
        for (let i = 0; i < REPS; i++) { const r = await ac(`${base}/posts/1/thread`); rps.push(r.rps); p99.push(r.p99); }
        const rec = { engine, adapter, workers, rps_med: median(rps), p99_med: median(p99), rps_samples: rps };
        out.push(rec);
        console.log(`  ${engine}/${adapter} x${workers}w: rps ${rec.rps_med}  p99 ${rec.p99_med}ms`);
      } catch (e) { console.error(`  FAILED ${engine}/${adapter} x${workers}: ${e.message}`); }
      finally { child.kill('SIGTERM'); await new Promise((r) => setTimeout(r, 500)); }
    }
  }
}
await writeFile(join(here, '..', 'results', 'cluster.json'), JSON.stringify(out, null, 2));
console.log(`\nwrote results/cluster.json (${out.length} cells)`);
