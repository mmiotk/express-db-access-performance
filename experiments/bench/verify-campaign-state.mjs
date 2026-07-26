// State preflight for campaigns that preserve the deterministic fan-out
// fixture and reset benchmark writes above id 300000. It prevents a polluted
// database from entering a measurement campaign.
//
//   ENGINE=postgres node bench/verify-campaign-state.mjs
//   ENGINE=mysql    node bench/verify-campaign-state.mjs

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { config } from '../src/config.mjs';
import { CAMPAIGN_FANOUT } from '../src/seed-spec.mjs';

const engine = config.engine;
const expected = {
  authors: config.seed.authors,
  posts: config.seed.posts + CAMPAIGN_FANOUT.postIds.length,
  comments: config.seed.posts * config.seed.commentsPerPost
    + CAMPAIGN_FANOUT.commentCounts.reduce((sum, n) => sum + n, 0),
  nextPostId: 300001,
};
const fanoutIds = CAMPAIGN_FANOUT.postIds.join(',');

async function normalizeState() {
  if (engine === 'postgres') {
    const pg = (await import('pg')).default;
    const client = new pg.Client(config.postgres);
    await client.connect();
    try {
      await client.query('DELETE FROM posts WHERE id > $1', [expected.nextPostId - 1]);
      await client.query("SELECT setval(pg_get_serial_sequence('posts', 'id'), $1, true)", [expected.nextPostId - 1]);
    } finally { await client.end(); }
  } else {
    const mysql = (await import('mysql2/promise')).default;
    const client = await mysql.createConnection(config.mysql);
    try {
      await client.query('DELETE FROM posts WHERE id > ?', [expected.nextPostId - 1]);
      await client.query('ALTER TABLE posts AUTO_INCREMENT = ' + expected.nextPostId);
    } finally { await client.end(); }
  }
}

async function inspectPostgres() {
  const pg = (await import('pg')).default;
  const client = new pg.Client(config.postgres);
  await client.connect();
  try {
    const one = async (sql) => (await client.query(sql)).rows[0];
    const counts = await one(
      'SELECT (SELECT COUNT(*) FROM authors)::int authors, '
      + '(SELECT COUNT(*) FROM posts)::int posts, '
      + '(SELECT COUNT(*) FROM comments)::int comments',
    );
    const stray = await one(
      `SELECT COUNT(*)::int stray FROM posts WHERE id > ${config.seed.posts} `
      + `AND id NOT IN (${fanoutIds})`,
    );
    const fanout = await client.query(
      `SELECT p.id::int id, COUNT(c.id)::int comments
         FROM posts p LEFT JOIN comments c ON c.post_id=p.id
        WHERE p.id IN (${fanoutIds})
        GROUP BY p.id ORDER BY p.id`,
    );
    const seq = await one('SELECT last_value::bigint last_value FROM posts_id_seq');
    return {
      ...counts,
      strayPosts: stray.stray,
      nextPostId: Number(seq.last_value) + 1,
      fanout: fanout.rows,
    };
  } finally {
    await client.end();
  }
}

async function inspectMysql() {
  const mysql = (await import('mysql2/promise')).default;
  const client = await mysql.createConnection(config.mysql);
  try {
    const one = async (sql) => (await client.query(sql))[0][0];
    const counts = await one(
      'SELECT (SELECT COUNT(*) FROM authors) authors, '
      + '(SELECT COUNT(*) FROM posts) posts, '
      + '(SELECT COUNT(*) FROM comments) comments',
    );
    const stray = await one(
      `SELECT COUNT(*) stray FROM posts WHERE id > ${config.seed.posts} `
      + `AND id NOT IN (${fanoutIds})`,
    );
    const [fanout] = await client.query(
      `SELECT CAST(p.id AS SIGNED) id, COUNT(c.id) comments
         FROM posts p LEFT JOIN comments c ON c.post_id=p.id
        WHERE p.id IN (${fanoutIds})
        GROUP BY p.id ORDER BY p.id`,
    );
    // MySQL 9.7.1 reports a stale information_schema AUTO_INCREMENT value after
    // explicit-id fixture insertion. Probe the actual allocator in a rolled-back
    // transaction; no row persists, and the exact allocator value is restored after the probe.
    await client.beginTransaction();
    const [probe] = await client.query(
      "INSERT INTO posts(author_id,title,body,views) VALUES (1,'__campaign_state_probe__','',0)",
    );
    await client.rollback();
    const nextPostId = Number(probe.insertId);
    await client.query('ALTER TABLE posts AUTO_INCREMENT = ' + nextPostId);
    return {
      authors: Number(counts.authors),
      posts: Number(counts.posts),
      comments: Number(counts.comments),
      strayPosts: Number(stray.stray),
      nextPostId,
      fanout: fanout.map((row) => ({ id: Number(row.id), comments: Number(row.comments) })),
    };
  } finally {
    await client.end();
  }
}

if (process.env.NORMALIZE === '1') await normalizeState();

const actual = engine === 'postgres' ? await inspectPostgres() : await inspectMysql();
const expectedFanout = CAMPAIGN_FANOUT.postIds.map((id, i) => ({
  id,
  comments: CAMPAIGN_FANOUT.commentCounts[i],
}));
const checks = {
  authors: actual.authors === expected.authors,
  posts: actual.posts === expected.posts,
  comments: actual.comments === expected.comments,
  noStrayPosts: actual.strayPosts === 0,
  writeSequence: actual.nextPostId === expected.nextPostId,
  fanout: JSON.stringify(actual.fanout) === JSON.stringify(expectedFanout),
};
const ok = Object.values(checks).every(Boolean);
const record = { expected, actual, checks, status: ok ? 'PASS' : 'FAIL' };

const out = new URL('../campaign-state.json', import.meta.url);
let engines = {};
try {
  if (existsSync(out)) engines = JSON.parse(readFileSync(out, 'utf8')).engines ?? {};
} catch {
  // Replace malformed or missing prior output.
}
engines[engine] = record;
writeFileSync(out, JSON.stringify({
  note: 'Idempotent state preflight for the base seed, fan-out fixture, and exact next write id; MySQL restores the allocator after its rolled-back probe.',
  engines,
}, null, 2) + '\n');

console.log(`${engine} campaign-state preflight: ${ok ? 'PASS' : 'FAIL'}`);
console.log(JSON.stringify(record, null, 2));
process.exit(ok ? 0 : 1);
