// Performance-conscious co-primary regime (review 6.4). For each ORM with a documented
// join<->select-in choice whose alternative is byte-identical to the documentation-primary
// deep fetch, measure BOTH strategies on ONE harness (a warmup pass, then AL_REPEATS timed
// repeats each), so the two co-primary regimes --- documentation-primary (/thread) and
// performance-conscious (the faster of a layer's two byte-equivalent documented strategies,
// /thread vs /thread-alt) --- are directly comparable. This is a self-contained deep-fetch
// harness (fixed post id, warmup + 25 repeats); absolute req/s therefore differ from the
// seeded-id primary matrix by design, but the two regimes here share one harness. Writes
// results/deepfetch-regimes.json.
//   AL_REPEATS=25 AL_LAYERS=typeorm,mikroorm,objection,sequelize AL_ENGINES=postgres,mysql \
//     node scripts/deepfetch-regimes.mjs
import { spawn, execSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import autocannon from 'autocannon';
import { median } from '../bench/stats.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const env = (k, d) => process.env[k] ?? d;
const LAYERS = env('AL_LAYERS', 'sequelize,typeorm,mikroorm,objection').split(',');
const ENGINES = env('AL_ENGINES', 'postgres,mysql').split(',');
const CONNECTIONS = Number(env('AL_CONN', 50));
const DURATION = Number(env('AL_DURATION', 8));
const WARMUP = Number(env('AL_WARMUP', 10));
const REPEATS = Number(env('AL_REPEATS', 25));
const DIRECTION = { sequelize: 'join->select-in', typeorm: 'join->select-in', mikroorm: 'join->select-in', objection: 'select-in->join' };

function health(base, tries = 300) { return new Promise((res, rej) => { const t = async () => { try { const r = await fetch(`${base}/health`); if (r.ok) return res(); } catch {} if (--tries <= 0) return rej(new Error('health timeout')); setTimeout(t, 100); }; t(); }); }
function run(path, base, duration) {
  return new Promise((resolve, reject) => {
    autocannon({ url: `${base}${path}`, connections: CONNECTIONS, duration }, (err, r) => err ? reject(err) : resolve(Math.round(r.requests.average)));
  });
}

const out = [];
let port = 4500;
for (const engine of ENGINES) {
  for (const adapter of LAYERS) {
    const base = `http://127.0.0.1:${port++}`;
    if (adapter === 'prisma') execSync(`npx prisma generate --schema=prisma/schema.${engine}.prisma`, { stdio: 'ignore' });
    const child = spawn(process.execPath, [join(here, '..', 'src', 'server.mjs')], {
      env: { ...process.env, TZ: 'UTC', ADAPTER: adapter, ENGINE: engine, PORT: String(base.split(':')[2]) },
      stdio: ['ignore', 'ignore', 'inherit'],
    });
    try {
      await health(base);
      // gate: the alternative strategy must be a byte-identical drop-in to count as a
      // semantically-equivalent, performance-conscious option (also checked by verify.mjs).
      const a = await (await fetch(`${base}/posts/1/thread`)).text();
      const altRes = await fetch(`${base}/posts/1/thread-alt`);
      const b = await altRes.text();
      const identical = altRes.status === 200 && a === b;
      if (!identical) {
        const reason = altRes.status !== 200 ? `alt endpoint status ${altRes.status}` : 'response not byte-identical';
        out.push({ engine, adapter, direction: DIRECTION[adapter], identical: false, reason });
        console.error(`  ${engine}/${adapter}: EXCLUDED --- ${reason}`);
        continue;
      }
      await run('/posts/1/thread', base, WARMUP);       // warmup: JIT, pool fill, plan cache
      await run('/posts/1/thread-alt', base, WARMUP);
      const doc = [], alt = [];
      for (let i = 0; i < REPEATS; i++) {
        doc.push(await run('/posts/1/thread', base, DURATION));
        alt.push(await run('/posts/1/thread-alt', base, DURATION));
      }
      const doc_med = median(doc), alt_med = median(alt);
      const perf = Math.max(doc_med, alt_med); // faster of the two byte-equivalent documented strategies
      const rec = { engine, adapter, direction: DIRECTION[adapter], identical: true,
        connections: CONNECTIONS, duration: DURATION, warmup: WARMUP, repeats: REPEATS,
        doc_primary_rps: doc_med, alt_rps: alt_med, perf_conscious_rps: perf,
        perf_over_doc: +(perf / doc_med).toFixed(3),
        doc_samples: doc, alt_samples: alt };
      out.push(rec);
      console.log(`  ${engine}/${adapter} (${rec.direction}): doc-primary ${doc_med} vs alt ${alt_med} rps -> performance-conscious ${perf} (${rec.perf_over_doc}x)`);
    } catch (e) { console.error(`  FAILED ${engine}/${adapter}: ${e.message}`); }
    finally { child.kill('SIGTERM'); await new Promise((r) => setTimeout(r, 400)); }
  }
}
await writeFile(join(here, '..', 'results', 'deepfetch-regimes.json'), JSON.stringify(out, null, 2));
console.log(`\nwrote results/deepfetch-regimes.json (${out.filter((r) => r.identical).length} measured, ${out.filter((r) => !r.identical).length} excluded)`);
