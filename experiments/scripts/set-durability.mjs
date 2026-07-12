// Switch both engines between durability regimes (revision E3 / review 6.18-6.19).
//   node scripts/set-durability.mjs default   (fsync on, flush per commit) -- PRIMARY
//   node scripts/set-durability.mjs relaxed   (the old mechanism-isolation config)
import pg from 'pg';
import mysql from 'mysql2/promise';
import { config } from '../src/config.mjs';

const mode = process.argv[2];
if (!['default', 'relaxed'].includes(mode)) { console.error('usage: set-durability.mjs default|relaxed'); process.exit(1); }

const c = new pg.Client(config.postgres); await c.connect();
for (const [k, v] of mode === 'default'
  ? [['fsync', 'on'], ['synchronous_commit', 'on'], ['full_page_writes', 'on']]
  : [['fsync', 'off'], ['synchronous_commit', 'off'], ['full_page_writes', 'off']]) {
  await c.query(`ALTER SYSTEM SET ${k}='${v}'`);
}
await c.query('SELECT pg_reload_conf()');
const { rows } = await c.query("SELECT name, setting FROM pg_settings WHERE name IN ('fsync','synchronous_commit','full_page_writes')");
console.log('PG:', rows.map((r) => `${r.name}=${r.setting}`).join(' '));
await c.end();

const m = await mysql.createConnection({ socketPath: '/tmp/mysql-bench.sock', user: 'root' });
await m.query(`SET GLOBAL innodb_flush_log_at_trx_commit=${mode === 'default' ? 1 : 0}`);
const [r2] = await m.query("SHOW VARIABLES LIKE 'innodb_flush_log_at_trx_commit'");
console.log('MySQL:', r2.map((x) => `${x.Variable_name}=${x.Value}`).join(' '));
await m.end();
console.log(`durability: ${mode}`);
