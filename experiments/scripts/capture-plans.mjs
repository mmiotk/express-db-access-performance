// P5 — capture the SQL each access layer emits, the number of round trips per
// endpoint, and EXPLAIN output, on PostgreSQL. Method: enable server-side
// `log_statement=all`, call each adapter method once (after a warm-up), and read
// the byte-delta appended to pg.log; that delta is exactly the statements that call
// issued (this captures every layer uniformly at the DB boundary, including Prisma's
// out-of-process engine). Writes emit query-counts.tex (for the paper) and
// results/query-plans.md (for the replication package). Run AFTER any benchmark, not
// during one (statement logging perturbs timing).
import { readFile, writeFile, stat, open } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { config } from '../src/config.mjs';
import pg from 'pg';

const PGLOG = `${process.env.HOME}/.local/share/express-db-bench/pg.log`;
const ADAPTERS = ['pg', 'knex', 'drizzle', 'prisma', 'sequelize', 'typeorm', 'objection', 'mikroorm'];
const SAMPLE = { post: 50000, author: 1000, before: 60000 };
const ENDPOINTS = [
  { key: 'point_read', label: 'Point read', call: (db) => db.getPost(SAMPLE.post) },
  { key: 'range_scan', label: 'Range scan', call: (db) => db.listPosts({ limit: 20, before: SAMPLE.before }) },
  { key: 'deep_fetch', label: 'Deep fetch', call: (db) => db.getThread(SAMPLE.post) },
  { key: 'aggregation', label: 'Aggregation', call: (db) => db.authorSummary(SAMPLE.author) },
  { key: 'write', label: 'Insert', call: (db) => db.createPost({ authorId: SAMPLE.author, title: 'bench', body: 'x' }) },
];

const admin = new pg.Client(config.postgres);
await admin.connect();
const setLog = async (v) => { await admin.query(`ALTER SYSTEM SET log_statement = '${v}'`); await admin.query('SELECT pg_reload_conf()'); await sleep(300); };

// read pg.log bytes from `offset` to EOF
async function readFrom(offset) {
  const { size } = await stat(PGLOG);
  if (size <= offset) return { text: '', size };
  const fh = await open(PGLOG, 'r');
  const buf = Buffer.alloc(size - offset);
  await fh.read(buf, 0, size - offset, offset);
  await fh.close();
  return { text: buf.toString('utf8'), size };
}
// extract SQL statements a call issued from a log delta
function parseStatements(text) {
  const out = [];
  for (const line of text.split('\n')) {
    const m = line.match(/LOG:\s+(?:statement|execute[^:]*):\s+(.*)$/);
    if (m) {
      const sql = m[1].trim();
      // skip our own admin/EXPLAIN noise and connection setup chatter
      if (/^(EXPLAIN|ALTER SYSTEM|SELECT pg_reload_conf|SET |SHOW |BEGIN|COMMIT|ROLLBACK|DEALLOCATE|DISCARD)/i.test(sql)) continue;
      out.push(sql);
    }
  }
  return out;
}

const counts = {};   // adapter -> endpoint -> count
const plans = [];    // markdown blocks

