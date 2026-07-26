// Transactional multi-statement write experiment (revision round 2, review 6.7).
// Measures POST /threads (insert one post and five comments in a single
// transaction) for a representative layer of each tier on PostgreSQL under default
// durability, from an exact logical row-and-sequence reset between runs. Supplementary to the
// five primary patterns; a representative subset, not the full matrix. Writes
// results/txn-write.json and results/tables/txn_write.tex.
import { spawn, execSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import autocannon from 'autocannon';
import pg from 'pg';
import { config as cfg } from '../src/config.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const LAYERS = (process.env.TW_LAYERS ?? 'pg,knex,prisma,typeorm,mikroorm').split(',');
const REPS = Number(process.env.TW_REPS ?? 5), DURATION = 10, WARMUP = 3, CONNECTIONS = 50;
const FLOOR = Number(process.env.RESET_FLOOR ?? 300000);
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

const drain = () => new Promise((r) => setTimeout(r, 1000)); // let in-flight commits finish
async function resetDb() {
  // A straggler transaction can commit a comment between the two deletes, so retry
  // the pair on the resulting transient foreign-key error.
  for (let attempt = 0; attempt < 6; attempt++) {
    const c = new pg.Client(cfg.postgres); await c.connect();
    try {
      await c.query('DELETE FROM comments WHERE post_id > $1', [FLOOR]);
      await c.query('DELETE FROM posts WHERE id > $1', [FLOOR]);
      await c.query("SELECT setval(pg_get_serial_sequence('posts', 'id'), $1, true)", [FLOOR]);
      await c.end(); return;
    } catch (e) {
      await c.end().catch(() => {});
      if (attempt === 5) throw e;
      await new Promise((r) => setTimeout(r, 300));
    }
  }
}
function health(base, tries = 100) { return new Promise((res, rej) => { const t = async () => { try { const r = await fetch(`${base}/health`); if (r.ok) return res(); } catch {} if (--tries <= 0) return rej(new Error('health timeout')); setTimeout(t, 100); }; t(); }); }
async function waitIdle(base, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const stats = await (await fetch(`${base}/stats`)).json();
    if (stats.active_handlers === 0) return;
    if (Date.now() > deadline) throw new Error('handler-drain timeout');
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}
function run(base, dur) {
  return new Promise((res, rej) => autocannon({
    url: base, connections: CONNECTIONS, duration: dur,
    requests: [{ method: 'POST', path: '/threads', headers: { 'content-type': 'application/json' }, body: '{}' }],
  }, (e, r) => e ? rej(e) : res(r)));
}

const out = [];
let port = 4900;
for (const adapter of LAYERS) {
  if (adapter === 'prisma') execSync('npx prisma generate --schema=prisma/schema.postgres.prisma', { stdio: 'ignore' });
  const p = ++port; const base = `http://127.0.0.1:${p}`;
  await resetDb();
  const child = spawn(process.execPath, [join(here, '..', 'src', 'server.mjs')], {
    env: { ...process.env, TZ: 'UTC', ADAPTER: adapter, ENGINE: 'postgres', PORT: String(p) }, stdio: ['ignore', 'ignore', 'inherit'],
  });
  try {
    await health(base);
    // correctness probe: one thread must insert exactly 1 post + 5 comments
    const before = await countNew();
    await fetch(`${base}/threads`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).then((r) => r.json());
    const after = await countNew();
    const ok = after.posts - before.posts === 1 && after.comments - before.comments === 5;
    await run(base, WARMUP);
    await waitIdle(base);
    await drain(); // drain warm-up stragglers before the first reset
    const samples = [], p99s = [];
    for (let k = 0; k < REPS; k++) { await resetDb(); const r = await run(base, DURATION); await waitIdle(base); samples.push(Math.round(r.requests.average)); p99s.push(r.latency.p99); await drain(); }
    out.push({ adapter, rps: median(samples), p99: median(p99s), correct: ok, rps_samples: samples });
    console.log(`  ${adapter}: ${median(samples)} req/s  p99=${median(p99s)}ms  correct=${ok}`);
  } catch (e) { console.error(`  FAILED ${adapter}: ${e.message}`); }
  finally {
    if (child.exitCode === null) child.kill('SIGTERM');
    await new Promise((resolve) => {
      if (child.exitCode !== null) return resolve();
      const timeout = setTimeout(resolve, 5000);
      child.once('exit', () => { clearTimeout(timeout); resolve(); });
    });
    await resetDb();
  }
}

async function countNew() {
  const c = new pg.Client(cfg.postgres); await c.connect();
  const posts = Number((await c.query('SELECT COUNT(*)::int n FROM posts WHERE id > $1', [FLOOR])).rows[0].n);
  const comments = Number((await c.query('SELECT COUNT(*)::int n FROM comments WHERE post_id > $1', [FLOOR])).rows[0].n);
  await c.end(); return { posts, comments };
}

await writeFile(join(here, '..', 'results', 'txn-write.json'), JSON.stringify(out, null, 2));
console.log('wrote results/txn-write.json + results/tables/txn_write.tex');
execSync('node scripts/gen-txn-write-table.mjs', { stdio: 'inherit' });
