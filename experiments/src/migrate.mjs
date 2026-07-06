// Create the schema on the selected engine (ENGINE=postgres|mysql) using the
// native driver only — deliberately independent of any adapter under test.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { config } from './config.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const engine = config.engine;

async function migratePostgres() {
  const { default: pg } = await import('pg');
  const sql = await readFile(join(here, '..', 'schema', 'postgres.sql'), 'utf8');
  const client = new pg.Client(config.postgres);
  await client.connect();
  await client.query(sql);
  await client.end();
}

async function migrateMysql() {
  const { default: mysql } = await import('mysql2/promise');
  const sql = await readFile(join(here, '..', 'schema', 'mysql.sql'), 'utf8');
  const conn = await mysql.createConnection({ ...config.mysql, multipleStatements: true });
  await conn.query(sql);
  await conn.end();
}

await (engine === 'postgres' ? migratePostgres() : migrateMysql());
console.log(`[migrate] schema created on ${engine}`);