await setLog('all');
try {
  for (const name of ADAPTERS) {
    const { default: createAdapter } = await import(`../src/adapters/${name}.mjs`);
    let db;
    try { db = await createAdapter({ engine: 'postgres', config }); } catch (e) { console.log(`skip ${name}: ${e.message}`); continue; }
    counts[name] = {};
    const inserted = [];
    for (const ep of ENDPOINTS) {
      try {
        await ep.call(db);            // warm-up: connect pool, prepare statements
        await sleep(120);
        const before = (await stat(PGLOG)).size;
        const r = await ep.call(db);  // measured call
        if (ep.key === 'write' && r && r.id) inserted.push(r.id);
        await sleep(200);
        const { text } = await readFrom(before);
        const stmts = parseStatements(text);
        counts[name][ep.key] = stmts.length;
        if (name === 'pg' || ep.key === 'deep_fetch') {
          plans.push(`### ${name} — ${ep.label} (${stmts.length} round trip${stmts.length === 1 ? '' : 's'})\n\n` +
            stmts.map((s, i) => '```sql\n' + s + '\n```').join('\n') + '\n');
        }
      } catch (e) { counts[name][ep.key] = `err`; console.log(`  ${name}/${ep.key}: ${e.message.slice(0, 80)}`); }
    }
    if (inserted.length) await admin.query('DELETE FROM posts WHERE id = ANY($1)', [inserted]);
    try { await db.close(); } catch {}
    console.log(`${name}: ${ENDPOINTS.map((e) => e.key + '=' + counts[name][e.key]).join(' ')}`);
  }

  // EXPLAIN the native (pg) read statements with sample literals substituted
  const explainSql = {
    'Point read': `SELECT * FROM posts WHERE id = ${SAMPLE.post}`,
    'Range scan': `SELECT * FROM posts WHERE id < ${SAMPLE.before} ORDER BY id DESC LIMIT 20`,
    'Deep fetch (q1)': `SELECT p.*, a.name, a.email FROM posts p JOIN authors a ON a.id = p.author_id WHERE p.id = ${SAMPLE.post}`,
    'Deep fetch (q2)': `SELECT c.id, c.body, a.id, a.name FROM comments c JOIN authors a ON a.id = c.author_id WHERE c.post_id = ${SAMPLE.post} ORDER BY c.id`,
    'Aggregation': `SELECT (SELECT COUNT(*) FROM posts p WHERE p.author_id = a.id), (SELECT COUNT(*) FROM comments c JOIN posts p ON p.id = c.post_id WHERE p.author_id = a.id) FROM authors a WHERE a.id = ${SAMPLE.author}`,
  };
  const explains = [];
  for (const [label, sql] of Object.entries(explainSql)) {
    const { rows } = await admin.query(`EXPLAIN (COSTS OFF) ${sql}`);
    explains.push(`### EXPLAIN — ${label} (native \`pg\` SQL)\n\n\`\`\`\n${rows.map((r) => r['QUERY PLAN']).join('\n')}\n\`\`\`\n`);
  }

  // --- write query-count table for the paper ---
  const PN = ['point_read', 'range_scan', 'deep_fetch', 'aggregation', 'write'];
  const PL = ['Point read', 'Range scan', 'Deep fetch', 'Aggregation', 'Insert'];
  const body = ADAPTERS.filter((a) => counts[a]).map((a) =>
    `    \\texttt{${a}} & ${PN.map((p) => counts[a][p] ?? '--').join(' & ')} \\\\`).join('\n');
  const tex = `% auto-generated by scripts/capture-plans.mjs — round trips (DB statements) per request on PostgreSQL
\\begin{table}[htbp]
  \\centering
  \\caption{Number of SQL round trips each access layer issues per request on PostgreSQL, captured from server-side statement logging. The native drivers, Knex, and Drizzle issue a two-query deep fetch; the data-mapper ORMs' eager-loading strategies choose their own counts. Full generated SQL and \\texttt{EXPLAIN} plans are in the replication package.}
  \\label{tab:query_counts}
  \\begin{tabular}{l r r r r r}
    \\toprule
    Layer & ${PL.join(' & ')} \\\\
    \\midrule
${body}
    \\bottomrule
  \\end{tabular}
\\end{table}
`;
  await writeFile('results/tables/query_counts.tex', tex);
  await writeFile('../paper/tables/query_counts.tex', tex);

  const md = `# Generated SQL, round-trip counts, and query plans (PostgreSQL)\n\n` +
    `Captured by \`scripts/capture-plans.mjs\` via server-side \`log_statement=all\`. ` +
    `Sample parameters: post id ${SAMPLE.post}, author id ${SAMPLE.author}, cursor ${SAMPLE.before}.\n\n` +
    `## Round-trip counts per layer\n\n| Layer | ${PL.join(' | ')} |\n|---|${PL.map(() => '--').join('|')}|\n` +
    ADAPTERS.filter((a) => counts[a]).map((a) => `| ${a} | ${PN.map((p) => counts[a][p] ?? '--').join(' | ')} |`).join('\n') +
    `\n\n## Generated SQL (native \`pg\`, and every layer's deep fetch)\n\n${plans.join('\n')}\n` +
    `## Query plans (native \`pg\` statements)\n\n${explains.join('\n')}`;
  await writeFile('results/query-plans.md', md);
  console.log('\nwrote paper/tables/query_counts.tex and results/query-plans.md');
} finally {
  await setLog('none');   // always restore
  await admin.end();
  console.log('restored log_statement=none');
}
