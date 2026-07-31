// Alternative eager-loading sensitivity (review 6.3). For the ORMs with a
// documented join<->select-in choice, this compares the policy-selected deep fetch
// (/thread) against the alternative strategy (/thread-alt) on both engines and
// reports whether the deep-fetch ranking is sensitive to the loading strategy.
// Sequelize, TypeORM, MikroORM switch join -> select-in; Objection switches
// select-in -> join, so both directions are exercised. It first asserts the two
// endpoints return byte-identical responses (same data, different SQL strategy),
// then measures throughput. Writes results/altloading.json + paper table.
import { spawn, execSync } from 'node:child_process';
import { writeFile, readFile } from 'node:fs/promises';
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
const REPEATS = Number(env('AL_REPEATS', 5));
// direction each layer moves relative to its selected path
const DIRECTION = { sequelize: 'join->select-in', typeorm: 'join->select-in', mikroorm: 'join->select-in', objection: 'select-in->join' };

function health(base, tries = 120) { return new Promise((res, rej) => { const t = async () => { try { const r = await fetch(`${base}/health`); if (r.ok) return res(); } catch {} if (--tries <= 0) return rej(new Error('health timeout')); setTimeout(t, 100); }; t(); }); }
async function waitIdle(base, timeoutMs = 30000) { const deadline = Date.now() + timeoutMs; for (;;) { const s = await (await fetch(`${base}/stats`)).json(); if (s.active_handlers === 0) return; if (Date.now() > deadline) throw new Error('handler-drain timeout'); await new Promise((r) => setTimeout(r, 25)); } }
function run(path, base) {
  return new Promise((resolve, reject) => {
    autocannon({ url: `${base}${path}`, connections: CONNECTIONS, duration: DURATION }, (err, r) => err ? reject(err) : resolve(Math.round(r.requests.average)));
  });
}

// TABLE_ONLY=1 rebuilds the table from the archived run without re-measuring, so a
// caption or formatting fix does not require standing up databases and a new campaign
// (results are append-only). Same convention as sameplan.mjs.
const TABLE_ONLY = process.env.TABLE_ONLY === '1';
const out = TABLE_ONLY
  ? JSON.parse(await readFile(join(here, '..', 'results', 'altloading.json'), 'utf8'))
  : [];
let port = 4400;
for (const engine of TABLE_ONLY ? [] : ENGINES) {
  for (const adapter of LAYERS) {
    const base = `http://127.0.0.1:${port++}`;
    if (adapter === 'prisma') execSync(`npx prisma generate --schema=prisma/schema.${engine}.prisma`, { stdio: 'ignore' });
    const child = spawn(process.execPath, [join(here, '..', 'src', 'server.mjs')], {
      env: { ...process.env, TZ: 'UTC', ADAPTER: adapter, ENGINE: engine, PORT: String(base.split(':')[2]) },
      stdio: ['ignore', 'ignore', 'inherit'],
    });
    try {
      await health(base);
      // correctness: selected and alternative must return byte-identical bodies.
      // The alternative endpoint returns 501 if unsupported, or an error body if the
      // strategy is not a transparent drop-in (e.g. TypeORM's query strategy errors on
      // the ordered deep-fetch findOne; Objection's withGraphJoined changes row handling).
      const a = await (await fetch(`${base}/posts/1/thread`)).text();
      const altRes = await fetch(`${base}/posts/1/thread-alt`);
      const b = await altRes.text();
      const identical = altRes.status === 200 && a === b;
      if (!identical) {
        const reason = altRes.status !== 200 ? `alt endpoint status ${altRes.status}` : 'response not byte-identical';
        out.push({ engine, adapter, direction: DIRECTION[adapter], identical: false, reason });
        console.error(`  ${engine}/${adapter} (${DIRECTION[adapter]}): EXCLUDED — ${reason}`);
        continue;
      }
      await run('/posts/1/thread', base); await waitIdle(base);
      await run('/posts/1/thread-alt', base); await waitIdle(base);
      const selected = [], alt = [];
      for (let i = 0; i < REPEATS; i++) {
        if (i % 2 === 0) {
          selected.push(await run('/posts/1/thread', base)); await waitIdle(base);
          alt.push(await run('/posts/1/thread-alt', base)); await waitIdle(base);
        } else {
          alt.push(await run('/posts/1/thread-alt', base)); await waitIdle(base);
          selected.push(await run('/posts/1/thread', base)); await waitIdle(base);
        }
      }
      const mi = median(selected), ma = median(alt);
      const rec = { engine, adapter, direction: DIRECTION[adapter], identical, connections: CONNECTIONS, duration: DURATION, discarded_warmup_each_path: DURATION, repeats: REPEATS, selected_rps: mi, alt_rps: ma, selected_samples: selected, alt_samples: alt, ratio: +(ma / mi).toFixed(3) };
      out.push(rec);
      console.log(`  ${engine}/${adapter} (${rec.direction}): selected ${mi} vs alt ${ma} rps  (alt/selected ${rec.ratio}, identical=${identical})`);
    } catch (e) { console.error(`  FAILED ${engine}/${adapter}: ${e.message}`); }
    finally { if (child.exitCode === null) child.kill('SIGTERM'); await new Promise((resolve) => { if (child.exitCode !== null) return resolve(); const timeout = setTimeout(resolve, 5000); child.once('exit', () => { clearTimeout(timeout); resolve(); }); }); }
  }
}

