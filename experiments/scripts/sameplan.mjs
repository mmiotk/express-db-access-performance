// Same-plan deep-fetch control (adversarial-review surface 4). Measures every layer
// on /posts/:id/thread-raw — the IDENTICAL two-statement plan + identical JS mapping
// through each layer's raw facility — under the primary protocol (50 connections,
// 2s warm-up, 12s run), and contrasts it with the idiomatic deep fetch from
// results/raw.json. The per-layer ratio idiomatic/same-plan attributes each library's
// deep-fetch deficit to its default eager-loading strategy + hydration (ratio < 1)
// versus its raw execution path (the same-plan spread itself). Also measures the
// no-DB /baseline endpoint once per engine (Express + JSON serialization floor).
// Sanity: before measuring, asserts /thread and /thread-raw agree on key fields.
import { spawn, execSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import autocannon from 'autocannon';
import { ADAPTERS, config as cfg } from '../src/config.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const SEED_POSTS = cfg.seed.posts;
const rnd = (n) => 1 + Math.floor(Math.random() * n);
const CONNECTIONS = 50, DURATION = 12, WARMUP = 2, PROBE_ID = 50000;

function health(base, tries = 100) { return new Promise((res, rej) => { const t = async () => { try { const r = await fetch(`${base}/health`); if (r.ok) return res(); } catch {} if (--tries <= 0) return rej(new Error('health timeout')); setTimeout(t, 100); }; t(); }); }
function run(base, path, dur, dynamic = true) {
  return new Promise((res, rej) => autocannon({
    url: base, connections: CONNECTIONS, duration: dur,
    requests: [dynamic ? { setupRequest: (r) => ({ ...r, method: 'GET', path: path() }) } : { method: 'GET', path }],
  }, (e, r) => e ? rej(e) : res(r)));
}

// key-field agreement between idiomatic and same-plan responses (type-tolerant)
function agree(a, b) {
  if (!a || !b) return a === b;
  const c = (x) => ({ id: Number(x.post.id), title: x.post.title, author: Number(x.author.id), n: x.comments.length,
    first: x.comments[0] && [Number(x.comments[0].id), Number(x.comments[0].author.id)],
    last: x.comments.at(-1) && [Number(x.comments.at(-1).id), Number(x.comments.at(-1).author.id)] });
  return JSON.stringify(c(a)) === JSON.stringify(c(b));
}

const raw = JSON.parse(await readFile(join(here, '..', 'results', 'raw.json'), 'utf8'));
const idio = (a, e) => raw.find((r) => r.adapter === a && r.endpoint === 'deep_fetch' && r.engine === e)?.rps;

const wantAdapters = (process.env.ADAPTERS ?? Object.keys(ADAPTERS).join(',')).split(',').map((s) => s.trim());
let out = { cells: [], baseline: {} };
if (process.env.MERGE === '1') {
  try { out = JSON.parse(await readFile(join(here, '..', 'results', 'sameplan.json'), 'utf8')); } catch {}
}
let port = 3600;
for (const engine of ['postgres', 'mysql']) {
  for (const adapter of Object.keys(ADAPTERS)) {
    if (!ADAPTERS[adapter].engines.includes(engine) || !wantAdapters.includes(adapter)) continue;
    out.cells = out.cells.filter((c) => !(c.adapter === adapter && c.engine === engine)); // MERGE: replace re-measured cell
    const p = port++; const base = `http://127.0.0.1:${p}`;
    if (adapter === 'prisma') execSync(`npx prisma generate --schema=prisma/schema.${engine}.prisma`, { stdio: 'ignore' });
    const child = spawn(process.execPath, [join(here, '..', 'src', 'server.mjs')], {
      env: { ...process.env, ADAPTER: adapter, ENGINE: engine, PORT: String(p) }, stdio: ['ignore', 'ignore', 'inherit'],
    });
    try {
      await health(base);
      const [ti, tr] = await Promise.all([
        fetch(`${base}/posts/${PROBE_ID}/thread`).then((r) => r.json()),
        fetch(`${base}/posts/${PROBE_ID}/thread-raw`).then((r) => r.json()),
      ]);
      const ok = agree(ti, tr);
      await run(base, () => `/posts/${rnd(SEED_POSTS)}/thread-raw`, WARMUP);
      const r = await run(base, () => `/posts/${rnd(SEED_POSTS)}/thread-raw`, DURATION);
      const rps = Math.round(r.requests.average);
      out.cells.push({ adapter, engine, rps, p99: r.latency.p99, idiomatic: idio(adapter, engine), agree: ok });
      console.log(`  ${adapter}/${engine}: same-plan ${rps} req/s (p99 ${r.latency.p99}ms)  idiomatic ${idio(adapter, engine)}  agree=${ok}`);
      if (adapter === 'pg' || adapter === 'mysql2') { // baseline once per engine (layer-independent)
        await run(base, '/baseline', WARMUP, false);
        const b = await run(base, '/baseline', DURATION, false);
        out.baseline[engine] = Math.round(b.requests.average);
        console.log(`  [baseline/${engine}]: ${out.baseline[engine]} req/s (Express + JSON floor)`);
      }
    } catch (e) { console.error(`  FAILED ${adapter}/${engine}: ${e.message}`); }
    finally { child.kill('SIGTERM'); await new Promise((r) => setTimeout(r, 400)); }
  }
}
await writeFile(join(here, '..', 'results', 'sameplan.json'), JSON.stringify(out, null, 2));

// ---- paper table: idiomatic vs same-plan per engine ------------------------------
const ORDER = ['pg', 'mysql2', 'knex', 'drizzle', 'prisma', 'sequelize', 'typeorm', 'objection', 'mikroorm'];
const get = (a, e) => out.cells.find((c) => c.adapter === a && c.engine === e);
const cellPair = (a, e) => { const c = get(a, e); return c ? `${c.idiomatic} & ${c.rps} & ${(c.idiomatic / c.rps).toFixed(2)}` : '-- & -- & --'; };
const rows = ORDER.filter((a) => get(a, 'postgres') || get(a, 'mysql'))
  .map((a) => `    \\texttt{${a}} & ${cellPair(a, 'postgres')} & ${cellPair(a, 'mysql')} \\\\`).join('\n');
const spread = (e) => { const cs = out.cells.filter((c) => c.engine === e); const nat = get(e === 'postgres' ? 'pg' : 'mysql2', e); const min = Math.min(...cs.map((c) => c.rps)); return (nat.rps / min).toFixed(2); };
const tex = `% auto-generated by scripts/sameplan.mjs — idiomatic vs same-plan deep fetch
\\begin{table}[htbp]
  \\centering
  \\caption{Decomposing the deep-fetch spread: throughput (req/s) of the idiomatic
    deep fetch versus the \\emph{same-plan} control, in which every layer executes the
    identical two-statement plan with identical row mapping through its raw-SQL
    facility. The ratio (idiomatic $\\div$ same-plan) attributes each layer's deficit
    to its default eager-loading strategy and entity hydration; the remaining
    same-plan spread (native-relative $${spread('postgres')}\\times$ on PostgreSQL,
    $${spread('mysql')}\\times$ on MySQL) is the cost of the library's raw execution
    path itself.}
  \\label{tab:sameplan}
  \\begin{adjustbox}{max width=\\textwidth}
  \\begin{tabular}{l r r r r r r}
    \\toprule
    & \\multicolumn{3}{c}{PostgreSQL} & \\multicolumn{3}{c}{MySQL} \\\\
    \\cmidrule(lr){2-4}\\cmidrule(lr){5-7}
    Layer & idiom. & same-plan & ratio & idiom. & same-plan & ratio \\\\
    \\midrule
${rows}
    \\bottomrule
  \\end{tabular}
  \\end{adjustbox}
\\end{table}
`;
await writeFile(join(here, '..', 'results', 'tables', 'sameplan.tex'), tex);
await writeFile(join(here, '..', '..', 'paper', 'tables', 'sameplan.tex'), tex);
console.log(`\nwrote results/sameplan.json + paper/tables/sameplan.tex (baseline: PG ${out.baseline.postgres}, MySQL ${out.baseline.mysql} req/s)`);
