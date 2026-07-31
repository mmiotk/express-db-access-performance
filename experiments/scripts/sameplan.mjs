// Common-SQL deep-fetch sensitivity (adversarial-review surface 4). Measures every
// policy-selected layer
// on /posts/:id/thread-raw — the IDENTICAL two-statement plan + identical JS mapping
// through each layer's raw facility — under the primary timing protocol (50 connections,
// 15s warm-up, 12s run), and contrasts it with the policy-selected deep fetch from
// results/current-primary.json. The per-layer ratio compares the policy-selected documented path with
// a compound raw-path standardization; it does not attribute the difference to eager
// loading, hydration, or any other single mechanism. Also measures the
// no-DB /baseline endpoint once per engine (Express + JSON serialization floor).
// Sanity: before measuring, asserts exact canonical agreement between /thread and /thread-raw.
import { spawn, execSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import autocannon from 'autocannon';
import { ADAPTERS, config as cfg } from '../src/config.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const SEED_POSTS = cfg.seed.posts;
function mulberry32(a) {
  return function random() {
    a |= 0;
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rnd = (random, n) => 1 + Math.floor(random() * n);
const CONNECTIONS = 50, DURATION = 12, WARMUP = 15, PROBE_ID = 50000;
const SP_REPS = Number(process.env.SP_REPS ?? 10);

function health(base, tries = 100) { return new Promise((res, rej) => { const t = async () => { try { const r = await fetch(`${base}/health`); if (r.ok) return res(); } catch {} if (--tries <= 0) return rej(new Error('health timeout')); setTimeout(t, 100); }; t(); }); }
async function waitIdle(base, timeoutMs = 30000) { const deadline = Date.now() + timeoutMs; for (;;) { const s = await (await fetch(`${base}/stats`)).json(); if (s.active_handlers === 0) return; if (Date.now() > deadline) throw new Error('handler-drain timeout'); await new Promise((r) => setTimeout(r, 25)); } }
function run(base, path, dur, dynamic = true, seed = 20260727) {
  const random = mulberry32(seed);
  return new Promise((res, rej) => autocannon({
    url: base, connections: CONNECTIONS, duration: dur,
    requests: [dynamic ? { setupRequest: (r) => ({ ...r, method: "GET", path: path(random) }) } : { method: "GET", path }],
  }, (e, r) => e ? rej(e) : res(r)));
}
function assertSuccessful(result, label) {
  const errors = Number(result.errors ?? 0);
  const timeouts = Number(result.timeouts ?? 0);
  const non2xx = Number(result.non2xx ?? ((result["4xx"] ?? 0) + (result["5xx"] ?? 0)));
  if (errors || timeouts || non2xx) {
    throw new Error(`${label}: request failures ${errors}/${timeouts}/${non2xx}`);
  }
}

// Exact canonical-response agreement between policy-selected and same-SQL responses.
function agree(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

const rawFile = process.env.RAW_FILE || 'current-primary.json';
const outFile = process.env.SP_OUT || 'sameplan-corrected.json';
const raw = JSON.parse(await readFile(join(here, '..', 'results', rawFile), 'utf8'));
const idio = (a, e) => raw.find((r) => r.adapter === a && r.endpoint === 'deep_fetch' && r.engine === e)?.rps;
// Derived, not hardcoded: the caption must state the primary campaign's own repetition
// count, because the selected and same-SQL columns come from different campaigns.
const PRIMARY_REPS = raw.find((r) => r.endpoint === 'deep_fetch')?.rps_samples?.length ?? '25';

const POLICY_ADAPTERS = ["pg", "mysql2", "knex", "drizzle", "prisma", "sequelize", "typeorm", "objection", "mikroorm"];
const wantAdapters = (process.env.ADAPTERS ?? POLICY_ADAPTERS.join(",")).split(",").map((s) => s.trim());
let out = { cells: [], baseline: {} };
const failures = [];
if (process.env.MERGE === '1' || process.env.TABLE_ONLY === '1') {
  try { out = JSON.parse(await readFile(join(here, '..', 'results', outFile), 'utf8')); } catch {}
}
let port = 3600;
// TABLE_ONLY=1: skip measurement, refresh the policy-selected reference from the
// CURRENT primary dataset and rebuild the table (used after adopting a new run)
if (process.env.TABLE_ONLY === '1') {
  const medArr = (a) => { const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); };
  for (const c of out.cells) {
    c.selected = idio(c.adapter, c.engine);
    if (Array.isArray(c.rps_samples) && c.rps_samples.length) c.rps = medArr(c.rps_samples);
  }
} else for (const engine of ['postgres', 'mysql']) {
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
        fetch(`${base}/posts/${PROBE_ID}/thread`).then(async (r) => {
          if (!r.ok) throw new Error(`selected probe returned ${r.status}`);
          return r.json();
        }),
        fetch(`${base}/posts/${PROBE_ID}/thread-raw`).then(async (r) => {
          if (!r.ok) throw new Error(`raw probe returned ${r.status}`);
          return r.json();
        }),
      ]);
      const ok = agree(ti, tr);
      if (!ok) throw new Error("selected and same-SQL probes disagree");
      const warm = await run(base, (random) => `/posts/${rnd(random, SEED_POSTS)}/thread-raw`, WARMUP);
      await waitIdle(base); assertSuccessful(warm, "warm-up");
      const samples = [], p99s = [];
      for (let i = 0; i < SP_REPS; i++) {
        const r = await run(base, (random) => `/posts/${rnd(random, SEED_POSTS)}/thread-raw`, DURATION, true, 20260728 + i);
        await waitIdle(base); assertSuccessful(r, `repeat ${i + 1}`);
        samples.push(Math.round(r.requests.average)); p99s.push(r.latency.p99);
      }
      const med = (a) => { const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); };
      const rps = med(samples);
      out.cells.push({ adapter, engine, rps, p99: med(p99s), selected: idio(adapter, engine), agree: ok, rps_samples: samples, reps: SP_REPS });
      console.log(`  ${adapter}/${engine}: same-SQL ${rps} req/s (n=${SP_REPS})  selected ${idio(adapter, engine)}  agree=${ok}`);
      if (adapter === 'pg' || adapter === 'mysql2') { // baseline once per engine (layer-independent)
        const baselineWarm = await run(base, '/baseline', WARMUP, false); await waitIdle(base); assertSuccessful(baselineWarm, "baseline warm-up");
        const b = await run(base, '/baseline', DURATION, false); await waitIdle(base); assertSuccessful(b, "baseline measurement");
        out.baseline[engine] = Math.round(b.requests.average);
        console.log(`  [baseline/${engine}]: ${out.baseline[engine]} req/s (Express + JSON floor)`);
      }
    } catch (e) {
      failures.push(`${adapter}/${engine}: ${e.message}`);
      console.error(`  FAILED ${adapter}/${engine}: ${e.message}`);
    }
    finally { if (child.exitCode === null) child.kill('SIGTERM'); await new Promise((resolve) => { if (child.exitCode !== null) return resolve(); const timeout = setTimeout(resolve, 5000); child.once('exit', () => { clearTimeout(timeout); resolve(); }); }); }
  }
}
const expected = POLICY_ADAPTERS.reduce((n, adapter) =>
  n + ADAPTERS[adapter].engines.filter((engine) => ["postgres", "mysql"].includes(engine)).length, 0);
