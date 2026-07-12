// Same-SQL control EVIDENCE (revision E1.7 / review 6.2): for EVERY layer on BOTH
// engines, capture from server-side logs the exact statements the layer emits for
// the control's two queries and the wire PROTOCOL it used (prepared/extended vs
// simple/text), then record the engine's EXPLAIN ANALYZE plan for those statements.
// Establishes "same SQL, same plan, protocol disclosed" instead of asserting it.
// PG: log_statement=all -> pg.log delta ('execute' = extended protocol).
// MySQL: general_log=TABLE -> mysql.general_log (command_type 'Execute' vs 'Query').
// Run OFF-measurement only. Writes results/sameplan-evidence.json + .md.
import { writeFile, stat, open } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import pg from 'pg';
import mysql from 'mysql2/promise';
import { config, ADAPTERS } from '../src/config.mjs';
import { THREAD_Q1, THREAD_Q2 } from '../src/adapters/_threadraw.mjs';
import { execSync, spawn } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';

const PGLOG = `${process.env.HOME}/.local/share/express-db-bench/pg.log`;
const PROBE = 50000;

async function pgTail(offset) {
  const { size } = await stat(PGLOG);
  if (size <= offset) return { text: '', size };
  const fh = await open(PGLOG, 'r');
  const buf = Buffer.alloc(size - offset);
  await fh.read(buf, 0, size - offset, offset);
  await fh.close();
  return { text: buf.toString('utf8'), size };
}
const pgStmts = (text) => {
  const out = [];
  for (const line of text.split('\n')) {
    const m = line.match(/LOG:\s+(execute [^:]*|statement):\s+(.*)$/);
    if (m) { out.push({ protocol: m[1].startsWith('execute') ? 'extended/prepared' : 'simple', sql: m[2] }); continue; }
    // multi-line statements continue on indented lines (no log-line prefix)
    if (out.length && /^[\t ]/.test(line) && !/\b(LOG|DETAIL|ERROR|STATEMENT|HINT):/.test(line)) out[out.length - 1].sql += '\n' + line;
  }
  return out.map((s) => ({ ...s, sql: s.sql.trim() }))
    .filter((s) => !/^(EXPLAIN|SET|SHOW|BEGIN|COMMIT|ROLLBACK|DEALLOCATE|DISCARD|ALTER SYSTEM|SELECT pg_reload_conf)/i.test(s.sql));
};

const out = { generated: new Date().toISOString(), engines: {} };

for (const engine of ['postgres', 'mysql']) {
  const admin = engine === 'postgres'
    ? new pg.Client(config.postgres)
    : await mysql.createConnection({ socketPath: '/tmp/mysql-bench.sock', user: 'root', database: 'bench' });
  if (engine === 'postgres') { await admin.connect(); await admin.query("ALTER SYSTEM SET log_statement='all'"); await admin.query('SELECT pg_reload_conf()'); }
  else { await admin.query("SET GLOBAL log_output='TABLE'"); await admin.query("SET GLOBAL general_log='ON'"); await admin.query('TRUNCATE mysql.general_log'); }
  await sleep(300);

  const layers = {};
  try {
    for (const name of Object.keys(ADAPTERS)) {
      if (!ADAPTERS[name].engines.includes(engine)) continue;
      if (name === 'prisma') execSync(`npx prisma generate --schema=prisma/schema.${engine}.prisma`, { stdio: 'ignore' });
      try {
        // probe in a CHILD process (fresh module graph per engine/layer). The child
        // warms the connection and the statement cache, then TOUCHES a marker file;
        // the parent snapshots the log position at the marker, so connection
        // handshake and warm-up statements are excluded; the child then issues the
        // measured control call.
        const marker = new URL(`../results/.evidence-marker-${engine}-${name}`, import.meta.url).pathname;
        rmSync(marker, { force: true });
        const probeSrc = `
          import { writeFileSync } from 'node:fs';
          import { config } from './src/config.mjs';
          const { default: create } = await import('./src/adapters/${name}.mjs');
          const db = await create({ engine: '${engine}', config });
          await db.getThreadRaw(${PROBE});
          writeFileSync(${JSON.stringify(marker)}, '1');
          await new Promise((r) => setTimeout(r, 700));
          await db.getThreadRaw(${PROBE});
          await db.close();
        `;
        const child = spawn('node', ['--input-type=module'], {
          cwd: new URL('..', import.meta.url).pathname,
          env: { ...process.env, TZ: 'UTC' }, stdio: ['pipe', 'ignore', 'ignore'],
        });
        child.stdin.end(probeSrc);
        // wait for the warm-up marker, then snapshot
        for (let w = 0; w < 100 && !existsSync(marker); w++) await sleep(100);
        if (!existsSync(marker)) throw new Error('probe child never reached marker');
        let before = 0;
        if (engine === 'postgres') before = (await stat(PGLOG)).size;
        else await admin.query('TRUNCATE mysql.general_log');
        await new Promise((res, rej) => { child.on('exit', (c) => (c === 0 ? res() : rej(new Error('probe exit ' + c)))); });
        rmSync(marker, { force: true });
        await sleep(250);
        if (engine === 'postgres') {
          const { text } = await pgTail(before);
          layers[name] = pgStmts(text);
        } else {
          const [rows] = await admin.query(
            "SELECT command_type, CONVERT(argument USING utf8mb4) sql_text FROM mysql.general_log WHERE command_type IN ('Query','Execute','Prepare') ORDER BY event_time, thread_id");
          layers[name] = rows
            .map((r) => ({ protocol: r.command_type === 'Query' ? 'simple/text' : `binary/${r.command_type.toLowerCase()}`, sql: String(r.sql_text).trim() }))
            .filter((s) => /SELECT/i.test(s.sql) && !/general_log|EXPLAIN/i.test(s.sql))
            .filter((s) => s.protocol !== 'binary/prepare');
        }
        // the child issues the control twice (warm + captured); dedupe identical stmts
        const seen = new Set();
        layers[name] = layers[name].filter((x) => { const k = x.protocol + '|' + x.sql.replace(/\s+/g, ' '); if (seen.has(k)) return false; seen.add(k); return true; });
        console.log(`  ${engine}/${name}: ${layers[name].length} stmts, protocol ${[...new Set(layers[name].map((s) => s.protocol))].join('+')}`);
      } catch (e) { layers[name] = { error: e.message }; console.log(`  ${engine}/${name}: ERROR ${e.message.slice(0, 60)}`); }
    }

    // engine plans for the control statements (literal-inlined)
    const q1 = THREAD_Q1(String(PROBE)), q2 = THREAD_Q2(String(PROBE));
    const plans = {};
    if (engine === 'postgres') {
      for (const [k, q] of [['q1', q1], ['q2', q2]]) {
        const { rows } = await admin.query(`EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) ${q}`);
        plans[k] = rows.map((r) => r['QUERY PLAN']);
      }
    } else {
      for (const [k, q] of [['q1', q1], ['q2', q2]]) {
        const [rows] = await admin.query(`EXPLAIN ANALYZE ${q}`);
        plans[k] = rows.map((r) => Object.values(r)[0]);
      }
    }
    out.engines[engine] = { layers, plans };
  } finally {
    if (engine === 'postgres') { await admin.query("ALTER SYSTEM SET log_statement='none'"); await admin.query('SELECT pg_reload_conf()'); await admin.end(); }
    else { await admin.query("SET GLOBAL general_log='OFF'"); await admin.query('TRUNCATE mysql.general_log'); await admin.end(); }
  }
}