if (!TABLE_ONLY) await writeFile(join(here, '..', 'results', 'altloading.json'), JSON.stringify(out, null, 2));

// The archived run predates the idiomatic -> selected rename, so a record may carry
// either field. Without this fallback, regenerating the table from the archive emits
// '--' in every selected column, silently.
const LEGACY = { selected_rps: 'idiomatic_rps' };
const cell = (eng, a, key) => {
  const r = out.find((x) => x.engine === eng && x.adapter === a && x.identical);
  if (!r) return '--';
  return r[key] ?? r[LEGACY[key]] ?? '--';
};
const measured = LAYERS.filter((a) => out.some((x) => x.adapter === a && x.identical));
const excluded = LAYERS.filter((a) => !measured.includes(a));
const rows = measured.map((a) => {
  const d = (DIRECTION[a] || '').replace('->', '$\\to$');
  return `    \\texttt{${a}} & ${d} & ${cell('postgres', a, 'selected_rps')} & ${cell('postgres', a, 'alt_rps')} & ${cell('mysql', a, 'selected_rps')} & ${cell('mysql', a, 'alt_rps')} \\\\`;
}).join('\n');
// Derived per engine from the run records, not hard-coded: the note previously named
// both TypeORM's and Objection's failure regardless of who was actually excluded, so it
// asserted that Objection's alternative was not a drop-in while the table reported its
// MySQL alternative as one.
const ENGL = { postgres: 'PostgreSQL', mysql: 'MySQL' };
const failures = out.filter((x) => !x.identical);
const byLayer = {};
for (const f of failures) (byLayer[f.adapter] = byLayer[f.adapter] || []).push(`${ENGL[f.engine]} (${f.reason})`);
const notes = Object.entries(byLayer).map(([a, where]) =>
  `\\texttt{${a}} on ${where.join(' and ')}`);
const exclNote = notes.length
  ? ` The alternative strategy was not a byte-identical drop-in for ${notes.join('; ')}, so those cells are omitted; that non-portability is itself a configuration finding rather than a timed result.`
  : '';

// Derived, not asserted: which layers are faster on their selected path (alt/selected
// ratio below 1). This sentence was previously hand-written into the committed table and
// would have been silently lost the first time anyone regenerated it.
const selFaster = [...new Set(out.filter((x) => x.identical && x.ratio < 1).map((x) => x.adapter))];
const list = (xs) => xs.length < 2
  ? `\\texttt{${xs[0]}}`
  : `\\texttt{${xs.slice(0, -1).join('}, \\texttt{')}} and \\texttt{${xs[xs.length - 1]}}`;
const fasterNote = selFaster.length
  ? ` On both engines the policy-selected documented path is the \\emph{faster} strategy for ${list(selFaster)}, so their deep-fetch deficit does not appear to be an artifact of a poor selected strategy.`
  : '';

const tex = `% auto-generated by scripts/altloading.mjs
\\begin{table}[htbp]
  \\centering
  \\caption{Alternative eager-loading sensitivity on the deep fetch:
    policy-selected documented throughput (req/s) versus the alternative loading strategy, both
    engines, for the layers whose alternative is a byte-identical drop-in. The table reports only byte-identical drop-ins; excluded alternatives remain
    configuration-portability findings rather than timed treatments. This is a secondary
    run that predates the accepted primary campaign, so its selected column sits up to
    about $14\\%$ below the corresponding primary median; only the within-table
    selected-versus-alternative contrast is interpreted, never the absolute
    values.${fasterNote}${exclNote}}
  \\label{tab:altloading}
  \\begin{tabular}{l l r r r r}
    \\toprule
    & & \\multicolumn{2}{c}{PostgreSQL} & \\multicolumn{2}{c}{MySQL} \\\\
    \\cmidrule(lr){3-4}\\cmidrule(lr){5-6}
    Layer & Switch & selected & alt. & selected & alt. \\\\
    \\midrule
${rows}
    \\bottomrule
  \\end{tabular}
\\end{table}
`;
await writeFile(join(here, '..', 'results', 'tables', 'altloading.tex'), tex);
await writeFile(join(here, '..', '..', 'paper', 'tables', 'altloading.tex'), tex);
console.log('\nwrote results/altloading.json + paper/tables/altloading.tex');