if (failures.length || out.cells.length !== expected
    || out.cells.some((cell) => !cell.agree || !Array.isArray(cell.rps_samples)
      || cell.rps_samples.length !== cell.reps || cell.reps < 2)) {
  throw new Error(`same-SQL campaign rejected (${out.cells.length}/${expected} cells):\n- ${failures.join("\n- ")}`);
}

await writeFile(join(here, '..', 'results', outFile), JSON.stringify(out, null, 2));

// ---- paper table: policy-selected vs same-SQL per engine ------------------------------
const ORDER = POLICY_ADAPTERS;
const get = (a, e) => out.cells.find((c) => c.adapter === a && c.engine === e);
const cellPair = (a, e) => { const c = get(a, e); const selected = c?.selected ?? c?.idiomatic; return c ? selected + " & " + c.rps + " & " + (selected / c.rps).toFixed(2) : "-- & -- & --"; };
const rows = ORDER.filter((a) => get(a, 'postgres') || get(a, 'mysql'))
  .map((a) => `    \\texttt{${a}} & ${cellPair(a, 'postgres')} & ${cellPair(a, 'mysql')} \\\\`).join('\n');
const spread = (e) => { const cs = out.cells.filter((c) => c.engine === e && POLICY_ADAPTERS.includes(c.adapter)); const nat = get(e === 'postgres' ? 'pg' : 'mysql2', e); const min = Math.min(...cs.map((c) => c.rps)); return (nat.rps / min).toFixed(2); };
const tex = `% auto-generated by scripts/sameplan.mjs — policy-selected documented vs same-SQL deep fetch
\\begin{table}[htbp]
  \\centering
  \\caption{Common-SQL raw-path sensitivity --- the residual same-SQL spread on the deep fetch:
    throughput (req/s) of the policy-selected documented
    deep fetch versus the \\emph{same-SQL} contrast, in which every layer executes the
    identical two-statement SQL with identical row mapping through its raw-SQL
    facility. The two columns come from different campaigns: the selected column is the
    median of the ${PRIMARY_REPS}-run primary campaign, the same-SQL column the median of a
    separate ${SP_REPS}-run campaign. The per-layer ratios are therefore non-contemporaneous
    descriptive contrasts rather than paired within-campaign estimates, and carry no
    interval. The ratio (selected $\\div$ same-SQL) measures the gap between each
    layer's policy-selected documented relational-fetch path and the common raw-SQL path, a composite
    of query strategy, query count, protocol, the raw versus ORM API, and result
    marshalling and hydration changed together; the residual native-relative same-SQL
    spread ($${spread('postgres')}\\times$ on PostgreSQL,
    $${spread('mysql')}\\times$ on MySQL) is a common-SQL raw-path contrast on that compound difference, not a
    bound, and isolates no single factor.}
  \\label{tab:sameplan}
  \\begin{adjustbox}{max width=\\textwidth}
  \\begin{tabular}{l r r r r r r}
    \\toprule
    & \\multicolumn{3}{c}{PostgreSQL} & \\multicolumn{3}{c}{MySQL} \\\\
    \\cmidrule(lr){2-4}\\cmidrule(lr){5-7}
    Layer & selected & same-SQL & ratio & selected & same-SQL & ratio \\\\
    \\midrule
${rows}
    \\bottomrule
  \\end{tabular}
  \\end{adjustbox}
\\end{table}
`;
await writeFile(join(here, '..', 'results', 'tables', 'sameplan.tex'), tex);
await writeFile(join(here, '..', '..', 'paper', 'tables', 'sameplan.tex'), tex);
console.log(`\nwrote results/${outFile} + paper/tables/sameplan.tex (baseline: PG ${out.baseline.postgres}, MySQL ${out.baseline.mysql} req/s)`);
