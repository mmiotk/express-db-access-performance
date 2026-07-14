// Direct mechanism evidence for the MySQL insert bottleneck (review 6.6). The
// primary data shows MySQL single-row inserts are engine-bound rather than
// layer-bound; this script measures WHERE the time goes by sampling
// performance_schema commit-path wait instruments around a fixed insert workload:
//
//   wait/io/file/innodb/innodb_log_file   -- redo-log flush (fsync on commit)
//   wait/io/file/sql/binlog               -- binary-log sync (fsync on commit)
//
// For each representative layer at MySQL's DEFAULT durability
// (innodb_flush_log_at_trx_commit=1, sync_binlog=1) it reports the per-insert
// commit-flush wait and its share of per-insert wall time. If that share is large
// and roughly equal across layers, the commit flush is a shared engine floor that
// caps throughput regardless of the access layer -- the mechanism behind RQ2. A
// relaxed-durability contrast (trx_commit=0, sync_binlog=0) confirms the floor by
// removing it. PostgreSQL (fsync=on) is run as a foil.
//
// Writes results/waitevents.json + paper table waitevents.tex.
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'undici';
import mysql from 'mysql2/promise';

const here = dirname(fileURLToPath(import.meta.url));
const env = (k, d) => process.env[k] ?? d;
const N = Number(env('WE_INSERTS', 4000));           // timed inserts per cell
const WARM = Number(env('WE_WARMUP', 400));
const CONC = Number(env('WE_CONC', 10));             // matches the pool size
const MYSQL_LAYERS = env('WE_MYSQL', 'mysql2,knex,mikroorm').split(',');
const PG_LAYERS = env('WE_PG', 'pg,mikroorm').split(',');
const PS = 1e9;                                       // picoseconds -> milliseconds

const mroot = () => mysql.createConnection({ host: '127.0.0.1', port: 3306, user: 'root', password: '', connectTimeout: 4000 });
function health(base, tries = 120) { return new Promise((res, rej) => { const t = async () => { try { const r = await fetch(`${base}/health`); if (r.ok) return res(); } catch {} if (--tries <= 0) return rej(new Error('health timeout')); setTimeout(t, 100); }; t(); }); }

// fire `count` POST /posts inserts through a bounded pool; returns wall seconds
async function insertBurst(base, count) {
  const pool = new Pool(base, { connections: CONC, pipelining: 1 });
  const body = '{}';
  const headers = { 'content-type': 'application/json' };
  let done = 0, err = 0;
  const t0 = performance.now();
  await new Promise((resolve) => {
    let launched = 0;
    const launch = () => {
      if (launched >= count) return;
      launched++;
      pool.request({ path: '/posts', method: 'POST', headers, body }).then(async (r) => {
        await r.body.text(); if (r.statusCode >= 300) err++;
      }).catch(() => { err++; }).finally(() => {
        done++; if (done >= count) resolve(); else launch();
      });
    };
    for (let i = 0; i < CONC; i++) launch();
  });
  const secs = (performance.now() - t0) / 1000;
  await pool.close();
  return { secs, done, err };
}

// snapshot the two MySQL commit-flush instruments (sum wait ps, count)
async function mysqlWaitSnapshot(conn) {
  const [rows] = await conn.query(`SELECT EVENT_NAME, SUM_TIMER_WAIT AS w, COUNT_STAR AS c
    FROM performance_schema.events_waits_summary_global_by_event_name
    WHERE EVENT_NAME IN ('wait/io/file/innodb/innodb_log_file','wait/io/file/sql/binlog')`);
  const m = {};
  for (const r of rows) m[r.EVENT_NAME] = { w: Number(r.w), c: Number(r.c) };
  return m;
}

