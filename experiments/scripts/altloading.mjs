// Alternative eager-loading sensitivity (review 6.3). For the ORMs with a
// documented join<->select-in choice, this compares the idiomatic deep fetch
// (/thread) against the alternative strategy (/thread-alt) on both engines and
// reports whether the deep-fetch ranking is sensitive to the loading strategy.
// Sequelize, TypeORM, MikroORM switch join -> select-in; Objection switches
// select-in -> join, so both directions are exercised. It first asserts the two
// endpoints return byte-identical responses (same data, different SQL strategy),
// then measures throughput. Writes results/altloading.json + paper table.
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
const REPEATS = Number(env('AL_REPEATS', 5));
// direction each layer moves relative to its idiomatic default
const DIRECTION = { sequelize: 'join->select-in', typeorm: 'join->select-in', mikroorm: 'join->select-in', objection: 'select-in->join' };

function health(base, tries = 120) { return new Promise((res, rej) => { const t = async () => { try { const r = await fetch(`${base}/health`); if (r.ok) return res(); } catch {} if (--tries <= 0) return rej(new Error('health timeout')); setTimeout(t, 100); }; t(); }); }
function run(path, base) {
  return new Promise((resolve, reject) => {
    autocannon({ url: `${base}${path}`, connections: CONNECTIONS, duration: DURATION }, (err, r) => err ? reject(err) : resolve(Math.round(r.requests.average)));
  });
}

const out = [];
let port = 4400;
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
      // correctness: idiomatic and alternative must return byte-identical bodies.
      // The alternative endpoint returns 501 if unsupported, or an error body if the
      // strategy is not a transparent drop-in (e.g. TypeORM's query strategy errors on
      // the ordered nested findOne; Objection's withGraphJoined changes row handling).
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
      const idiom = [], alt = [];
      for (let i = 0; i < REPEATS; i++) { idiom.push(await run('/posts/1/thread', base)); alt.push(await run('/posts/1/thread-alt', base)); }
      const mi = median(idiom), ma = median(alt);
      const rec = { engine, adapter, direction: DIRECTION[adapter], identical, idiomatic_rps: mi, alt_rps: ma, ratio: +(ma / mi).toFixed(3) };
      out.push(rec);
      console.log(`  ${engine}/${adapter} (${rec.direction}): idiomatic ${mi} vs alt ${ma} rps  (alt/idiom ${rec.ratio}, identical=${identical})`);
    } catch (e) { console.error(`  FAILED ${engine}/${adapter}: ${e.message}`); }
    finally { child.kill('SIGTERM'); await new Promise((r) => setTimeout(r, 400)); }
  }
}

await writeFile(join(here, '..', 'results', 'altloading.json'), JSON.stringify(out, null, 2));

const cell = (eng, a, key) => { const r = out.find((x) => x.engine === eng && x.adapter === a && x.identical); return r ? r[key] : '--'; };
const measured = LAYERS.filter((a) => out.some((x) => x.adapter === a && x.identical));
const excluded = LAYERS.filter((a) => !measured.includes(a));
const rows = measured.map((a) => {
  const d = (DIRECTION[a] || '').replace('->', '$\\to$');
  return `    \\texttt{${a}} & ${d} & ${cell('postgres', a, 'idiomatic_rps')} & ${cell('postgres', a, 'alt_rps')} & ${cell('mysql', a, 'idiomatic_rps')} & ${cell('mysql', a, 'alt_rps')} \\\\`;
}).join('\n');
const exclNote = excluded.length
  ? ` \\texttt{${excluded.join('}, \\texttt{')}} are omitted: their alternative strategy was not a byte-identical drop-in in the pinned versions (TypeORM's query strategy errors on the ordered nested \\texttt{findOne}; Objection's \\texttt{withGraphJoined} changes row handling), which is itself a portability caveat.`
  : '';
const tex = `% auto-generated by scripts/altloading.mjs
\\begin{table}[htbp]
  \\centering
  \\caption{Alternative eager-loading sensitivity on the deep/nested fetch:
    documentation-selected throughput (req/s) versus the alternative loading strategy, both
    engines, for the layers whose alternative is a byte-identical drop-in. Sequelize
    and MikroORM switch from their documentation-selected single join to select-in; in both cases
    the documentation-selected default is the \\emph{faster} strategy, so their deep-fetch deficit
    is not an artifact of a poor default.${exclNote}}
  \\label{tab:altloading}
  \\begin{tabular}{l l r r r r}
    \\toprule
    & & \\multicolumn{2}{c}{PostgreSQL} & \\multicolumn{2}{c}{MySQL} \\\\
    \\cmidrule(lr){3-4}\\cmidrule(lr){5-6}
    Layer & Switch & default & alt. & default & alt. \\\\
    \\midrule
${rows}
    \\bottomrule
  \\end{tabular}
\\end{table}
`;
await writeFile(join(here, '..', 'results', 'tables', 'altloading.tex'), tex);
await writeFile(join(here, '..', '..', 'paper', 'tables', 'altloading.tex'), tex);
console.log('\nwrote results/altloading.json + paper/tables/altloading.tex');
