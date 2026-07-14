// Environmental-robustness check (review 6.7): after a full database restart
// (cold buffer pools, fresh connections), re-measure a representative subset and
// confirm the deep-fetch ranking and values reproduce the primary campaign, which
// ran within one host session. Compares medians to results/raw.json. Single host,
// so this checks temporal robustness, not cross-machine generalization.
// Run db-local.sh stop && db-local.sh start (and re-warm) BEFORE this script.
import { spawn, execSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import autocannon from 'autocannon';
import { median } from '../bench/stats.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const REPEATS = Number(process.env.PR_REPEATS ?? 8);
const DURATION = Number(process.env.PR_DURATION ?? 8);
const CONNECTIONS = 50;
const CELLS = [
  { engine: 'postgres', adapter: 'pg' }, { engine: 'postgres', adapter: 'prisma' }, { engine: 'postgres', adapter: 'mikroorm' },
  { engine: 'mysql', adapter: 'mysql2' }, { engine: 'mysql', adapter: 'prisma' }, { engine: 'mysql', adapter: 'mikroorm' },
];
const raw = JSON.parse(await readFile(join(here, '..', 'results', 'raw.json'), 'utf8'));
const primary = (adapter, engine, endpoint) => { const r = raw.find((x) => x.adapter === adapter && x.engine === engine && x.endpoint === endpoint); return r ? r.rps : null; };

function health(base, tries = 120) { return new Promise((res, rej) => { const t = async () => { try { const r = await fetch(`${base}/health`); if (r.ok) return res(); } catch {} if (--tries <= 0) return rej(new Error('health timeout')); setTimeout(t, 100); }; t(); }); }
function ac(opts) { return new Promise((resolve, reject) => autocannon({ connections: CONNECTIONS, duration: DURATION, ...opts }, (e, r) => e ? reject(e) : resolve(Math.round(r.requests.average)))); }

const out = [];
let port = 4600;
for (const { engine, adapter } of CELLS) {
  const base = `http://127.0.0.1:${port++}`;
  if (adapter === 'prisma') execSync(`npx prisma generate --schema=prisma/schema.${engine}.prisma`, { stdio: 'ignore' });
  const child = spawn(process.execPath, [join(here, '..', 'src', 'server.mjs')], {
    env: { ...process.env, TZ: 'UTC', ADAPTER: adapter, ENGINE: engine, PORT: String(base.split(':')[2]) },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  try {
    await health(base);
    await ac({ url: `${base}/posts/1/thread`, duration: 3 });   // re-warm cold buffers
    const deep = [];
    for (let i = 0; i < REPEATS; i++) deep.push(await ac({ url: `${base}/posts/1/thread` }));
    const md = median(deep);
    const base0 = primary(adapter, engine, 'deep_fetch');
    const rec = { engine, adapter, deep_rps: md, primary_deep_rps: base0, ratio: base0 ? +(md / base0).toFixed(3) : null };
    out.push(rec);
    console.log(`  ${engine}/${adapter}: deep ${md} rps (primary ${base0}, ratio ${rec.ratio})`);
  } catch (e) { console.error(`  FAILED ${engine}/${adapter}: ${e.message}`); }
  finally { child.kill('SIGTERM'); await new Promise((r) => setTimeout(r, 400)); }
}
await writeFile(join(here, '..', 'results', 'postreboot.json'), JSON.stringify(out, null, 2));
console.log('\nwrote results/postreboot.json');