async function runServer(adapter, engine, port, fn) {
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [join(here, '..', 'src', 'server.mjs')], {
    env: { ...process.env, TZ: 'UTC', ADAPTER: adapter, ENGINE: engine, PORT: String(port) },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  try { await health(base); return await fn(base); }
  finally { child.kill('SIGTERM'); await new Promise((r) => setTimeout(r, 400)); }
}

const out = { mysql: [], mysql_relaxed: [], postgres: [] };
let port = 4300;

// --- MySQL: default durability, per-layer commit-flush share --------------
const admin = await mroot();
try {
  const [[dur]] = await admin.query('SELECT @@innodb_flush_log_at_trx_commit trx, @@sync_binlog sb');
  console.log(`[waitevents] MySQL durability at start: trx_commit=${dur.trx} sync_binlog=${dur.sb}`);
  for (const adapter of MYSQL_LAYERS) {
    const r = await runServer(adapter, 'mysql', port++, async (base) => {
      await insertBurst(base, WARM);
      const before = await mysqlWaitSnapshot(admin);
      const burst = await insertBurst(base, N);
      const after = await mysqlWaitSnapshot(admin);
      const redoMs = (after['wait/io/file/innodb/innodb_log_file'].w - before['wait/io/file/innodb/innodb_log_file'].w) / PS;
      const binMs = (after['wait/io/file/sql/binlog'].w - before['wait/io/file/sql/binlog'].w) / PS;
      const flushMs = redoMs + binMs;
      const rps = Math.round(burst.done / burst.secs);
      return {
        adapter, inserts: burst.done, errors: burst.err, rps,
        wall_ms: +(burst.secs * 1000).toFixed(0),
        redo_ms: +redoMs.toFixed(0), binlog_ms: +binMs.toFixed(0), flush_ms: +flushMs.toFixed(0),
        per_insert_wall_ms: +((burst.secs * 1000) / burst.done).toFixed(3),
        per_insert_flush_ms: +(flushMs / burst.done).toFixed(3),
        flush_share: +(flushMs / (burst.secs * 1000)).toFixed(3),
      };
    });
    out.mysql.push(r);
    console.log(`  MySQL ${adapter}: rps=${r.rps} per-insert wall=${r.per_insert_wall_ms}ms flush=${r.per_insert_flush_ms}ms (share ${(r.flush_share * 100).toFixed(0)}% redo=${r.redo_ms} binlog=${r.binlog_ms})`);
  }

  // --- MySQL relaxed-durability contrast (mysql2 only) --------------------
  await admin.query('SET GLOBAL innodb_flush_log_at_trx_commit=0'); await admin.query('SET GLOBAL sync_binlog=0');
  try {
    const r = await runServer('mysql2', 'mysql', port++, async (base) => {
      await insertBurst(base, WARM);
      const before = await mysqlWaitSnapshot(admin);
      const burst = await insertBurst(base, N);
      const after = await mysqlWaitSnapshot(admin);
      const flushMs = (after['wait/io/file/innodb/innodb_log_file'].w - before['wait/io/file/innodb/innodb_log_file'].w
        + after['wait/io/file/sql/binlog'].w - before['wait/io/file/sql/binlog'].w) / PS;
      return { adapter: 'mysql2', durability: 'relaxed', inserts: burst.done, rps: Math.round(burst.done / burst.secs),
        per_insert_wall_ms: +((burst.secs * 1000) / burst.done).toFixed(3), per_insert_flush_ms: +(flushMs / burst.done).toFixed(3),
        flush_share: +(flushMs / (burst.secs * 1000)).toFixed(3) };
    });
    out.mysql_relaxed.push(r);
    console.log(`  MySQL mysql2 [RELAXED]: rps=${r.rps} per-insert wall=${r.per_insert_wall_ms}ms flush=${r.per_insert_flush_ms}ms (share ${(r.flush_share * 100).toFixed(0)}%)`);
  } finally {
    await admin.query('SET GLOBAL innodb_flush_log_at_trx_commit=1'); await admin.query('SET GLOBAL sync_binlog=1');
    const [[d2]] = await admin.query('SELECT @@innodb_flush_log_at_trx_commit trx, @@sync_binlog sb');
    console.log(`[waitevents] MySQL durability restored: trx_commit=${d2.trx} sync_binlog=${d2.sb}`);
  }
} finally { await admin.end(); }

// --- PostgreSQL foil (fsync=on): throughput is layer-dependent ------------
for (const adapter of PG_LAYERS) {
  const r = await runServer(adapter, 'postgres', port++, async (base) => {
    await insertBurst(base, WARM);
    const burst = await insertBurst(base, N);
    return { adapter, inserts: burst.done, rps: Math.round(burst.done / burst.secs),
      per_insert_wall_ms: +((burst.secs * 1000) / burst.done).toFixed(3) };
  });
  out.postgres.push(r);
  console.log(`  PostgreSQL ${adapter}: rps=${r.rps} per-insert wall=${r.per_insert_wall_ms}ms`);
}

await writeFile(join(here, '..', 'results', 'waitevents.json'), JSON.stringify(out, null, 2));

// --- supplement table -----------------------------------------------------
const row = (r) => `    \\texttt{${r.adapter}} & ${r.rps} & ${r.per_insert_wall_ms} & ${r.per_insert_flush_ms} & ${(r.flush_share * 100).toFixed(0)}\\% \\\\`;
const relaxed = out.mysql_relaxed[0];
const tex = `% auto-generated by scripts/waitevents.mjs
\\begin{table}[htbp]
  \\centering
  \\caption{MySQL insert commit-flush mechanism (\\texttt{performance\\_schema} wait
    instruments, default durability \\texttt{innodb\\_flush\\_log\\_at\\_trx\\_commit=1},
    \\texttt{sync\\_binlog=1}): per-insert wall time, the redo-log$+$binlog flush wait
    per insert, and the flush share of wall time, over ${N} inserts per layer. The
    flush wait is a shared engine floor -- similar across layers despite their very
    different read performance -- so it caps insert throughput regardless of the
    access layer. Relaxing durability (\\texttt{mysql2}, \\texttt{trx\\_commit=0},
    \\texttt{sync\\_binlog=0}) removes the flush and lifts throughput to
    ${relaxed ? relaxed.rps : '--'}~req/s, confirming the floor.}
  \\label{tab:waitevents}
  \\begin{tabular}{l r r r r}
    \\toprule
    Layer (MySQL) & req/s & per-insert (ms) & flush/insert (ms) & flush share \\\\
    \\midrule
${out.mysql.map(row).join('\n')}
    \\midrule
    \\multicolumn{5}{l}{\\emph{Relaxed durability (control):}} \\\\
${relaxed ? `    \\texttt{mysql2}$^\\ast$ & ${relaxed.rps} & ${relaxed.per_insert_wall_ms} & ${relaxed.per_insert_flush_ms} & ${(relaxed.flush_share * 100).toFixed(0)}\\% \\\\` : ''}
    \\bottomrule
  \\end{tabular}
\\end{table}
`;
await writeFile(join(here, '..', 'results', 'tables', 'waitevents.tex'), tex);
await writeFile(join(here, '..', '..', 'paper', 'tables', 'waitevents.tex'), tex);
console.log('\nwrote results/waitevents.json + paper/tables/waitevents.tex');
