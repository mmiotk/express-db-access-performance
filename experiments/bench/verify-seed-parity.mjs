// Cross-engine parity check for the deterministic fan-out fixture.
// Database-generated timestamps are intentionally excluded; every declared
// seed value and generated identifier used in the response is compared.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import pg from 'pg';
import mysql from 'mysql2/promise';
import { config } from '../src/config.mjs';
import { CAMPAIGN_FANOUT } from '../src/seed-spec.mjs';

const first = CAMPAIGN_FANOUT.postIds[0];
const last = CAMPAIGN_FANOUT.postIds.at(-1);
const query = `
  SELECT p.id, p.author_id, p.title, p.body, p.views,
         c.id AS comment_id, c.author_id AS comment_author_id,
         c.body AS comment_body
  FROM posts p
  LEFT JOIN comments c ON c.post_id = p.id
  WHERE p.id >= ? AND p.id <= ?
  ORDER BY p.id, c.id`;
const normalize = (rows) => rows.map((row) => Object.fromEntries(
  Object.entries(row).map(([key, value]) => [key, value == null ? null : String(value)]),
));
const digest = (rows) => createHash('sha256')
  .update(JSON.stringify(rows)).digest('hex');

const postgres = new pg.Client(config.postgres);
const mysqlConn = await mysql.createConnection(config.mysql);
await postgres.connect();
try {
  const pgRows = normalize((await postgres.query(
    query.replaceAll('?', (_, offset) => offset === query.indexOf('?') ? '$1' : '$2'),
    [first, last],
  )).rows);
  const [mysqlRowsRaw] = await mysqlConn.query(query, [first, last]);
  const mysqlRows = normalize(mysqlRowsRaw);
  assert.deepEqual(mysqlRows, pgRows);
  const sha256 = digest(pgRows);
  const record = {
    scope: 'fan-out posts/comments; database-generated timestamps excluded',
    rows: pgRows.length,
    sha256,
    status: 'IDENTICAL ACROSS ENGINES',
  };
  writeFileSync(
    new URL('../seed-parity.json', import.meta.url),
    JSON.stringify(record, null, 2) + '\n',
  );
  console.log(JSON.stringify(record, null, 2));
} finally {
  await postgres.end();
  await mysqlConn.end();
}