// cross-layer SQL identity check (whitespace-normalized)
// placeholder ($1 / ?) and the inlined probe literal (simple protocol clients
// interpolate parameters client-side) normalize to the same token P
const normSql = (s) => s.replace(/\s+/g, ' ')
  .replace(/\$\d+|\?/g, 'P')
  .replace(new RegExp(`(=\\s*)(?:'${PROBE}'|${PROBE})\\b`, 'g'), '$1P')
  .trim().toLowerCase();
for (const engine of Object.keys(out.engines)) {
  const L = out.engines[engine].layers;
  const ref = Object.values(L).find((v) => Array.isArray(v) && v.length);
  const refSet = ref.map((s) => normSql(s.sql)).sort().join('|');
  const mismatch = Object.entries(L).filter(([, v]) => Array.isArray(v) && v.map((s) => normSql(s.sql)).sort().join('|') !== refSet).map(([k]) => k);
  out.engines[engine].sqlIdentical = mismatch.length === 0;
  out.engines[engine].mismatch = mismatch;
  console.log(`${engine}: same-SQL identity across layers: ${mismatch.length === 0 ? 'YES' : 'NO -> ' + mismatch.join(',')}`);
}

await writeFile(new URL('../results/sameplan-evidence.json', import.meta.url), JSON.stringify(out, null, 2));
const md = ['# Same-SQL control: emitted statements, protocols, and engine plans\n'];
for (const [engine, e] of Object.entries(out.engines)) {
  md.push(`\n## ${engine}\n\nSQL identical across layers: **${e.sqlIdentical}**\n`);
  for (const [layer, stmts] of Object.entries(e.layers)) {
    if (!Array.isArray(stmts)) { md.push(`### ${layer}\nERROR: ${stmts.error}\n`); continue; }
    md.push(`### ${layer} — protocol: ${[...new Set(stmts.map((s) => s.protocol))].join(', ')}\n`);
    stmts.forEach((s, i) => md.push(`\n\`\`\`sql\n-- [${s.protocol}]\n${s.sql}\n\`\`\``));
  }
  md.push(`\n### EXPLAIN ANALYZE (q1)\n\`\`\`\n${e.plans.q1.join('\n')}\n\`\`\``);
  md.push(`\n### EXPLAIN ANALYZE (q2)\n\`\`\`\n${e.plans.q2.join('\n')}\n\`\`\`\n`);
}
await writeFile(new URL('../results/sameplan-evidence.md', import.meta.url), md.join('\n'));
console.log('wrote results/sameplan-evidence.{json,md}');
